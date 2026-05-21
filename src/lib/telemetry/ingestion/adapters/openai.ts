import { parseJsonBody, safeFetch } from "../http";
import { makeTokenRecord } from "../records";
import type { TelemetryIngestionAdapter } from "../types";
import { buildReadiness, emptyResult } from "./readiness";

function usageDateOffset(daysAgo: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

async function fetchDayUsage(
  apiKey: string,
  date: string,
): Promise<{ input: number; output: number } | null> {
  const res = await safeFetch(`https://api.openai.com/v1/usage?date=${date}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) return null;
  const json = parseJsonBody(res.body);
  if (!json || typeof json !== "object") return null;
  const data = (json as { data?: unknown }).data;
  if (!Array.isArray(data)) return null;
  let input = 0;
  let output = 0;
  let found = false;
  for (const row of data) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const ctx = o.n_context_tokens_total;
    const gen = o.n_generated_tokens_total;
    if (typeof ctx === "number") {
      input += ctx;
      found = true;
    }
    if (typeof gen === "number") {
      output += gen;
      found = true;
    }
  }
  return found ? { input, output } : null;
}

export const openaiIngestionAdapter: TelemetryIngestionAdapter = {
  id: "openai_api",
  label: "OpenAI API",
  provider: "openai",
  primarySourceMethod: "api",
  async collect() {
    const apiKey =
      process.env.OPENAI_API_KEY?.trim() ||
      process.env.CCC_OPENAI_API_KEY?.trim();
    if (!apiKey) {
      return emptyResult(
        "openai_api",
        "OpenAI API",
        "openai",
        "api",
        "missing_credentials",
        "OPENAI_API_KEY not set — cannot query usage API.",
      );
    }

    const usagePath = process.env.CCC_OPENAI_USAGE_PATH?.trim();
    if (usagePath) {
      return emptyResult(
        "openai_api",
        "OpenAI API",
        "openai",
        "export",
        "configured",
        `CCC_OPENAI_USAGE_PATH is set (${usagePath}); export_watcher handles file ingestion.`,
        true,
      );
    }

    const today = await fetchDayUsage(apiKey, usageDateOffset(0));
    const yesterday = await fetchDayUsage(apiKey, usageDateOffset(1));
    const usage = today ?? yesterday;

    if (!usage) {
      const probe = await safeFetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const reason = !probe.ok
        ? probe.status === 401
          ? "OpenAI API key rejected — usage endpoint unavailable."
          : `OpenAI usage API returned no data (HTTP ${probe.status || "error"}).`
        : "OpenAI key validates but /v1/usage returned no token rows for today or yesterday.";
      return emptyResult(
        "openai_api",
        "OpenAI API",
        "openai",
        "api",
        probe.ok ? "no_data" : "error",
        reason,
        probe.ok,
      );
    }

    const at = new Date().toISOString();
    const entry = makeTokenRecord({
      id: `openai-api-${usageDateOffset(0)}`,
      tool: "openai_api",
      provider: "openai",
      sourceMethod: "api",
      at,
      inputTokens: usage.input,
      outputTokens: usage.output,
      note: "OpenAI /v1/usage daily aggregate",
    });

    return {
      readiness: buildReadiness({
        adapterId: "openai_api",
        label: "OpenAI API",
        provider: "openai",
        ready: true,
        automated: true,
        primarySourceMethod: "api",
        status: "active",
        reason: "Usage pulled from OpenAI /v1/usage API.",
        tokenObservations: entry ? 1 : 0,
        spendObservations: 0,
      }),
      tokenEntries: entry ? [entry] : [],
      spendEntries: [],
    };
  },
};
