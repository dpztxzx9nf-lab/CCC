import { createHash } from "crypto";
import { readFile, stat } from "fs/promises";
import path from "path";
import type {
  AIUsageProvider,
  AIUsageSourceMethod,
  AIUsageTool,
  AISpendRecord,
  AITokenUsageRecord,
} from "../aiUsage";
import { legacySourceToMethod, resolveTokenTotals } from "../aiUsage";
import type { IngestionAdapterId } from "./types";
import { writeJsonAtomic } from "../persistence/io";
import { TELEMETRY_DATA_DIR } from "../persistence/paths";

export type ObservationKind =
  | "token"
  | "spend"
  | "deployment"
  | "runtime"
  | "export"
  | "invoice";

export const DEDUPE_INDEX_SCHEMA_VERSION = 1 as const;

export interface DedupeObservationMeta {
  id: string;
  kind: ObservationKind;
  adapterId?: IngestionAdapterId;
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface DedupeIngestionCounters {
  lastRunAt: string | null;
  lastSkippedDuplicates: number;
  lastIngestedTokenEntries: number;
  lastIngestedSpendEntries: number;
  totalRuns: number;
  totalSkippedDuplicates: number;
  totalIngestedTokenEntries: number;
  totalIngestedSpendEntries: number;
}

export interface DedupeIndexStore {
  schemaVersion: typeof DEDUPE_INDEX_SCHEMA_VERSION;
  createdAt: string;
  updatedAt: string;
  observations: Record<string, DedupeObservationMeta>;
  ingestion: DedupeIngestionCounters;
}

export interface DedupeApplyStats {
  ingestedTokenEntries: number;
  ingestedSpendEntries: number;
  skippedDuplicates: number;
  skippedToken: number;
  skippedSpend: number;
  skippedRuntime: number;
  indexSize: number;
}

function nowIso(): string {
  return new Date().toISOString();
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(o).sort()) {
      const v = o[key];
      if (v !== undefined) sorted[key] = sortValue(v);
    }
    return sorted;
  }
  return value;
}

function canonicalPayload(payload: Record<string, unknown>): string {
  return JSON.stringify(sortValue(payload));
}

/** Deterministic observation id from semantic content (never random). */
export function stableObservationId(
  kind: ObservationKind,
  payload: Record<string, unknown>,
): string {
  const hash = createHash("sha256")
    .update(canonicalPayload({ kind, ...payload }))
    .digest("hex")
    .slice(0, 24);
  return `${kind}:${hash}`;
}

/** Normalize timestamps to UTC day for API daily aggregates. */
export function normalizeObservationDay(at: string | undefined): string {
  if (!at) return new Date().toISOString().slice(0, 10);
  const parsed = Date.parse(at);
  if (Number.isFinite(parsed)) {
    return new Date(parsed).toISOString().slice(0, 10);
  }
  return at.slice(0, 10);
}

export function stableTokenObservationId(input: {
  tool: AIUsageTool;
  provider: AIUsageProvider;
  sourceMethod: AIUsageSourceMethod;
  at?: string;
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
  model?: string | null;
  project?: string | null;
  estimated?: boolean;
  contentRef?: string;
}): string {
  const totals = resolveTokenTotals(input);
  const day = normalizeObservationDay(input.at);
  return stableObservationId("token", {
    provider: input.provider,
    tool: input.tool,
    source: input.sourceMethod,
    period: day,
    input: totals.inputTokens,
    output: totals.outputTokens,
    total: totals.totalTokens,
    model: input.model ?? null,
    project: input.project ?? null,
    estimated: input.estimated === true,
    ref: input.contentRef ?? null,
  });
}

export function stableSpendObservationId(input: {
  tool: AIUsageTool;
  provider: AIUsageProvider;
  sourceMethod: AIUsageSourceMethod;
  amount: number;
  currency: string;
  billingPeriod?: string | null;
  at?: string;
  estimated?: boolean;
  contentRef?: string;
}): string {
  const period =
    input.billingPeriod?.trim() ||
    normalizeObservationDay(input.at);
  return stableObservationId("spend", {
    provider: input.provider,
    tool: input.tool,
    source: input.sourceMethod,
    period,
    amount: Math.round(input.amount * 100) / 100,
    currency: input.currency.toUpperCase(),
    estimated: input.estimated === true,
    ref: input.contentRef ?? null,
  });
}

