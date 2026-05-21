import type {
  AIUsageProvider,
  AIUsageSource,
  AIUsageSourceMethod,
  AIUsageTool,
  AISpendRecord,
  AITokenUsageRecord,
} from "../aiUsage";
import { legacySourceToMethod, resolveTokenTotals } from "../aiUsage";
import type { IngestionAdapterId } from "./types";
import {
  assignStableSpendRecord,
  assignStableTokenRecord,
  normalizeObservationDay,
  stableSpendObservationId,
  stableTokenObservationId,
} from "./dedupe";

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
  contentRef?: string;
  adapterId?: IngestionAdapterId;
}): AITokenUsageRecord | null {
  const totals = resolveTokenTotals(input);
  if (totals.totalTokens == null) return null;
  const source = input.source ?? sourceMethodToLegacy(input.sourceMethod);
  const day = normalizeObservationDay(input.at);
  const at =
    input.sourceMethod === "api"
      ? `${day}T12:00:00.000Z`
      : (input.at ?? new Date().toISOString());
  const draft: AITokenUsageRecord = {
    id: input.id ?? "pending",
    at,
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
  return assignStableTokenRecord(draft, input.adapterId, input.contentRef ?? input.note);
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
  contentRef?: string;
}): AISpendRecord | null {
  if (!Number.isFinite(input.amount) || input.amount < 0) return null;
  const source = input.source ?? sourceMethodToLegacy(input.sourceMethod);
  const draft: AISpendRecord = {
    id: input.id ?? "pending",
    at: input.at ?? new Date().toISOString(),
    tool: input.tool,
    provider: input.provider,
    source,
    sourceMethod: input.sourceMethod,
    amount: Math.round(input.amount * 100) / 100,
    currency: (input.currency ?? "USD").toUpperCase(),
    billingPeriod: input.billingPeriod ?? null,
    estimated: input.estimated === true,
    ...(input.note ? { note: input.note } : {}),
  };
  return assignStableSpendRecord(draft, input.contentRef ?? input.note);
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
  return assignStableTokenRecord({
    ...entry,
    sourceMethod: entry.sourceMethod ?? legacySourceToMethod(entry.source),
  });
}

export function normalizeSpendRecord(entry: AISpendRecord): AISpendRecord {
  return assignStableSpendRecord({
    ...entry,
    sourceMethod: entry.sourceMethod ?? legacySourceToMethod(entry.source),
  });
}

/** @deprecated Use observation id from dedupe.ts */
export function entryFingerprint(
  kind: "token" | "spend",
  entry: { id: string },
): string {
  return `${kind}:${entry.id}`;
}

export { stableTokenObservationId, stableSpendObservationId };
