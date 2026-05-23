import { stat } from "fs/promises";
import path from "path";
import { sanitizeContinuityText } from "@/lib/encoding";
import {
  sanitizeContinuityEvent,
  sanitizeOperationalEvent,
} from "@/lib/encoding/pipeline";
import { readUtf8ContinuityJsonFile, writeUtf8ContinuityJson } from "@/lib/encoding/json-io";
import type { ArchivistConfig } from "@/lib/localData/archivist-config";
import { ALL_SECTOR_IDS } from "@/lib/operations/taxonomy";
import type { OperationalEvent, OperationalEventType } from "@/lib/operations/events";
import type {
  ContinuityStorageStats,
  OpsContinuitySignalRow,
} from "@/lib/ops/types";
import type { ContinuityEvent, ContinuityEventLog } from "./types";
import { CONTINUITY_EVENTS_VERSION } from "./types";

export type { ContinuityStorageStats, OpsContinuitySignalRow } from "@/lib/ops/types";

const OPERATIONAL_TYPES = new Set<OperationalEventType>([
  "file_changed",
  "markdown_changed",
  "code_changed",
  "package_detected",
  "git_detected",
  "build_started",
  "build_success",
  "build_failure",
  "deployment_signal",
  "runtime_signal",
  "semantic_milestone",
  "continuity_update",
]);

function eventsOutputPath(config: ArchivistConfig): string {
  const rel =
    config.eventsOutputRelative ?? "public/continuity-events.json";
  return path.join(config.cccProjectRoot, rel);
}

export function isOperationalEvent(e: unknown): e is OperationalEvent {
  if (!e || typeof e !== "object") return false;
  const o = e as Record<string, unknown>;
  if (typeof o.id !== "string" || typeof o.timestamp !== "string") return false;
  if (
    typeof o.sector !== "string" ||
    !ALL_SECTOR_IDS.includes(o.sector as OperationalEvent["sector"])
  )
    return false;
  if (!Array.isArray(o.sectors)) return false;
  if (!(o.type && OPERATIONAL_TYPES.has(o.type as OperationalEventType))) return false;
  if (o.severity !== "low" && o.severity !== "medium" && o.severity !== "high")
    return false;
  if (
    typeof o.confidence !== "number" ||
    o.confidence < 0 ||
    o.confidence > 1
  )
    return false;
  if (typeof o.source !== "string") return false;
  if (typeof o.project !== "string") return false;
  if (typeof o.summary !== "string") return false;
  if (!(o.metadata && typeof o.metadata === "object")) return false;
  if (!(o.filePath === null || typeof o.filePath === "string")) return false;
  for (const s of o.sectors as unknown[]) {
    if (typeof s !== "string" || !ALL_SECTOR_IDS.includes(s as OperationalEvent["sector"]))
      return false;
  }
  return true;
}

export function isContinuityEventLog(data: unknown): data is ContinuityEventLog {
  if (!data || typeof data !== "object") return false;
  const o = data as Record<string, unknown>;
  if (o.version !== 1 && o.version !== CONTINUITY_EVENTS_VERSION) return false;
  if (o.agent !== "ARCHIVIST-0") return false;
  if (typeof o.updatedAt !== "string") return false;
  if (!Array.isArray(o.events)) return false;
  if (!o.events.every(isContinuityEvent)) return false;
  if (o.operationalEvents !== undefined) {
    if (!Array.isArray(o.operationalEvents)) return false;
    if (!o.operationalEvents.every(isOperationalEvent)) return false;
  }
  return true;
}

function isContinuityEvent(e: unknown): e is ContinuityEvent {
  if (!e || typeof e !== "object") return false;
  const o = e as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.occurredAt === "string" &&
    typeof o.kind === "string" &&
    typeof o.title === "string" &&
    typeof o.summary === "string" &&
    Array.isArray(o.sectors) &&
    Array.isArray(o.operators) &&
    Array.isArray(o.projects)
  );
}

function emptyLog(): ContinuityEventLog {
  return {
    version: CONTINUITY_EVENTS_VERSION,
    updatedAt: new Date().toISOString(),
    agent: "ARCHIVIST-0",
    events: [],
    operationalEvents: [],
  };
}

function normalizeLog(log: ContinuityEventLog): ContinuityEventLog {
  return {
    ...log,
    operationalEvents: log.operationalEvents ?? [],
  };
}

export async function readContinuityEventLog(
  config: ArchivistConfig,
): Promise<ContinuityEventLog> {
  const filePath = eventsOutputPath(config);
  try {
    const data: unknown = await readUtf8ContinuityJsonFile(filePath);
    if (isContinuityEventLog(data))
      return normalizeLog(data as ContinuityEventLog);
  } catch {
    /* new file */
  }
  return emptyLog();
}

