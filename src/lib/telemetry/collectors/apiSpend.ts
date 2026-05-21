import { readFile, stat } from "fs/promises";
import path from "path";
import type { TelemetryMetricValue } from "../types";

async function readSpendFile(filePath: string): Promise<number | null> {
  try {
    const raw = await readFile(filePath, { encoding: "utf8" });
    const data: unknown = JSON.parse(raw);
    if (typeof data === "number" && Number.isFinite(data)) return data;
    if (!data || typeof data !== "object") return null;
    const o = data as Record<string, unknown>;
    const candidates = [
      o.spend_usd,
      o.spendUsd,
      o.total_usd,
      o.totalUsd,
      o.cost_usd,
      o.cost,
      o.amount,
    ];
    for (const c of candidates) {
      if (typeof c === "number" && Number.isFinite(c)) return c;
    }
  } catch {
    /* unreadable */
  }
  return null;
}

/** API spend from env or explicit local billing file only */
export async function collectApiSpendTelemetry(
  cwd = process.cwd(),
): Promise<TelemetryMetricValue<number>> {
  const envUsd = process.env.CCC_API_SPEND_USD?.trim();
  if (envUsd) {
    const n = Number(envUsd);
    if (Number.isFinite(n) && n >= 0) {
      return {
        value: Math.round(n * 100) / 100,
        source: "env:CCC_API_SPEND_USD",
        available: true,
      };
    }
  }

  const envPath = process.env.CCC_API_SPEND_PATH?.trim();
  const candidates = [
    ...(envPath ? [path.resolve(envPath)] : []),
    path.join(cwd, "public", "api-spend.json"),
    path.join(cwd, ".telemetry", "api-spend.json"),
  ];

  for (const filePath of candidates) {
    try {
      await stat(filePath);
    } catch {
      continue;
    }
    const spend = await readSpendFile(filePath);
    if (spend != null) {
      return {
        value: Math.round(spend * 100) / 100,
        source: `file:${path.basename(filePath)}`,
        available: true,
      };
    }
  }

  return {
    value: null,
    source: "no-local-billing-source",
    available: false,
  };
}
