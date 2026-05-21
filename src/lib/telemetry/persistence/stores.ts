import type { OperationalTelemetry } from "../types";
import {
  createStoreTimestamps,
  finiteNonNegative,
  loadTelemetryStore,
  saveTelemetryStore,
  telemetryStoreExists,
} from "./io";
import { telemetryStoreSourceLabel } from "./paths";
import { trimRecentActivity, trimRuntimeRecent } from "./retention";
import {
  TELEMETRY_PERSISTENCE_SCHEMA_VERSION,
  type ApiSpendStore,
  type EmbeddingsStore,
  type QueueStore,
  type RuntimeStore,
  type TelemetryRecentEntry,
  type TokenUsageStore,
} from "./schema";

function isTokenUsageStore(value: unknown): value is TokenUsageStore {
  if (!value || typeof value !== "object") return false;
  const o = value as TokenUsageStore;
  return (
    o.schemaVersion === TELEMETRY_PERSISTENCE_SCHEMA_VERSION &&
    typeof o.createdAt === "string" &&
    typeof o.updatedAt === "string" &&
    !!o.rolling &&
    (o.rolling.totalTokens === null ||
      typeof o.rolling.totalTokens === "number") &&
    Array.isArray(o.recent)
  );
}

function isApiSpendStore(value: unknown): value is ApiSpendStore {
  if (!value || typeof value !== "object") return false;
  const o = value as ApiSpendStore;
  return (
    o.schemaVersion === TELEMETRY_PERSISTENCE_SCHEMA_VERSION &&
    typeof o.createdAt === "string" &&
    typeof o.updatedAt === "string" &&
    !!o.rolling &&
    (o.rolling.totalUsd === null || typeof o.rolling.totalUsd === "number") &&
    Array.isArray(o.recent)
  );
}

function isEmbeddingsStore(value: unknown): value is EmbeddingsStore {
  if (!value || typeof value !== "object") return false;
  const o = value as EmbeddingsStore;
  return (
    o.schemaVersion === TELEMETRY_PERSISTENCE_SCHEMA_VERSION &&
    typeof o.createdAt === "string" &&
    typeof o.updatedAt === "string" &&
    !!o.rolling &&
    (o.rolling.count === null || typeof o.rolling.count === "number") &&
    Array.isArray(o.recent)
  );
}

function isQueueStore(value: unknown): value is QueueStore {
  if (!value || typeof value !== "object") return false;
  const o = value as QueueStore;
  return (
    o.schemaVersion === TELEMETRY_PERSISTENCE_SCHEMA_VERSION &&
    typeof o.createdAt === "string" &&
    typeof o.updatedAt === "string" &&
    !!o.rolling &&
    (o.rolling.depth === null || typeof o.rolling.depth === "number") &&
    Array.isArray(o.recent)
  );
}

function isRuntimeStore(value: unknown): value is RuntimeStore {
  if (!value || typeof value !== "object") return false;
  const o = value as RuntimeStore;
  return (
    o.schemaVersion === TELEMETRY_PERSISTENCE_SCHEMA_VERSION &&
    typeof o.createdAt === "string" &&
    typeof o.updatedAt === "string" &&
    !!o.rolling &&
    (o.rolling.pm2Available === null ||
      typeof o.rolling.pm2Available === "boolean") &&
    (o.rolling.processCount === null ||
      typeof o.rolling.processCount === "number") &&
    Array.isArray(o.recent) &&
    (o.lastSnapshot === null ||
      (!!o.lastSnapshot &&
        typeof o.lastSnapshot.at === "string" &&
        typeof o.lastSnapshot.pm2Available === "boolean" &&
        Array.isArray(o.lastSnapshot.processes)))
  );
}

function defaultTokenUsageStore(): TokenUsageStore {
  return {
    schemaVersion: TELEMETRY_PERSISTENCE_SCHEMA_VERSION,
    ...createStoreTimestamps(),
    rolling: { totalTokens: null },
    recent: [],
  };
}

