import { readFile, stat } from "fs/promises";
import path from "path";
import type { AIUsageSource, AIUsageTool, AITokenUsageRecord } from "../aiUsage";
import {
  defaultProviderForTool,
  isAIUsageProvider,
  isAIUsageSource,
  isAIUsageSourceMethod,
  isAIUsageTool,
  legacySourceToMethod,
  resolveTokenTotals,
} from "../aiUsage";
import { LOCAL_SOURCE_ROOTS } from "@/lib/localData/config";
import { readPersistedTokenStore } from "../persistence/aiUsageStores";
import { telemetryStoreSourceLabel } from "../persistence/paths";
import type { AITokenUsageSummary, TelemetryMetricValue } from "../types";
import {
  buildTokenSummary,
  envTokenEntry,
  tokenMetricFromSummary,
} from "./aiUsageCollect";

const USAGE_FILE_NAMES = new Set([
  "usage.json",
  "token-usage.json",
  "tokens.json",
  "openai-usage.json",
]);

async function parseExportedTokenRows(
  filePath: string,
  source: AIUsageSource,
): Promise<AITokenUsageRecord[]> {
  try {
    const raw = await readFile(filePath, { encoding: "utf8" });
    const data: unknown = JSON.parse(raw);
    const rows: AITokenUsageRecord[] = [];
    const at = new Date().toISOString();

    if (Array.isArray(data)) {
      for (const item of data) {
        if (!item || typeof item !== "object") continue;
        const o = item as Record<string, unknown>;
        const tool = isAIUsageTool(o.tool) ? o.tool : "openai_api";
        const src = isAIUsageSource(o.source) ? o.source : source;
        const num = (v: unknown): number | null =>
          typeof v === "number" && Number.isFinite(v) ? v : null;
        const totals = resolveTokenTotals({
          inputTokens: num(o.input_tokens) ?? num(o.inputTokens),
          outputTokens: num(o.output_tokens) ?? num(o.outputTokens),
          totalTokens:
            num(o.total_tokens) ?? num(o.totalTokens) ?? num(o.tokens),
        });
        if (totals.totalTokens == null) continue;
        const srcMethod = isAIUsageSourceMethod(o.sourceMethod)
          ? o.sourceMethod
          : legacySourceToMethod(src);
        rows.push({
          id: `file-${path.basename(filePath)}-${rows.length}`,
          at: typeof o.at === "string" ? o.at : typeof o.timestamp === "string" ? o.timestamp : at,
          tool,
          provider:
            isAIUsageProvider(o.provider) ? o.provider : defaultProviderForTool(tool),
          source: src,
          sourceMethod: srcMethod,
          ...totals,
          model: typeof o.model === "string" ? o.model : null,
          project: typeof o.project === "string" ? o.project : null,
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
        const row = item as AITokenUsageRecord;
        if (isAIUsageTool(row.tool)) {
          const totals = resolveTokenTotals(row);
          if (totals.totalTokens != null) {
            rows.push({
              ...row,
              ...totals,
              sourceMethod:
                row.sourceMethod ?? legacySourceToMethod(row.source),
            });
          }
        }
      }
      if (rows.length > 0) return rows;
    }

    const rolling = o.rolling;
    const total =
      typeof o.total_tokens === "number"
        ? o.total_tokens
        : rolling &&
            typeof rolling === "object" &&
            typeof (rolling as Record<string, unknown>).totalTokens === "number"
          ? (rolling as Record<string, unknown>).totalTokens
          : typeof o.totalTokens === "number"
            ? o.totalTokens
            : null;

    if (typeof total === "number" && Number.isFinite(total)) {
      rows.push({
        id: `file-rolling-${path.basename(filePath)}`,
        at,
        tool: "other",
        provider: "other",
        source,
        sourceMethod: "export",
        inputTokens: null,
        outputTokens: null,
        totalTokens: Math.round(total),
        model: null,
        project: null,
        estimated: false,
        note: `legacy export ${path.basename(filePath)}`,
      });
    }
    return rows;
  } catch {
    return [];
  }
}

export async function collectAITokenUsage(
  cwd = process.cwd(),
): Promise<AITokenUsageSummary> {
  const merged: AITokenUsageRecord[] = [];
  let aggregateSource = "no-ai-token-sources";
  let aggregateAvailable = false;

  const envRaw = process.env.CCC_TOKEN_USAGE_TOTAL?.trim();
  if (envRaw) {
    const n = Number(envRaw);
    if (Number.isFinite(n) && n >= 0) {
      merged.push(envTokenEntry(n));
      aggregateSource = "env:CCC_TOKEN_USAGE_TOTAL";
      aggregateAvailable = true;
    }
  }

  const store = await readPersistedTokenStore(cwd);
  if (store?.entries.length) {
    merged.push(...store.entries);
    aggregateSource = telemetryStoreSourceLabel("token-usage");
    aggregateAvailable = store.rolling.totalTokens != null;
  } else if (store?.rolling.totalTokens != null) {
    aggregateSource = telemetryStoreSourceLabel("token-usage");
    aggregateAvailable = true;
  }

  const envPath = process.env.CCC_TOKEN_USAGE_PATH?.trim();
  const candidates = [
    ...(envPath ? [path.resolve(envPath)] : []),
    path.join(cwd, "data", "telemetry", "token-usage.json"),
    path.join(cwd, "public", "usage.json"),
    ...LOCAL_SOURCE_ROOTS.flatMap((r) => [
      path.join(r.root, "usage.json"),
      path.join(r.root, "data", "usage.json"),
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
    if (filePath.includes("data\\telemetry") || filePath.includes("data/telemetry")) {
      if (store) continue;
    }
    if (!USAGE_FILE_NAMES.has(base) && !envPath) continue;
    const rows = await parseExportedTokenRows(filePath, "exported_file");
    if (rows.length > 0) {
      merged.push(...rows);
      aggregateSource = `exported_file:${base}`;
      aggregateAvailable = true;
    }
  }

  if (merged.length === 0) {
    return buildTokenSummary([], aggregateSource, false);
  }

  const summary = buildTokenSummary(merged, aggregateSource, aggregateAvailable);
  if (!aggregateAvailable && summary.totalTokens != null) {
    summary.aggregateAvailable = true;
  }
  return summary;
}

export async function collectTokenTelemetry(
  cwd = process.cwd(),
): Promise<TelemetryMetricValue<number>> {
  const summary = await collectAITokenUsage(cwd);
  return tokenMetricFromSummary(summary);
}
