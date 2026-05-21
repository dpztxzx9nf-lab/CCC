import { readFile, stat } from "fs/promises";
import type {
  AIUsageProvider,
  AIUsageSource,
  AIUsageTool,
  AISpendRecord,
  AITokenUsageRecord,
} from "../aiUsage";
import {
  assignStableSpendRecord,
  assignStableTokenRecord,
  indexHasObservation,
  loadDedupeIndex,
  registerObservation,
  saveDedupeIndex,
} from "../ingestion/dedupe";
import {
  defaultProviderForTool,
  isAIUsageProvider,
  isAIUsageSource,
  isAIUsageSourceMethod,
  isAIUsageTool,
  legacySourceToMethod,
  resolveTokenTotals,
} from "../aiUsage";
import type { AIUsageSourceMethod } from "../aiUsage";
import {
  createStoreTimestamps,
  saveTelemetryStore,
  telemetryStoreExists,
} from "./io";
import { migrateApiSpendStore, migrateTokenUsageStore } from "./migrate";
import { telemetryStorePath } from "./paths";
import { trimUsageEntries } from "./retention";
import {
  TELEMETRY_PERSISTENCE_SCHEMA_VERSION,
  type ApiSpendStore,
  type SpendRolling,
  type TokenUsageRolling,
  type TokenUsageStore,
} from "./schema";

function recomputeTokenRolling(entries: AITokenUsageRecord[]): TokenUsageRolling {
  let totalTokens = 0;
  let totalInput = 0;
  let totalOutput = 0;
  let hasMeasured = false;
  let hasInput = false;
  let hasOutput = false;

  for (const e of entries) {
    if (e.estimated) continue;
    const t = resolveTokenTotals(e);
    if (t.totalTokens != null) {
      totalTokens += t.totalTokens;
      hasMeasured = true;
    }
    if (t.inputTokens != null) {
      totalInput += t.inputTokens;
      hasInput = true;
    }
    if (t.outputTokens != null) {
      totalOutput += t.outputTokens;
      hasOutput = true;
    }
  }

  return {
    totalTokens: hasMeasured ? totalTokens : null,
    totalInputTokens: hasInput ? totalInput : null,
    totalOutputTokens: hasOutput ? totalOutput : null,
  };
}