function defaultApiSpendStore(): ApiSpendStore {
  return {
    schemaVersion: TELEMETRY_PERSISTENCE_SCHEMA_VERSION,
    ...createStoreTimestamps(),
    rolling: { totalUsd: null },
    recent: [],
  };
}

function defaultEmbeddingsStore(): EmbeddingsStore {
  return {
    schemaVersion: TELEMETRY_PERSISTENCE_SCHEMA_VERSION,
    ...createStoreTimestamps(),
    rolling: { count: null },
    recent: [],
  };
}

function defaultQueueStore(): QueueStore {
  return {
    schemaVersion: TELEMETRY_PERSISTENCE_SCHEMA_VERSION,
    ...createStoreTimestamps(),
    rolling: { depth: null },
    recent: [],
  };
}

function defaultRuntimeStore(): RuntimeStore {
  return {
    schemaVersion: TELEMETRY_PERSISTENCE_SCHEMA_VERSION,
    ...createStoreTimestamps(),
    rolling: { pm2Available: null, processCount: null },
    recent: [],
    lastSnapshot: null,
  };
}

function pushRecent(
  recent: TelemetryRecentEntry[],
  entry: TelemetryRecentEntry,
): TelemetryRecentEntry[] {
  return trimRecentActivity([...recent, entry]);
}

export async function readPersistedTokenTotal(
  cwd = process.cwd(),
): Promise<number | null> {
  if (!(await telemetryStoreExists(cwd, "token-usage"))) return null;
  const store = await loadTelemetryStore(
    cwd,
    "token-usage",
    defaultTokenUsageStore,
    isTokenUsageStore,
  );
  return finiteNonNegative(store.rolling.totalTokens);
}

export async function readPersistedApiSpendUsd(
  cwd = process.cwd(),
): Promise<number | null> {
  if (!(await telemetryStoreExists(cwd, "api-spend"))) return null;
  const store = await loadTelemetryStore(
    cwd,
    "api-spend",
    defaultApiSpendStore,
    isApiSpendStore,
  );
  const usd = store.rolling.totalUsd;
  return typeof usd === "number" && Number.isFinite(usd) && usd >= 0
    ? Math.round(usd * 100) / 100
    : null;
}

export async function readPersistedEmbeddingCount(
  cwd = process.cwd(),
): Promise<number | null> {
  if (!(await telemetryStoreExists(cwd, "embeddings"))) return null;
  const store = await loadTelemetryStore(
    cwd,
    "embeddings",
    defaultEmbeddingsStore,
    isEmbeddingsStore,
  );
  return finiteNonNegative(store.rolling.count);
}

export async function readPersistedQueueDepth(
  cwd = process.cwd(),
): Promise<number | null> {
  if (!(await telemetryStoreExists(cwd, "queue"))) return null;
  const store = await loadTelemetryStore(
    cwd,
    "queue",
    defaultQueueStore,
    isQueueStore,
  );
  const depth = store.rolling.depth;
  return typeof depth === "number" && Number.isFinite(depth) && depth >= 0
    ? Math.round(depth)
    : null;
}

export async function readPersistedRuntimeFallback(
  cwd = process.cwd(),
): Promise<OperationalTelemetry["runtime"] | null> {
  if (!(await telemetryStoreExists(cwd, "runtime"))) return null;
  const store = await loadTelemetryStore(
    cwd,
    "runtime",
    defaultRuntimeStore,
    isRuntimeStore,
  );
  if (!store.lastSnapshot) return null;
  const { pm2Available, processes, archivist } = store.lastSnapshot;
  return {
    pm2Available,
    processes,
    ...(archivist ? { archivist } : {}),
  };
}

export { telemetryStoreSourceLabel };

