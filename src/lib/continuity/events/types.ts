import type { SectorId } from "@/data/types";
import type { SignificanceLevel } from "@/lib/localData/archivist-config";
import type { OperatorId } from "@/lib/operations/taxonomy";
import type { OperationalEvent } from "@/lib/operations/events";

/** Reality-derived operational event kinds — not narrative quests */
export type ContinuityEventKind =
  | "sector_activity"
  | "edit_wave"
  | "snapshot_refresh"
  | "deploy_published"
  | "deploy_blocked"
  | "infrastructure_change"
  | "archive_consolidation"
  | "observatory_scan"
  | "runtime_signal";

export type EventImportance = "low" | "medium" | "high" | "critical";

export type ContinuityEventSource = "archivist" | "manual";

export interface ContinuityEventEvidence {
  changeCount: number;
  totalScore: number;
  lockfileOnly: boolean;
  snapshotWritten?: boolean;
  deployCommit?: string | null;
  deploySkippedReason?: string | null;
}

/** Single persisted continuity event */
export interface ContinuityEvent {
  id: string;
  occurredAt: string;
  kind: ContinuityEventKind;
  importance: EventImportance;
  title: string;
  summary: string;
  sectors: SectorId[];
  operators: OperatorId[];
  projects: string[];
  source: ContinuityEventSource;
  significance: SignificanceLevel;
  evidence: ContinuityEventEvidence;
}

export const CONTINUITY_EVENTS_VERSION = 2 as const;

export type ContinuityEventLogVersion =
  | typeof CONTINUITY_EVENTS_VERSION
  /** Legacy log shape — still readable */
  | 1;

export interface ContinuityEventLog {
  version: ContinuityEventLogVersion;
  updatedAt: string;
  agent: "ARCHIVIST-0";
  events: ContinuityEvent[];
  /** Normalized ARCHIVIST / local activity (optional until first writer migrate) */
  operationalEvents?: OperationalEvent[];
}

/** Client-safe view (no internal paths) */
export interface ContinuityEventView {
  id: string;
  occurredAt: string;
  kind: ContinuityEventKind;
  importance: EventImportance;
  title: string;
  summary: string;
  sectors: SectorId[];
  operators: OperatorId[];
  projects: string[];
  source: ContinuityEventSource;
}

export function toContinuityEventView(event: ContinuityEvent): ContinuityEventView {
  return {
    id: event.id,
    occurredAt: event.occurredAt,
    kind: event.kind,
    importance: event.importance,
    title: event.title,
    summary: event.summary,
    sectors: event.sectors,
    operators: event.operators,
    projects: event.projects,
    source: event.source,
  };
}
