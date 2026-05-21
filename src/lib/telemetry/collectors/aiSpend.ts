import { readFile, stat } from "fs/promises";
import path from "path";
import type { AIUsageSource, AIUsageTool, AISpendRecord } from "../aiUsage";
import {
  defaultProviderForTool,
  isAIUsageProvider,
  isAIUsageSource,
  isAIUsageSourceMethod,
  isAIUsageTool,
  legacySourceToMethod,
} from "../aiUsage";
import { readPersistedSpendStore } from "../persistence/aiUsageStores";
import { telemetryStoreSourceLabel } from "../persistence/paths";
import type { AISpendSummary, TelemetryMetricValue } from "../types";
import {
  buildSpendSummary,
  envSpendEntry,
  spendMetricFromSummary,
} from "./aiUsageCollect";

async function parseExportedSpendRows(
  filePath: string,
  source: AIUsageSource,
): Promise<AISpendRecord[]> {
  try {
    const raw = await readFile(filePath, { encoding: "utf8" });
    const data: unknown = JSON.parse(raw);
    const rows: AISpendRecord[] = [];
    const at = new Date().toISOString();

    if (Array.isArray(data)) {
      for (const item of data) {
        if (!item || typeof item !== "object") continue;
        const o = item as Record<string, unknown>;
        const amount = o.amount ?? o.spend_usd ?? o.totalUsd;
        if (typeof amount !== "number" || !Number.isFinite(amount)) continue;
        rows.push({
          id: `file-${path.basename(filePath)}-${rows.length}`,
          at: typeof o.at === "string" ? o.at : at,
          tool: isAIUsageTool(o.tool) ? o.tool : "openai_api",
          provider: isAIUsageProvider(o.provider)
            ? o.provider
            : defaultProviderForTool(
                isAIUsageTool(o.tool) ? o.tool : "openai_api",
              ),
          source: isAIUsageSource(o.source) ? o.source : source,
          sourceMethod: isAIUsageSourceMethod(o.sourceMethod)
            ? o.sourceMethod
            : legacySourceToMethod(
                isAIUsageSource(o.source) ? o.source : source,
              ),
          amount: Math.round(amount * 100) / 100,
          currency:
            typeof o.currency === "string" ? o.currency.toUpperCase() : "USD",
          billingPeriod:
            typeof o.billingPeriod === "string"
              ? o.billingPeriod
              : typeof o.billing_period === "string"
                ? o.billing_period
                : null,
          estimated: o.estimated === true,
        });
      }
      return rows;
    }

    if (!data || typeof data !== "object") return rows;
    const o = data as Record<string, unknown>;

    if (Array.isArray(o.entries)) {
      for (const item of o.entries) {
        if (!item || typeof item !== "object") continue;
        const row = item as AISpendRecord;
        if (isAIUsageTool(row.tool) && typeof row.amount === "number") {
          rows.push({
            ...row,
            sourceMethod:
              row.sourceMethod ?? legacySourceToMethod(row.source),
          });
        }
      }
      if (rows.length > 0) return rows;
    }

    const rolling = o.rolling;
    const amount =
      typeof o.totalUsd === "number"
        ? o.totalUsd
        : rolling &&
            typeof rolling === "object" &&
            typeof (rolling as Record<string, unknown>).totalUsd === "number"
          ? (rolling as Record<string, unknown>).totalUsd
          : typeof o.spend_usd === "number"
            ? o.spend_usd
            : null;

    if (typeof amount === "number" && Number.isFinite(amount)) {
      rows.push({
        id: `file-rolling-${path.basename(filePath)}`,
        at,
        tool: "other",
        provider: "other",
        source,
        sourceMethod: "export",
        amount: Math.round(amount * 100) / 100,
        currency: "USD",
        billingPeriod: null,
        estimated: false,
        note: `legacy export ${path.basename(filePath)}`,
      });
    }
    return rows;
  } catch {
    return [];
  }
}

export async function collectAISpend(
  cwd = process.cwd(),
): Promise<AISpendSummary> {
  const merged: AISpendRecord[] = [];
  let aggregateSource = "no-ai-spend-sources";
  let aggregateAvailable = false;

  const envUsd = process.env.CCC_API_SPEND_USD?.trim();
  if (envUsd) {
    const n = Number(envUsd);
    if (Number.isFinite(n) && n >= 0) {
      merged.push(envSpendEntry(n));
      aggregateSource = "env:CCC_API_SPEND_USD";
      aggregateAvailable = true;
    }
  }

  const store = await readPersistedSpendStore(cwd);
  if (store?.entries.length) {
    merged.push(...store.entries);
    aggregateSource = telemetryStoreSourceLabel("api-spend");
    aggregateAvailable = store.rolling.totalUsd != null;
  } else if (store?.rolling.totalUsd != null) {
    aggregateSource = telemetryStoreSourceLabel("api-spend");
    aggregateAvailable = true;
  }

  const envPath = process.env.CCC_API_SPEND_PATH?.trim();
  const candidates = [
    ...(envPath ? [path.resolve(envPath)] : []),
    path.join(cwd, "data", "telemetry", "api-spend.json"),
    path.join(cwd, "public", "api-spend.json"),
  ];

  for (const filePath of candidates) {
    try {
      await stat(filePath);
    } catch {
      continue;
    }
    if (filePath.includes("data\\telemetry") || filePath.includes("data/telemetry")) {
      if (store) continue;
    }
    const rows = await parseExportedSpendRows(filePath, "exported_file");
    if (rows.length > 0) {
      merged.push(...rows);
      aggregateSource = `exported_file:${path.basename(filePath)}`;
      aggregateAvailable = true;
    }
  }

  if (merged.length === 0) {
    return buildSpendSummary([], aggregateSource, false);
  }

  const summary = buildSpendSummary(merged, aggregateSource, aggregateAvailable);
  if (!aggregateAvailable && summary.totalUsd != null) {
    summary.aggregateAvailable = true;
  }
  return summary;
}

export async function collectApiSpendTelemetry(
  cwd = process.cwd(),
): Promise<TelemetryMetricValue<number>> {
  const summary = await collectAISpend(cwd);
  return spendMetricFromSummary(summary);
}
