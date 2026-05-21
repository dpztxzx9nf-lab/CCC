import type { AISpendRecord, AITokenUsageRecord } from "../aiUsage";
import { legacySourceToMethod, newRecordId } from "../aiUsage";
import type {
  ApiSpendStore,
  ApiSpendStoreV1,
  TokenUsageStore,
  TokenUsageStoreV1,
} from "./schema";
import { createStoreTimestamps } from "./io";

export function migrateTokenUsageStore(raw: unknown): TokenUsageStore | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as TokenUsageStoreV1 | TokenUsageStore;
  if (o.schemaVersion === 2 && Array.isArray((o as TokenUsageStore).entries)) {
    return o as TokenUsageStore;
  }
  if (o.schemaVersion !== 1) return null;
  const v1 = o as TokenUsageStoreV1;
  const entries: AITokenUsageRecord[] = [];
  if (
    typeof v1.rolling?.totalTokens === "number" &&
    Number.isFinite(v1.rolling.totalTokens)
  ) {
    entries.push({
      id: newRecordId("migrate-tokens"),
      at: v1.updatedAt ?? new Date().toISOString(),
      tool: "other",
      provider: "other",
      source: "manual_entry",
      sourceMethod: "invoice",
      inputTokens: null,
      outputTokens: null,
      totalTokens: Math.round(v1.rolling.totalTokens),
      model: null,
      project: null,
      estimated: false,
      note: "Migrated from schema v1 rolling total",
    });
  }
  return {
    schemaVersion: 2,
    createdAt: v1.createdAt ?? createStoreTimestamps().createdAt,
    updatedAt: v1.updatedAt ?? createStoreTimestamps().updatedAt,
    entries,
    rolling: {
      totalTokens: v1.rolling?.totalTokens ?? null,
      totalInputTokens: null,
      totalOutputTokens: null,
    },
  };
}

export function migrateApiSpendStore(raw: unknown): ApiSpendStore | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as ApiSpendStoreV1 | ApiSpendStore;
  if (o.schemaVersion === 2 && Array.isArray((o as ApiSpendStore).entries)) {
    return o as ApiSpendStore;
  }
  if (o.schemaVersion !== 1) return null;
  const v1 = o as ApiSpendStoreV1;
  const entries: AISpendRecord[] = [];
  if (
    typeof v1.rolling?.totalUsd === "number" &&
    Number.isFinite(v1.rolling.totalUsd)
  ) {
    entries.push({
      id: newRecordId("migrate-spend"),
      at: v1.updatedAt ?? new Date().toISOString(),
      tool: "other",
      provider: "other",
      source: "manual_entry",
      sourceMethod: "invoice",
      amount: Math.round(v1.rolling.totalUsd * 100) / 100,
      currency: "USD",
      billingPeriod: null,
      estimated: false,
      note: "Migrated from schema v1 rolling total",
    });
  }
  return {
    schemaVersion: 2,
    createdAt: v1.createdAt ?? createStoreTimestamps().createdAt,
    updatedAt: v1.updatedAt ?? createStoreTimestamps().updatedAt,
    entries,
    rolling: {
      totalUsd: v1.rolling?.totalUsd ?? null,
      byCurrency:
        typeof v1.rolling?.totalUsd === "number"
          ? { USD: v1.rolling.totalUsd }
          : {},
    },
  };
}
