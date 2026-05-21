import {
  readPersistedSpendStore,
  readPersistedTokenStore,
} from "../persistence/aiUsageStores";
import { saveTelemetryStore } from "../persistence/io";
import { trimUsageEntries } from "../persistence/retention";
import type { ApiSpendStore, TokenUsageStore } from "../persistence/schema";
import type { AISpendRecord, AITokenUsageRecord } from "../aiUsage";
import { legacySourceToMethod } from "../aiUsage";
import { entryFingerprint, normalizeSpendRecord, normalizeTokenRecord } from "./records";
import type { IngestionAdapterResult } from "./types";

function recomputeTokenRolling(entries: AITokenUsageRecord[]): TokenUsageStore["rolling"] {
  let totalTokens = 0;
  let totalInput = 0;
  let totalOutput = 0;
  let hasTotal = false;
  let hasIn = false;
  let hasOut = false;
  for (const e of entries) {
    if (e.estimated) continue;
    if (e.totalTokens != null) {
      totalTokens += e.totalTokens;
      hasTotal = true;
    }
    if (e.inputTokens != null) {
      totalInput += e.inputTokens;
      hasIn = true;
    }
    if (e.outputTokens != null) {
      totalOutput += e.outputTokens;
      hasOut = true;
    }
  }
  return {
    totalTokens: hasTotal ? totalTokens : null,
    totalInputTokens: hasIn ? totalInput : null,
    totalOutputTokens: hasOut ? totalOutput : null,
  };
}

function recomputeSpendRolling(entries: AISpendRecord[]): ApiSpendStore["rolling"] {
  const byCurrency: Record<string, number> = {};
  let totalUsd = 0;
  let hasUsd = false;
  for (const e of entries) {
    if (e.estimated) continue;
    const cur = e.currency.toUpperCase();
    byCurrency[cur] = Math.round(((byCurrency[cur] ?? 0) + e.amount) * 100) / 100;
    if (cur === "USD") {
      totalUsd += e.amount;
      hasUsd = true;
    }
  }
  return {
    totalUsd: hasUsd ? Math.round(totalUsd * 100) / 100 : null,
    byCurrency,
  };
}

export async function persistIngestionResults(
  cwd: string,
  results: IngestionAdapterResult[],
): Promise<{ ingestedTokenEntries: number; ingestedSpendEntries: number; skippedDuplicates: number }> {
  const tokenStore =
    (await readPersistedTokenStore(cwd)) ??
    ({
      schemaVersion: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      entries: [],
      rolling: {
        totalTokens: null,
        totalInputTokens: null,
        totalOutputTokens: null,
      },
    } as TokenUsageStore);

  const spendStore =
    (await readPersistedSpendStore(cwd)) ??
    ({
      schemaVersion: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      entries: [],
      rolling: { totalUsd: null, byCurrency: {} },
    } as ApiSpendStore);

  const tokenIds = new Set(
    tokenStore.entries.map((e) => entryFingerprint("token", e)),
  );
  const spendIds = new Set(
    spendStore.entries.map((e) => entryFingerprint("spend", e)),
  );

  let ingestedTokenEntries = 0;
  let ingestedSpendEntries = 0;
  let skippedDuplicates = 0;

  for (const result of results) {
    for (const raw of result.tokenEntries) {
      const entry = normalizeTokenRecord({
        ...raw,
        sourceMethod: raw.sourceMethod ?? legacySourceToMethod(raw.source),
      });
      const fp = entryFingerprint("token", entry);
      if (tokenIds.has(fp)) {
        skippedDuplicates += 1;
        continue;
      }
      tokenIds.add(fp);
      tokenStore.entries.push(entry);
      ingestedTokenEntries += 1;
    }
    for (const raw of result.spendEntries) {
      const entry = normalizeSpendRecord({
        ...raw,
        sourceMethod: raw.sourceMethod ?? legacySourceToMethod(raw.source),
      });
      const fp = entryFingerprint("spend", entry);
      if (spendIds.has(fp)) {
        skippedDuplicates += 1;
        continue;
      }
      spendIds.add(fp);
      spendStore.entries.push(entry);
      ingestedSpendEntries += 1;
    }
  }

  tokenStore.entries = trimUsageEntries(tokenStore.entries);
  spendStore.entries = trimUsageEntries(spendStore.entries);
  tokenStore.rolling = recomputeTokenRolling(tokenStore.entries);
  spendStore.rolling = recomputeSpendRolling(spendStore.entries);

  if (ingestedTokenEntries > 0 || tokenStore.entries.length > 0) {
    await saveTelemetryStore(cwd, "token-usage", tokenStore);
  }
  if (ingestedSpendEntries > 0 || spendStore.entries.length > 0) {
    await saveTelemetryStore(cwd, "api-spend", spendStore);
  }

  return { ingestedTokenEntries, ingestedSpendEntries, skippedDuplicates };
}