export function stableDeploymentObservationId(input: {
  provider: string;
  period: string;
  amount: number;
  currency: string;
  contentRef?: string;
}): string {
  return stableObservationId("deployment", {
    provider: input.provider,
    period: input.period,
    amount: Math.round(input.amount * 100) / 100,
    currency: input.currency.toUpperCase(),
    ref: input.contentRef ?? null,
  });
}

export function stableRuntimeObservationId(input: {
  pm2Available: boolean;
  processSignature: string;
}): string {
  return stableObservationId("runtime", {
    pm2: input.pm2Available,
    processes: input.processSignature,
  });
}

export function stableExportObservationId(input: {
  filePath: string;
  contentHash: string;
  kind: "token" | "spend";
}): string {
  return stableObservationId("export", {
    file: path.basename(input.filePath).toLowerCase(),
    hash: input.contentHash,
    row: input.kind,
  });
}

export function stableInvoiceObservationId(input: {
  filePath: string;
  tool: AIUsageTool;
  amount: number;
  currency: string;
  billingPeriod: string | null;
}): string {
  return stableObservationId("invoice", {
    file: path.basename(input.filePath).toLowerCase(),
    tool: input.tool,
    amount: Math.round(input.amount * 100) / 100,
    currency: input.currency.toUpperCase(),
    period: input.billingPeriod,
  });
}

export function runtimeProcessSignature(
  processes: { name: string; pmId: number | null; status: string }[],
): string {
  return processes
    .map((p) => `${p.name}:${p.pmId ?? "na"}:${p.status}`)
    .sort()
    .join("|");
}

export async function hashFileContent(filePath: string): Promise<string> {
  const raw = await readFile(filePath);
  return createHash("sha256").update(raw).digest("hex").slice(0, 16);
}

export function dedupeIndexPath(cwd: string): string {
  return path.join(cwd, TELEMETRY_DATA_DIR, "dedupe-index.json");
}

function defaultDedupeIndex(): DedupeIndexStore {
  const at = nowIso();
  return {
    schemaVersion: DEDUPE_INDEX_SCHEMA_VERSION,
    createdAt: at,
    updatedAt: at,
    observations: {},
    ingestion: {
      lastRunAt: null,
      lastSkippedDuplicates: 0,
      lastIngestedTokenEntries: 0,
      lastIngestedSpendEntries: 0,
      totalRuns: 0,
      totalSkippedDuplicates: 0,
      totalIngestedTokenEntries: 0,
      totalIngestedSpendEntries: 0,
    },
  };
}

function isDedupeIndexStore(value: unknown): value is DedupeIndexStore {
  if (!value || typeof value !== "object") return false;
  const o = value as DedupeIndexStore;
  return (
    o.schemaVersion === DEDUPE_INDEX_SCHEMA_VERSION &&
    typeof o.createdAt === "string" &&
    typeof o.updatedAt === "string" &&
    !!o.observations &&
    typeof o.observations === "object" &&
    !!o.ingestion
  );
}

export async function loadDedupeIndex(cwd: string): Promise<DedupeIndexStore> {
  const filePath = dedupeIndexPath(cwd);
  try {
    await stat(filePath);
  } catch {
    return defaultDedupeIndex();
  }
  try {
    const raw = await readFile(filePath, { encoding: "utf8" });
    const parsed: unknown = JSON.parse(raw.trim());
    if (isDedupeIndexStore(parsed)) return parsed;
  } catch {
    /* rebuild below */
  }
  return defaultDedupeIndex();
}

export async function saveDedupeIndex(
  cwd: string,
  index: DedupeIndexStore,
): Promise<void> {
  const next: DedupeIndexStore = {
    ...index,
    updatedAt: nowIso(),
  };
  await writeJsonAtomic(dedupeIndexPath(cwd), next);
}

