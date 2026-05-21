import { readFile, stat } from "fs/promises";
import path from "path";
import { parseJsonBody, safeFetch } from "../http";
import { makeTokenRecord } from "../records";
import type { TelemetryIngestionAdapter } from "../types";
import { buildReadiness, emptyResult } from "./readiness";

async function readUsageExport(filePath: string) {
  try {
    const raw = await readFile(filePath, { encoding: "utf8" });
    const data = parseJsonBody(raw);
    if (!data || typeof data !== "object") return null;
    const o = data as Record<string, unknown>;
    const input = o.input_tokens ?? o.inputTokens;
    const output = o.output_tokens ?? o.outputTokens;
    const total = o.total_tokens ?? o.totalTokens;
    const inputN = typeof input === "number" ? input : null;
    const outputN = typeof output === "number" ? output : null;
    const totalN = typeof total === "number" ? total : null;
    if (inputN == null && outputN == null && totalN == null) return null;
    return makeTokenRecord({
      tool: "anthropic_api",
      provider: "anthropic",
      sourceMethod: "export",
      contentRef: path.basename(filePath),
      inputTokens: inputN,
      outputTokens: outputN,
      totalTokens: totalN,
      note: `Anthropic usage export ${path.basename(filePath)}`,
    });
  } catch {
    return null;
  }
}

export const anthropicIngestionAdapter: TelemetryIngestionAdapter = {
  id: "anthropic_api",
  label: "Anthropic API",
  provider: "anthropic",
  primarySourceMethod: "api",
  async collect(cwd) {
    const exportPath = process.env.CCC_ANTHROPIC_USAGE_PATH?.trim();
    if (exportPath) {
      try {
        await stat(exportPath);
        const entry = await readUsageExport(path.resolve(exportPath));
        if (entry) {
          return {
            readiness: buildReadiness({
              adapterId: "anthropic_api",
              label: "Anthropic API",
              provider: "anthropic",
              ready: true,
              automated: true,
              primarySourceMethod: "export",
              status: "active",
              reason: "Anthropic usage loaded from CCC_ANTHROPIC_USAGE_PATH export.",
              tokenObservations: 1,
            }),
            tokenEntries: [entry],
            spendEntries: [],
          };
        }
      } catch {
        /* fall through */
      }
    }

    const apiKey =
      process.env.ANTHROPIC_API_KEY?.trim() ||
      process.env.CCC_ANTHROPIC_API_KEY?.trim();
    if (!apiKey) {
      return emptyResult(
        "anthropic_api",
        "Anthropic API",
        "anthropic",
        "api",
        "missing_credentials",
        "ANTHROPIC_API_KEY not set and no CCC_ANTHROPIC_USAGE_PATH export.",
      );
    }

    const end = new Date();
    const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
    const url = new URL(
      "https://api.anthropic.com/v1/organizations/usage_report/messages",
    );
    url.searchParams.set("starting_at", start.toISOString());
    url.searchParams.set("ending_at", end.toISOString());

    const res = await safeFetch(url.toString(), {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
    });

    if (res.ok) {
      const json = parseJsonBody(res.body);
      const rows = (json as { data?: unknown })?.data;
      if (Array.isArray(rows) && rows.length > 0) {
        let input = 0;
        let output = 0;
        for (const row of rows) {
          if (!row || typeof row !== "object") continue;
          const o = row as Record<string, unknown>;
          if (typeof o.input_tokens === "number") input += o.input_tokens;
          if (typeof o.output_tokens === "number") output += o.output_tokens;
        }
        const entry = makeTokenRecord({
          tool: "anthropic_api",
          provider: "anthropic",
          sourceMethod: "api",
          at: start.toISOString(),
          contentRef: "anthropic-usage_report",
          adapterId: "anthropic_api",
          inputTokens: input,
          outputTokens: output,
          note: "Anthropic organization usage_report/messages",
        });
        if (entry) {
          return {
            readiness: buildReadiness({
              adapterId: "anthropic_api",
              label: "Anthropic API",
              provider: "anthropic",
              ready: true,
              automated: true,
              primarySourceMethod: "api",
              status: "active",
              reason: "Usage pulled from Anthropic usage_report API.",
              tokenObservations: 1,
            }),
            tokenEntries: [entry],
            spendEntries: [],
          };
        }
      }
    }

    const localPath = path.join(cwd, "data", "telemetry", "exports", "anthropic-usage.json");
    try {
      await stat(localPath);
      const entry = await readUsageExport(localPath);
      if (entry) {
        return {
          readiness: buildReadiness({
            adapterId: "anthropic_api",
            label: "Anthropic API",
            provider: "anthropic",
            ready: true,
            automated: true,
            primarySourceMethod: "export",
            status: "active",
            reason: "Anthropic usage from data/telemetry/exports/anthropic-usage.json",
            tokenObservations: 1,
          }),
          tokenEntries: [entry],
          spendEntries: [],
        };
      }
    } catch {
      /* no local export */
    }

    const reason =
      res.status === 401 || res.status === 403
        ? "Anthropic API key lacks organization usage_report access — place export at data/telemetry/exports/anthropic-usage.json or set CCC_ANTHROPIC_USAGE_PATH."
        : res.error ??
          `Anthropic usage API unavailable (HTTP ${res.status || "network"}).`;

    return emptyResult(
      "anthropic_api",
      "Anthropic API",
      "anthropic",
      "api",
      res.status === 401 || res.status === 403 ? "missing_credentials" : "no_data",
      reason,
      Boolean(apiKey),
    );
  },
};
