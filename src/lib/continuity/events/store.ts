import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { ArchivistConfig } from "@/lib/localData/archivist-config";
import type { ContinuityEvent, ContinuityEventLog } from "./types";
import { CONTINUITY_EVENTS_VERSION } from "./types";

function eventsOutputPath(config: ArchivistConfig): string {
  const rel =
    config.eventsOutputRelative ?? "public/continuity-events.json";
  return path.join(config.cccProjectRoot, rel);
}

export function isContinuityEventLog(data: unknown): data is ContinuityEventLog {
  if (!data || typeof data !== "object") return false;
  const o = data as Record<string, unknown>;
  if (o.version !== CONTINUITY_EVENTS_VERSION) return false;
  if (o.agent !== "ARCHIVIST-0") return false;
  if (typeof o.updatedAt !== "string") return false;
  if (!Array.isArray(o.events)) return false;
  return o.events.every(isContinuityEvent);
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
  };
}

export async function readContinuityEventLog(
  config: ArchivistConfig,
): Promise<ContinuityEventLog> {
  const filePath = eventsOutputPath(config);
  try {
    const raw = await readFile(filePath, "utf-8");
    const data: unknown = JSON.parse(raw);
    if (isContinuityEventLog(data)) return data;
  } catch {
    /* new file */
  }
  return emptyLog();
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

export async function appendContinuityEvents(
  config: ArchivistConfig,
  incoming: ContinuityEvent[],
): Promise<{ appended: number; total: number }> {
  if (incoming.length === 0) {
    const log = await readContinuityEventLog(config);
    return { appended: 0, total: log.events.length };
  }

  const log = await readContinuityEventLog(config);
  const windowMs = config.eventsCoalesceWindowMs ?? 120_000;
  const maxCount = config.eventsMaxCount ?? 400;
  const maxAgeDays = config.eventsMaxAgeDays ?? 90;

  const merged = coalesceEvents(log.events, incoming, windowMs);
  const trimmed = trimEvents(merged, maxCount, maxAgeDays);

  const next: ContinuityEventLog = {
    version: CONTINUITY_EVENTS_VERSION,
    updatedAt: new Date().toISOString(),
    agent: "ARCHIVIST-0",
    events: trimmed,
  };

  const filePath = eventsOutputPath(config);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(next, null, 2)}\n`, "utf-8");

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
