import type {
  AIUsageProvider,
  AIUsageSource,
  AIUsageSourceMethod,
  AIUsageTool,
  AISpendRecord,
  AITokenUsageRecord,
} from "../aiUsage";
import { legacySourceToMethod, newRecordId, resolveTokenTotals } from "../aiUsage";

export function makeTokenRecord(input: {
  tool: AIUsageTool;
  provider: AIUsageProvider;
  sourceMethod: AIUsageSourceMethod;
  source?: AIUsageSource;
  at?: string;
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
  model?: string | null;
  project?: string | null;
  estimated?: boolean;
  note?: string;
  id?: string;
}): AITokenUsageRecord | null {
  const totals = resolveTokenTotals(input);
  if (totals.totalTokens == null) return null;
  const source = input.source ?? sourceMethodToLegacy(input.sourceMethod);
  return {
    id: input.id ?? newRecordId(`ingest-${input.tool}`),
    at: input.at ?? new Date().toISOString(),
    tool: input.tool,
    provider: input.provider,
    source,
    sourceMethod: input.sourceMethod,
    ...totals,
    model: input.model ?? null,
    project: input.project ?? null,
    estimated: input.estimated === true,
    ...(input.note ? { note: input.note } : {}),
  };
}

export function makeSpendRecord(input: {
  tool: AIUsageTool;
  provider: AIUsageProvider;
  sourceMethod: AIUsageSourceMethod;
  source?: AIUsageSource;
  amount: number;
  currency?: string;
  billingPeriod?: string | null;
  at?: string;
  estimated?: boolean;
  note?: string;
  id?: string;
}): AISpendRecord | null {
  if (!Number.isFinite(input.amount) || input.amount < 0) return null;
  return {
    id: input.id ?? newRecordId(`ingest-${input.tool}`),
    at: input.at ?? new Date().toISOString(),
    tool: input.tool,
    provider: input.provider,
    source: input.source ?? sourceMethodToLegacy(input.sourceMethod),
    sourceMethod: input.sourceMethod,
    amount: Math.round(input.amount * 100) / 100,
    currency: (input.currency ?? "USD").toUpperCase(),
    billingPeriod: input.billingPeriod ?? null,
    estimated: input.estimated === true,
    ...(input.note ? { note: input.note } : {}),
  };
}

export function sourceMethodToLegacy(method: AIUsageSourceMethod): AIUsageSource {
  switch (method) {
    case "api":
      return "api_integration";
    case "local_log":
      return "local_logs";
    case "export":
      return "exported_file";
    case "invoice":
      return "manual_entry";
    case "runtime_writer":
      return "local_logs";
    case "unavailable":
      return "manual_entry";
    default:
      return "manual_entry";
  }
}

export function normalizeTokenRecord(entry: AITokenUsageRecord): AITokenUsageRecord {
  return {
    ...entry,
    sourceMethod: entry.sourceMethod ?? legacySourceToMethod(entry.source),
  };
}

export function normalizeSpendRecord(entry: AISpendRecord): AISpendRecord {
  return {
    ...entry,
    sourceMethod: entry.sourceMethod ?? legacySourceToMethod(entry.source),
  };
}

export function entryFingerprint(
  kind: "token" | "spend",
  entry: { id: string; tool: string; at: string },
): string {
  return `${kind}:${entry.id}:${entry.tool}:${entry.at}`;
}