async function persistLog(config: ArchivistConfig, log: ContinuityEventLog): Promise<void> {
  const next: ContinuityEventLog = {
    ...normalizeLog(log),
    version: CONTINUITY_EVENTS_VERSION,
    updatedAt: new Date().toISOString(),
    agent: "ARCHIVIST-0",
    events: log.events,
    operationalEvents: log.operationalEvents ?? [],
  };
  const filePath = eventsOutputPath(config);
  await writeUtf8ContinuityJson(filePath, next);
}

function coalesceKey(e: ContinuityEvent): string {
  return `${e.kind}:${e.sectors[0] ?? ""}:${e.projects[0] ?? ""}`;
}

function coalesceEvents(
  existing: ContinuityEvent[],
  incoming: ContinuityEvent[],
  windowMs: number,
): ContinuityEvent[] {
  const merged = [...existing];
  const now = Date.now();

  for (const ev of incoming) {
    const key = coalesceKey(ev);
    const idx = merged.findIndex((e) => {
      if (coalesceKey(e) !== key) return false;
      if (e.importance !== ev.importance && ev.importance === "low") return false;
      const age = now - Date.parse(e.occurredAt);
      return age >= 0 && age <= windowMs;
    });

    if (idx >= 0 && ev.importance === "low" && ev.kind === "sector_activity") {
      const prev = merged[idx]!;
      merged[idx] = {
        ...prev,
        occurredAt: ev.occurredAt,
        summary: ev.summary,
        evidence: {
          ...prev.evidence,
          changeCount: prev.evidence.changeCount + ev.evidence.changeCount,
          totalScore: Math.max(prev.evidence.totalScore, ev.evidence.totalScore),
        },
      };
    } else {
      merged.unshift(ev);
    }
  }

  return merged;
}

function trimEvents(
  events: ContinuityEvent[],
  maxCount: number,
  maxAgeDays: number,
): ContinuityEvent[] {
  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  const filtered = events.filter((e) => {
    const t = Date.parse(e.occurredAt);
    return !Number.isNaN(t) && t >= cutoff;
  });
  filtered.sort(
    (a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt),
  );
  return filtered.slice(0, maxCount);
}

function trimOperationalEvents(
  operational: OperationalEvent[],
  maxCount: number,
  maxAgeDays: number,
): OperationalEvent[] {
  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  const filtered = operational.filter((e) => {
    const t = Date.parse(e.timestamp);
    return !Number.isNaN(t) && t >= cutoff;
  });
  filtered.sort(
    (a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp),
  );
  return filtered.slice(0, maxCount);
}

export async function appendContinuityEvents(
  config: ArchivistConfig,
  incoming: ContinuityEvent[],
): Promise<{ appended: number; total: number }> {
  const log = await readContinuityEventLog(config);

  if (incoming.length === 0) {
    return { appended: 0, total: log.events.length };
  }

  const windowMs = config.eventsCoalesceWindowMs ?? 120_000;
  const maxCount = config.eventsMaxCount ?? 400;
  const maxAgeDays = config.eventsMaxAgeDays ?? 90;

  const merged = coalesceEvents(
    log.events,
    incoming.map(sanitizeContinuityEvent),
    windowMs,
  );
  const trimmed = trimEvents(merged, maxCount, maxAgeDays);

  await persistLog(config, {
    ...log,
    events: trimmed,
    operationalEvents: log.operationalEvents ?? [],
  });

  return { appended: incoming.length, total: trimmed.length };
}

export async function appendOperationalEvents(
  config: ArchivistConfig,
  incoming: OperationalEvent[],
): Promise<{ appended: number; total: number }> {
  const log = await readContinuityEventLog(config);

  if (incoming.length === 0) {
    return { appended: 0, total: log.operationalEvents?.length ?? 0 };
  }

  const maxCount = config.operationalEventsMaxCount ?? 250;
  const maxAgeDays = config.operationalEventsMaxAgeDays ?? config.eventsMaxAgeDays ?? 90;

  const prev = log.operationalEvents ?? [];
  const merged = [...incoming.map(sanitizeOperationalEvent), ...prev];
  const trimmed = trimOperationalEvents(merged, maxCount, maxAgeDays);

  await persistLog(config, {
    ...log,
    operationalEvents: trimmed,
  });

  return { appended: incoming.length, total: trimmed.length };
}

export async function readContinuityEventsFromDisk(
  cwd = process.cwd(),
): Promise<ContinuityEvent[]> {
  if (typeof window !== "undefined") return [];

  try {
    const filePath = path.join(cwd, "public", "continuity-events.json");
    const data: unknown = await readUtf8ContinuityJsonFile(filePath);
    if (isContinuityEventLog(data)) return data.events;
  } catch {
    /* missing */
  }
  return [];
}

