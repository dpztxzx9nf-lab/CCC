import { readFile, stat } from "fs/promises";
import path from "path";
import { LOCAL_SOURCE_ROOTS } from "@/lib/localData/config";
import { parseJsonBody } from "../http";
import { makeTokenRecord } from "../records";
import type { TelemetryIngestionAdapter } from "../types";
import { buildReadiness, emptyResult } from "./readiness";

const LIAHONA_USAGE_PATHS = [
  "data/usage.json",
  "data/token-usage.json",
  ".telemetry/token-usage.json",
  "usage.json",
];

async function readLiahonaUsageFile(
  filePath: string,
): Promise<ReturnType<typeof makeTokenRecord>> {
  try {
    const raw = await readFile(filePath, { encoding: "utf8" });
    const data = parseJsonBody(raw);
    if (!data || typeof data !== "object") return null;
    const o = data as Record<string, unknown>;
    const rolling = o.rolling as Record<string, unknown> | undefined;
    const total =
      o.total_tokens ??
      o.totalTokens ??
      rolling?.totalTokens ??
      o.tokens;
    const input = o.input_tokens ?? o.inputTokens;
    const output = o.output_tokens ?? o.outputTokens;
    return makeTokenRecord({
      id: `liahona-${path.basename(filePath)}`,
      tool: "liahona",
      provider: "internal",
      sourceMethod: "runtime_writer",
      inputTokens: typeof input === "number" ? input : null,
      outputTokens: typeof output === "number" ? output : null,
      totalTokens: typeof total === "number" ? total : null,
      project: "Liahona",
      note: `Liahona runtime writer ${filePath}`,
    });
  } catch {
    return null;
  }
}

export const liahonaIngestionAdapter: TelemetryIngestionAdapter = {
  id: "liahona_writer",
  label: "Liahona Writer",
  provider: "internal",
  primarySourceMethod: "runtime_writer",
  async collect() {
    const liahonaRoot =
      LOCAL_SOURCE_ROOTS.find((r) => r.slug === "liahona")?.root ??
      process.env.CCC_LIAHONA_ROOT?.trim();
    if (!liahonaRoot) {
      return emptyResult(
        "liahona_writer",
        "Liahona Writer",
        "internal",
        "runtime_writer",
        "missing_credentials",
        "Liahona project root not configured in LOCAL_SOURCE_ROOTS.",
      );
    }

    const entries = [];
    for (const rel of LIAHONA_USAGE_PATHS) {
      const filePath = path.join(liahonaRoot, rel);
      try {
        await stat(filePath);
      } catch {
        continue;
      }
      const entry = await readLiahonaUsageFile(filePath);
      if (entry) entries.push(entry);
    }

    if (entries.length === 0) {
      return emptyResult(
        "liahona_writer",
        "Liahona Writer",
        "internal",
        "runtime_writer",
        "no_data",
        `No Liahona usage artifact under ${liahonaRoot} (expected usage.json or data/usage.json).`,
        true,
      );
    }

    return {
      readiness: buildReadiness({
        adapterId: "liahona_writer",
        label: "Liahona Writer",
        provider: "internal",
        ready: true,
        automated: true,
        primarySourceMethod: "runtime_writer",
        status: "active",
        reason: `Liahona runtime writer: ${entries.length} usage file(s) ingested.`,
        tokenObservations: entries.length,
      }),
      tokenEntries: entries,
      spendEntries: [],
    };
  },
};
