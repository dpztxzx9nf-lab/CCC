import {
  readPersistedSpendStore,
  readPersistedTokenStore,
} from "../persistence/aiUsageStores";
import { saveTelemetryStore } from "../persistence/io";
import { trimUsageEntries } from "../persistence/retention";
import type { ApiSpendStore, TokenUsageStore } from "../persistence/schema";
import type { AISpendRecord, AITokenUsageRecord } from "../aiUsage";
import {
  assignStableSpendRecord,
  assignStableTokenRecord,
  indexHasObservation,
  loadDedupeIndex,
  pruneDedupeIndex,
  registerObservation,
  rebuildIndexFromStores,
  saveDedupeIndex,
  stableRuntimeObservationId,
  runtimeProcessSignature,
  type DedupeApplyStats,
} from "./dedupe";
import type { IngestionAdapterResult } from "./types";
import type { IngestionAdapterId } from "./types";

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

function uniqueById<T extends { id: string }>(entries: T[]): T[] {
  const map = new Map<string, T>();
  for (const e of entries) map.set(e.id, e);
  return [...map.values()];
}

function adapterIdFromResult(result: IngestionAdapterResult): IngestionAdapterId {
  return result.readiness.adapterId;
}

export async function persistIngestionResults(
  cwd: string,
  results: IngestionAdapterResult[],
  options?: { runtimeObservationId?: string | null },
): Promise<DedupeApplyStats> {
  const index = await loadDedupeIndex(cwd);

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

  tokenStore.entries = uniqueById(
    tokenStore.entries.map((e) => assignStableTokenRecord(e)),
  );
  spendStore.entries = uniqueById(
    spendStore.entries.map((e) => assignStableSpendRecord(e)),
  );

  rebuildIndexFromStores(
    index,
    tokenStore.entries,
    spendStore.entries,
    options?.runtimeObservationId ?? null,
  );

  let ingestedTokenEntries = 0;
  let ingestedSpendEntries = 0;
  let skippedToken = 0;
  let skippedSpend = 0;
  const seenAt = new Date().toISOString();

  for (const result of results) {
    const adapterId = adapterIdFromResult(result);

    for (const raw of result.tokenEntries) {
      const entry = assignStableTokenRecord(raw, adapterId, raw.note);
      if (
        indexHasObservation(index, entry.id) ||
        tokenStore.entries.some((e) => e.id === entry.id)
      ) {
        registerObservation(index, {
          id: entry.id,
          kind: "token",
          adapterId,
          firstSeenAt: entry.at,
          lastSeenAt: seenAt,
        });
        skippedToken += 1;
        continue;
      }
      registerObservation(index, {
        id: entry.id,
        kind: "token",
        adapterId,
        firstSeenAt: entry.at,
        lastSeenAt: seenAt,
      });
      tokenStore.entries.push(entry);
      ingestedTokenEntries += 1;
    }

    for (const raw of result.spendEntries) {
      const entry = assignStableSpendRecord(raw, raw.note);
      if (
        indexHasObservation(index, entry.id) ||
        spendStore.entries.some((e) => e.id === entry.id)
      ) {
        registerObservation(index, {
          id: entry.id,
          kind: "spend",
          adapterId,
          firstSeenAt: entry.at,
          lastSeenAt: seenAt,
        });
        skippedSpend += 1;
        continue;
      }
      registerObservation(index, {
        id: entry.id,
        kind: "spend",
        adapterId,
        firstSeenAt: entry.at,
        lastSeenAt: seenAt,
      });
      spendStore.entries.push(entry);
      ingestedSpendEntries += 1;
    }
  }

  tokenStore.entries = uniqueById(
    trimUsageEntries(tokenStore.entries) as AITokenUsageRecord[],
  );
  spendStore.entries = uniqueById(
    trimUsageEntries(spendStore.entries) as AISpendRecord[],
  );
  tokenStore.rolling = recomputeTokenRolling(tokenStore.entries);
  spendStore.rolling = recomputeSpendRolling(spendStore.entries);

  const activeIds = new Set<string>([
    ...tokenStore.entries.map((e) => e.id),
    ...spendStore.entries.map((e) => e.id),
    ...(options?.runtimeObservationId ? [options.runtimeObservationId] : []),
  ]);
  pruneDedupeIndex(index, activeIds);
  rebuildIndexFromStores(
    index,
    tokenStore.entries,
    spendStore.entries,
    options?.runtimeObservationId ?? null,
  );

  index.ingestion.lastRunAt = seenAt;
  index.ingestion.lastSkippedDuplicates = skippedToken + skippedSpend;
  index.ingestion.lastIngestedTokenEntries = ingestedTokenEntries;
  index.ingestion.lastIngestedSpendEntries = ingestedSpendEntries;
  index.ingestion.totalRuns += 1;
  index.ingestion.totalSkippedDuplicates += skippedToken + skippedSpend;
  index.ingestion.totalIngestedTokenEntries += ingestedTokenEntries;
  index.ingestion.totalIngestedSpendEntries += ingestedSpendEntries;

  await saveDedupeIndex(cwd, index);
  await saveTelemetryStore(cwd, "token-usage", tokenStore);
  await saveTelemetryStore(cwd, "api-spend", spendStore);

  return {
    ingestedTokenEntries,
    ingestedSpendEntries,
    skippedDuplicates: skippedToken + skippedSpend,
    skippedToken,
    skippedSpend,
    skippedRuntime: 0,
    indexSize: Object.keys(index.observations).length,
  };
}

export function runtimeObservationIdFromSnapshot(
  runtime: NonNullable<import("../types").OperationalTelemetry["runtime"]>,
): string {
  return stableRuntimeObservationId({
    pm2Available: runtime.pm2Available,
    processSignature: runtimeProcessSignature(
      runtime.processes.map((p) => ({
        name: p.name,
        pmId: p.pmId,
        status: p.status,
      })),
    ),
  });
}
