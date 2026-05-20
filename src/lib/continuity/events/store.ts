import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { ArchivistConfig } from "@/lib/localData/archivist-config";
import { ALL_SECTOR_IDS } from "@/lib/operations/taxonomy";
import type { OperationalEvent, OperationalEventType } from "@/lib/operations/events";
import type { ContinuityEvent, ContinuityEventLog } from "./types";
import { CONTINUITY_EVENTS_VERSION } from "./types";

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
    const raw = await readFile(filePath, "utf-8");
    const data: unknown = JSON.parse(raw);
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
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(next, null, 2)}\n`, "utf-8");
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

  const merged = coalesceEvents(log.events, incoming, windowMs);
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
  const merged = [...incoming, ...prev];
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
    const { readFile: rf } = await import("fs/promises");
    const filePath = path.join(cwd, "public", "continuity-events.json");
    const raw = await rf(filePath, "utf-8");
    const data: unknown = JSON.parse(raw);
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
    const { readFile: rf } = await import("fs/promises");
    const filePath = path.join(cwd, "public", "continuity-events.json");
    const raw = await rf(filePath, "utf-8");
    const data: unknown = JSON.parse(raw);
    if (isContinuityEventLog(data)) return data.operationalEvents ?? [];
  } catch {
    /* missing */
  }
  return [];
}

/** Flattened row for /ops “Recent Continuity Signals” (operational or rail events) */
export interface OpsContinuitySignalRow {
  id: string;
  timestamp: string;
  project: string;
  sector: string;
  meaning: string;
  severity: string;
  summary: string;
}

function opsRowFromOperational(e: OperationalEvent): OpsContinuitySignalRow {
  const v = e.metadata.semanticMeaning;
  const meaning =
    typeof v === "string" && v.trim() ? v.replace(/_/g, " ") : "—";
  return {
    id: e.id,
    timestamp: e.timestamp,
    project: e.project,
    sector: e.sector,
    meaning,
    severity: e.severity,
    summary: e.summary,
  };
}

function opsRowFromContinuity(e: ContinuityEvent): OpsContinuitySignalRow {
  return {
    id: e.id,
    timestamp: e.occurredAt,
    project: e.projects[0] ?? "—",
    sector: e.sectors[0] ?? "—",
    meaning: e.kind.replace(/_/g, " "),
    severity: e.importance,
    summary: e.summary,
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
    const { readFile: rf } = await import("fs/promises");
    const filePath = path.join(cwd, "public", "continuity-events.json");
    const raw = await rf(filePath, "utf-8");
    const data: unknown = JSON.parse(raw);
    if (!isContinuityEventLog(data)) return [];
    return continuitySignalRowsFromLog(data);
  } catch {
    /* missing */
  }
  return [];
}
