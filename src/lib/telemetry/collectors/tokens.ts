import { readFile, stat } from "fs/promises";
import path from "path";
import { LOCAL_SOURCE_ROOTS } from "@/lib/localData/config";
import type { TelemetryMetricValue } from "../types";

const USAGE_FILE_NAMES = new Set([
  "usage.json",
  "token-usage.json",
  "tokens.json",
  "openai-usage.json",
]);

async function readUsageFromFile(filePath: string): Promise<number | null> {
  try {
    const raw = await readFile(filePath, { encoding: "utf8" });
    const data: unknown = JSON.parse(raw);
    if (typeof data === "number" && Number.isFinite(data)) return data;
    if (!data || typeof data !== "object") return null;
    const o = data as Record<string, unknown>;
    const candidates = [
      o.total_tokens,
      o.totalTokens,
      o.tokens,
      o.token_count,
      o.usage_total,
    ];
    for (const c of candidates) {
      if (typeof c === "number" && Number.isFinite(c)) return c;
    }
    const usage = o.usage;
    if (usage && typeof usage === "object") {
      const u = usage as Record<string, unknown>;
      if (typeof u.total_tokens === "number") return u.total_tokens;
    }
  } catch {
    /* unreadable */
  }
  return null;
}

/** Token totals from env or local usage JSON only */
export async function collectTokenTelemetry(
  cwd = process.cwd(),
): Promise<TelemetryMetricValue<number>> {
  const envRaw = process.env.CCC_TOKEN_USAGE_TOTAL?.trim();
  if (envRaw) {
    const n = Number(envRaw);
    if (Number.isFinite(n) && n >= 0) {
      return {
        value: Math.round(n),
        source: "env:CCC_TOKEN_USAGE_TOTAL",
        available: true,
      };
    }
  }

  const envPath = process.env.CCC_TOKEN_USAGE_PATH?.trim();
  const candidates = [
    ...(envPath ? [path.resolve(envPath)] : []),
    path.join(cwd, "public", "usage.json"),
    path.join(cwd, ".telemetry", "token-usage.json"),
    ...LOCAL_SOURCE_ROOTS.flatMap((r) => [
      path.join(r.root, "usage.json"),
      path.join(r.root, "data", "usage.json"),
      path.join(r.root, ".telemetry", "token-usage.json"),
    ]),
  ];

  const seen = new Set<string>();
  for (const filePath of candidates) {
    const key = filePath.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    try {
      await stat(filePath);
    } catch {
      continue;
    }
    const base = path.basename(filePath);
    if (!USAGE_FILE_NAMES.has(base) && !envPath) continue;
    const total = await readUsageFromFile(filePath);
    if (total != null) {
      return {
        value: Math.round(total),
        source: `file:${base}`,
        available: true,
      };
    }
  }

  return {
    value: null,
    source: "no-local-token-source",
    available: false,
  };
}