function recomputeSpendRolling(entries: AISpendRecord[]): SpendRolling {
  const byCurrency: Record<string, number> = {};
  let totalUsd = 0;
  let hasUsd = false;

  for (const e of entries) {
    if (e.estimated) continue;
    const cur = (e.currency || "USD").toUpperCase();
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

function defaultTokenUsageStore(): TokenUsageStore {
  return {
    schemaVersion: TELEMETRY_PERSISTENCE_SCHEMA_VERSION,
    ...createStoreTimestamps(),
    entries: [],
    rolling: {
      totalTokens: null,
      totalInputTokens: null,
      totalOutputTokens: null,
    },
  };
}

function defaultApiSpendStore(): ApiSpendStore {
  return {
    schemaVersion: TELEMETRY_PERSISTENCE_SCHEMA_VERSION,
    ...createStoreTimestamps(),
    entries: [],
    rolling: { totalUsd: null, byCurrency: {} },
  };
}

async function loadTokenStoreResolved(
  cwd: string,
  createIfMissing: boolean,
): Promise<TokenUsageStore> {
  const filePath = telemetryStorePath(cwd, "token-usage");
  try {
    await stat(filePath);
  } catch {
    const initial = defaultTokenUsageStore();
    if (createIfMissing) await saveTelemetryStore(cwd, "token-usage", initial);
    return initial;
  }
  const raw: unknown = JSON.parse(await readFile(filePath, { encoding: "utf8" }));
  const migrated = migrateTokenUsageStore(raw);
  if (migrated) {
    if (createIfMissing && (raw as { schemaVersion?: number })?.schemaVersion === 1) {
      await saveTelemetryStore(cwd, "token-usage", migrated);
    }
    return migrated;
  }
  const initial = defaultTokenUsageStore();
  if (createIfMissing) await saveTelemetryStore(cwd, "token-usage", initial);
  return initial;
}

async function loadSpendStoreResolved(
  cwd: string,
  createIfMissing: boolean,
): Promise<ApiSpendStore> {
  const filePath = telemetryStorePath(cwd, "api-spend");
  try {
    await stat(filePath);
  } catch {
    const initial = defaultApiSpendStore();
    if (createIfMissing) await saveTelemetryStore(cwd, "api-spend", initial);
    return initial;
  }
  const raw: unknown = JSON.parse(await readFile(filePath, { encoding: "utf8" }));
  const migrated = migrateApiSpendStore(raw);
  if (migrated) {
    if (createIfMissing && (raw as { schemaVersion?: number })?.schemaVersion === 1) {
      await saveTelemetryStore(cwd, "api-spend", migrated);
    }
    return migrated;
  }
  const initial = defaultApiSpendStore();
  if (createIfMissing) await saveTelemetryStore(cwd, "api-spend", initial);
  return initial;
}

export async function readPersistedTokenStore(
  cwd = process.cwd(),
): Promise<TokenUsageStore | null> {
  if (!(await telemetryStoreExists(cwd, "token-usage"))) return null;
  return loadTokenStoreResolved(cwd, false);
}

export async function readPersistedSpendStore(
  cwd = process.cwd(),
): Promise<ApiSpendStore | null> {
  if (!(await telemetryStoreExists(cwd, "api-spend"))) return null;
  return loadSpendStoreResolved(cwd, false);
}

export type RecordTokenUsageInput = {
  tool: AIUsageTool;
  provider?: AIUsageProvider;
  source?: AIUsageSource;
  sourceMethod?: AIUsageSourceMethod;
  at?: string;
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
  model?: string | null;
  project?: string | null;
  estimated?: boolean;
  note?: string;
};

export async function recordTokenUsageEntry(
  input: RecordTokenUsageInput,
  cwd = process.cwd(),
): Promise<TokenUsageStore> {
  if (!isAIUsageTool(input.tool)) {
    throw new RangeError("recordTokenUsageEntry: invalid tool");
  }
  const source = input.source ?? "manual_entry";
  const sourceMethod =
    input.sourceMethod && isAIUsageSourceMethod(input.sourceMethod)
      ? input.sourceMethod
      : legacySourceToMethod(source);
  const provider =
    input.provider && isAIUsageProvider(input.provider)
      ? input.provider
      : defaultProviderForTool(input.tool);
  const totals = resolveTokenTotals(input);
  if (totals.totalTokens == null) {
    throw new RangeError(
      "recordTokenUsageEntry: provide totalTokens or input/output token counts",
    );
  }

  const store = await loadTokenStoreResolved(cwd, true);
  const entry = assignStableTokenRecord(
    {
      id: "pending",
      at: input.at ?? new Date().toISOString(),
      tool: input.tool,
      provider,
      source,
      sourceMethod,
      ...totals,
      model: input.model ?? null,
      project: input.project ?? null,
      estimated: input.estimated === true,
      ...(input.note ? { note: input.note } : {}),
    },
    undefined,
    input.note,
  );
  const index = await loadDedupeIndex(cwd);
  if (
    indexHasObservation(index, entry.id) ||
    store.entries.some((e) => e.id === entry.id)
  ) {
    registerObservation(index, {
      id: entry.id,
      kind: "token",
      firstSeenAt: entry.at,
      lastSeenAt: new Date().toISOString(),
    });
    await saveDedupeIndex(cwd, index);
    return store;
  }
  registerObservation(index, {
    id: entry.id,
    kind: "token",
    firstSeenAt: entry.at,
    lastSeenAt: new Date().toISOString(),
  });
  store.entries = trimUsageEntries([...store.entries, entry]);
  store.rolling = recomputeTokenRolling(store.entries);
  await saveDedupeIndex(cwd, index);
  await saveTelemetryStore(cwd, "token-usage", store);
  return store;
}

export type RecordSpendInput = {
  tool: AIUsageTool;
  provider?: AIUsageProvider;
  source?: AIUsageSource;
  sourceMethod?: AIUsageSourceMethod;
  amount: number;
  currency?: string;
  billingPeriod?: string | null;
  at?: string;
  estimated?: boolean;
  note?: string;
};

export async function recordSpendEntry(
  input: RecordSpendInput,
  cwd = process.cwd(),
): Promise<ApiSpendStore> {
  if (!isAIUsageTool(input.tool)) {
    throw new RangeError("recordSpendEntry: invalid tool");
  }
  const source = input.source ?? "manual_entry";
  const sourceMethod =
    input.sourceMethod && isAIUsageSourceMethod(input.sourceMethod)
      ? input.sourceMethod
      : legacySourceToMethod(source);
  if (!Number.isFinite(input.amount) || input.amount < 0) {
    throw new RangeError("recordSpendEntry: amount must be non-negative");
  }

  const store = await loadSpendStoreResolved(cwd, true);
  const entry = assignStableSpendRecord(
    {
      id: "pending",
      at: input.at ?? new Date().toISOString(),
      tool: input.tool,
      provider:
        input.provider && isAIUsageProvider(input.provider)
          ? input.provider
          : defaultProviderForTool(input.tool),
      source,
      sourceMethod,
      amount: Math.round(input.amount * 100) / 100,
      currency: (input.currency ?? "USD").toUpperCase(),
      billingPeriod: input.billingPeriod ?? null,
      estimated: input.estimated === true,
      ...(input.note ? { note: input.note } : {}),
    },
    input.note,
  );
  const index = await loadDedupeIndex(cwd);
  if (
    indexHasObservation(index, entry.id) ||
    store.entries.some((e) => e.id === entry.id)
  ) {
    registerObservation(index, {
      id: entry.id,
      kind: "spend",
      firstSeenAt: entry.at,
      lastSeenAt: new Date().toISOString(),
    });
    await saveDedupeIndex(cwd, index);
    return store;
  }
  registerObservation(index, {
    id: entry.id,
    kind: "spend",
    firstSeenAt: entry.at,
    lastSeenAt: new Date().toISOString(),
  });
  store.entries = trimUsageEntries([...store.entries, entry]);
  store.rolling = recomputeSpendRolling(store.entries);
  await saveDedupeIndex(cwd, index);
  await saveTelemetryStore(cwd, "api-spend", store);
  return store;
}

export async function importManualSpend(
  input: Omit<RecordSpendInput, "source"> & { source?: AIUsageSource },
  cwd = process.cwd(),
): Promise<ApiSpendStore> {
  return recordSpendEntry(
    { ...input, source: input.source ?? "manual_entry" },
    cwd,
  );
}

export async function importEstimatedTokenUsage(
  input: Omit<RecordTokenUsageInput, "source" | "estimated">,
  cwd = process.cwd(),
): Promise<TokenUsageStore> {
  return recordTokenUsageEntry(
    { ...input, source: "estimated", estimated: true },
    cwd,
  );
}

export async function importManualTokenUsage(
  input: Omit<RecordTokenUsageInput, "source"> & { source?: AIUsageSource },
  cwd = process.cwd(),
): Promise<TokenUsageStore> {
  return recordTokenUsageEntry(
    { ...input, source: input.source ?? "manual_entry" },
    cwd,
  );
}

/** @deprecated Prefer recordTokenUsageEntry with tool/source. */
export async function incrementTokenUsage(
  delta: number,
  cwd = process.cwd(),
  tool: AIUsageTool = "other",
): Promise<TokenUsageStore> {
  return recordTokenUsageEntry(
    {
      tool,
      sourceMethod: "invoice",
      totalTokens: delta,
      note: "incrementTokenUsage (legacy aggregate delta)",
    },
    cwd,
  );
}

/** @deprecated Prefer recordSpendEntry with tool/source. */
export async function incrementApiSpend(
  deltaUsd: number,
  cwd = process.cwd(),
  tool: AIUsageTool = "openai_api",
): Promise<ApiSpendStore> {
  return recordSpendEntry(
    {
      tool,
      sourceMethod: "invoice",
      amount: deltaUsd,
      note: "incrementApiSpend (legacy aggregate delta)",
    },
    cwd,
  );
}