export async function incrementTokenUsage(
  delta: number,
  cwd = process.cwd(),
): Promise<TokenUsageStore> {
  if (!Number.isFinite(delta) || delta < 0) {
    throw new RangeError("incrementTokenUsage: delta must be a non-negative number");
  }

  const store = await loadTelemetryStore(
    cwd,
    "token-usage",
    defaultTokenUsageStore,
    isTokenUsageStore,
    { createIfMissing: true },
  );
  const prev = finiteNonNegative(store.rolling.totalTokens) ?? 0;
  const total = Math.round(prev + delta);
  const at = new Date().toISOString();
  store.rolling.totalTokens = total;
  store.recent = pushRecent(store.recent, { at, value: total, delta });
  await saveTelemetryStore(cwd, "token-usage", store);
  return store;
}

export async function incrementApiSpend(
  deltaUsd: number,
  cwd = process.cwd(),
): Promise<ApiSpendStore> {
  if (!Number.isFinite(deltaUsd) || deltaUsd < 0) {
    throw new RangeError("incrementApiSpend: deltaUsd must be a non-negative number");
  }

  const store = await loadTelemetryStore(
    cwd,
    "api-spend",
    defaultApiSpendStore,
    isApiSpendStore,
    { createIfMissing: true },
  );
  const prev = store.rolling.totalUsd ?? 0;
  const total = Math.round((prev + deltaUsd) * 100) / 100;
  const at = new Date().toISOString();
  store.rolling.totalUsd = total;
  store.recent = pushRecent(store.recent, {
    at,
    value: total,
    delta: Math.round(deltaUsd * 100) / 100,
  });
  await saveTelemetryStore(cwd, "api-spend", store);
  return store;
}

export async function updateEmbeddingCount(
  count: number,
  cwd = process.cwd(),
): Promise<EmbeddingsStore> {
  if (!Number.isFinite(count) || count < 0) {
    throw new RangeError("updateEmbeddingCount: count must be a non-negative number");
  }

  const store = await loadTelemetryStore(
    cwd,
    "embeddings",
    defaultEmbeddingsStore,
    isEmbeddingsStore,
    { createIfMissing: true },
  );
  const prev = finiteNonNegative(store.rolling.count);
  const next = Math.round(count);
  const at = new Date().toISOString();
  store.rolling.count = next;
  const entry: TelemetryRecentEntry = { at, value: next };
  if (prev != null) entry.delta = next - prev;
  store.recent = pushRecent(store.recent, entry);
  await saveTelemetryStore(cwd, "embeddings", store);
  return store;
}

export async function updateQueueDepth(
  depth: number,
  cwd = process.cwd(),
): Promise<QueueStore> {
  if (!Number.isFinite(depth) || depth < 0) {
    throw new RangeError("updateQueueDepth: depth must be a non-negative number");
  }

  const store = await loadTelemetryStore(
    cwd,
    "queue",
    defaultQueueStore,
    isQueueStore,
    { createIfMissing: true },
  );
  const prev = store.rolling.depth;
  const next = Math.round(depth);
  const at = new Date().toISOString();
  store.rolling.depth = next;
  const entry: TelemetryRecentEntry = { at, value: next };
  if (typeof prev === "number" && Number.isFinite(prev)) entry.delta = next - prev;
  store.recent = pushRecent(store.recent, entry);
  await saveTelemetryStore(cwd, "queue", store);
  return store;
}

export async function recordRuntimeMetric(
  runtime: NonNullable<OperationalTelemetry["runtime"]>,
  cwd = process.cwd(),
): Promise<RuntimeStore> {
  const store = await loadTelemetryStore(
    cwd,
    "runtime",
    defaultRuntimeStore,
    isRuntimeStore,
    { createIfMissing: true },
  );
  const at = new Date().toISOString();
  const processCount = runtime.processes.length;
  store.rolling.pm2Available = runtime.pm2Available;
  store.rolling.processCount = processCount;
  store.lastSnapshot = {
    at,
    pm2Available: runtime.pm2Available,
    processes: runtime.processes,
    ...(runtime.archivist ? { archivist: runtime.archivist } : {}),
  };
  store.recent = trimRuntimeRecent([
    ...store.recent,
    { at, pm2Available: runtime.pm2Available, processCount },
  ]);
  await saveTelemetryStore(cwd, "runtime", store);
  return store;
}