export async function readOperationalEventsFromDisk(
  cwd = process.cwd(),
): Promise<OperationalEvent[]> {
  if (typeof window !== "undefined") return [];

  try {
    const filePath = path.join(cwd, "public", "continuity-events.json");
    const data: unknown = await readUtf8ContinuityJsonFile(filePath);
    if (isContinuityEventLog(data)) return data.operationalEvents ?? [];
  } catch {
    /* missing */
  }
  return [];
}

function opsRowFromOperational(e: OperationalEvent): OpsContinuitySignalRow {
  const v = e.metadata.semanticMeaning;
  const meaning =
    typeof v === "string" && v.trim()
      ? sanitizeContinuityText(v.replace(/_/g, " "))
      : "-";
  return {
    id: e.id,
    timestamp: e.timestamp,
    project: sanitizeContinuityText(e.project),
    sector: e.sector,
    meaning,
    severity: e.severity,
    summary: sanitizeContinuityText(e.summary),
  };
}

function opsRowFromContinuity(e: ContinuityEvent): OpsContinuitySignalRow {
  return {
    id: e.id,
    timestamp: e.occurredAt,
    project: sanitizeContinuityText(e.projects[0] ?? "-"),
    sector: e.sectors[0] ?? "-",
    meaning: sanitizeContinuityText(e.kind.replace(/_/g, " ")),
    severity: e.importance,
    summary: sanitizeContinuityText(e.summary),
  };
}

/**
 * Prefer normalized operational events when present; otherwise continuity rail `events`.
 * Same nullish semantics as `operationalEvents ?? events` on the log object.
 */
export function continuitySignalRowsFromLog(log: ContinuityEventLog): OpsContinuitySignalRow[] {
  const raw = log.operationalEvents ?? log.events;
  if (!raw.length) return [];
  const first = raw[0];
  if (first && typeof first === "object" && "occurredAt" in first) {
    return (raw as ContinuityEvent[]).map(opsRowFromContinuity);
  }
  return (raw as OperationalEvent[]).map(opsRowFromOperational);
}

export async function readContinuitySignalsForOpsFromDisk(
  cwd = process.cwd(),
): Promise<OpsContinuitySignalRow[]> {
  if (typeof window !== "undefined") return [];

  try {
    const filePath = path.join(cwd, "public", "continuity-events.json");
    const data: unknown = await readUtf8ContinuityJsonFile(filePath);
    if (!isContinuityEventLog(data)) return [];
    return continuitySignalRowsFromLog(data);
  } catch {
    /* missing */
  }
  return [];
}

export async function readContinuityStorageStatsFromDisk(
  cwd = process.cwd(),
): Promise<ContinuityStorageStats> {
  const empty: ContinuityStorageStats = {
    eventsFileBytes: 0,
    snapshotFileBytes: 0,
    totalBytes: 0,
    logUpdatedAt: null,
    railEventCount: 0,
    operationalEventCount: 0,
    snapshotGeneratedAt: null,
    snapshotUpdatedAt: null,
  };

  if (typeof window !== "undefined") return empty;

  const eventsPath = path.join(cwd, "public", "continuity-events.json");
  const snapshotPath = path.join(cwd, "public", "continuity-snapshot.json");

  let eventsFileBytes = 0;
  let snapshotFileBytes = 0;
  try {
    eventsFileBytes = (await stat(eventsPath)).size;
  } catch {
    /* missing */
  }
  try {
    snapshotFileBytes = (await stat(snapshotPath)).size;
  } catch {
    /* missing */
  }

  let logUpdatedAt: string | null = null;
  let railEventCount = 0;
  let operationalEventCount = 0;
  try {
    const data: unknown = await readUtf8ContinuityJsonFile(eventsPath);
    if (data && typeof data === "object") {
      const o = data as Record<string, unknown>;
      logUpdatedAt = typeof o.updatedAt === "string" ? o.updatedAt : null;
      if (Array.isArray(o.events)) railEventCount = o.events.length;
      if (Array.isArray(o.operationalEvents))
        operationalEventCount = o.operationalEvents.length;
    }
  } catch {
    /* malformed or missing */
  }

  let snapshotGeneratedAt: string | null = null;
  let snapshotUpdatedAt: string | null = null;
  try {
    const data: unknown = await readUtf8ContinuityJsonFile(snapshotPath);
    if (data && typeof data === "object") {
      const o = data as Record<string, unknown>;
      snapshotGeneratedAt =
        typeof o.generatedAt === "string" ? o.generatedAt : null;
      snapshotUpdatedAt =
        typeof o.updatedAt === "string" ? o.updatedAt : null;
    }
  } catch {
    /* malformed or missing */
  }

  return {
    eventsFileBytes,
    snapshotFileBytes,
    totalBytes: eventsFileBytes + snapshotFileBytes,
    logUpdatedAt,
    railEventCount,
    operationalEventCount,
    snapshotGeneratedAt,
    snapshotUpdatedAt,
  };
}