export function indexHasObservation(
  index: DedupeIndexStore,
  observationId: string,
): boolean {
  return Object.prototype.hasOwnProperty.call(index.observations, observationId);
}

export function registerObservation(
  index: DedupeIndexStore,
  meta: DedupeObservationMeta,
): void {
  const existing = index.observations[meta.id];
  if (existing) {
    index.observations[meta.id] = {
      ...existing,
      lastSeenAt: meta.lastSeenAt,
      adapterId: meta.adapterId ?? existing.adapterId,
    };
    return;
  }
  index.observations[meta.id] = meta;
}

export function pruneDedupeIndex(
  index: DedupeIndexStore,
  activeIds: Set<string>,
): number {
  let removed = 0;
  for (const id of Object.keys(index.observations)) {
    if (!activeIds.has(id)) {
      delete index.observations[id];
      removed += 1;
    }
  }
  return removed;
}

export function rebuildIndexFromStores(
  index: DedupeIndexStore,
  tokens: AITokenUsageRecord[],
  spend: AISpendRecord[],
  runtimeId: string | null,
): void {
  const at = nowIso();
  for (const e of tokens) {
    const id =
      e.id ||
      stableTokenObservationId({
        tool: e.tool,
        provider: e.provider,
        sourceMethod: e.sourceMethod ?? legacySourceToMethod(e.source),
        at: e.at,
        inputTokens: e.inputTokens,
        outputTokens: e.outputTokens,
        totalTokens: e.totalTokens,
        model: e.model,
        project: e.project,
        estimated: e.estimated,
      });
    registerObservation(index, {
      id,
      kind: "token",
      firstSeenAt: e.at,
      lastSeenAt: at,
    });
  }
  for (const e of spend) {
    const id =
      e.id ||
      stableSpendObservationId({
        tool: e.tool,
        provider: e.provider,
        sourceMethod: e.sourceMethod ?? legacySourceToMethod(e.source),
        amount: e.amount,
        currency: e.currency,
        billingPeriod: e.billingPeriod,
        at: e.at,
        estimated: e.estimated,
      });
    registerObservation(index, {
      id,
      kind: "spend",
      firstSeenAt: e.at,
      lastSeenAt: at,
    });
  }
  if (runtimeId) {
    registerObservation(index, {
      id: runtimeId,
      kind: "runtime",
      adapterId: "pm2_runtime",
      firstSeenAt: at,
      lastSeenAt: at,
    });
  }
}

export function assignStableTokenRecord(
  raw: AITokenUsageRecord,
  _adapterId?: IngestionAdapterId,
  contentRef?: string,
): AITokenUsageRecord {
  const sourceMethod = raw.sourceMethod ?? legacySourceToMethod(raw.source);
  const id = stableTokenObservationId({
    tool: raw.tool,
    provider: raw.provider,
    sourceMethod,
    at: raw.at,
    inputTokens: raw.inputTokens,
    outputTokens: raw.outputTokens,
    totalTokens: raw.totalTokens,
    model: raw.model,
    project: raw.project,
    estimated: raw.estimated,
    contentRef: contentRef ?? raw.note,
  });
  const day = normalizeObservationDay(raw.at);
  return {
    ...raw,
    id,
    sourceMethod,
    at: sourceMethod === "api" ? `${day}T12:00:00.000Z` : raw.at,
  };
}

export function assignStableSpendRecord(
  raw: AISpendRecord,
  contentRef?: string,
): AISpendRecord {
  const sourceMethod = raw.sourceMethod ?? legacySourceToMethod(raw.source);
  const id = stableSpendObservationId({
    tool: raw.tool,
    provider: raw.provider,
    sourceMethod,
    amount: raw.amount,
    currency: raw.currency,
    billingPeriod: raw.billingPeriod,
    at: raw.at,
    estimated: raw.estimated,
    contentRef: contentRef ?? raw.note,
  });
  return { ...raw, id, sourceMethod };
}
