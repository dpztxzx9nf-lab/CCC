import type { SectorId } from "@/data/types";

/** Primary sector for an operational event (alias for domain/sector vocabulary) */
export type OperationalSector = SectorId;

export type OperationalEventSeverity = "low" | "medium" | "high";

export type OperationalEventType =
  | "file_changed"
  | "markdown_changed"
  | "code_changed"
  | "package_detected"
  | "git_detected"
  | "build_started"
  | "build_success"
  | "build_failure"
  | "deployment_signal"
  | "runtime_signal"
  | "semantic_milestone"
  | "continuity_update";

export type OperationalEventSource =
  | "archivist:watcher"
  | "archivist:deploy"
  | "archivist:build"
  | "archivist:snapshot"
  | "manual";

/** Normalized unit of local operational activity for continuity + snapshot projection */
export interface OperationalEvent {
  id: string;
  type: OperationalEventType;
  /** Primary sector for projection weighting */
  sector: OperationalSector;
  /** Optional multi-sector hints (e.g. core + forge) */
  sectors: OperationalSector[];
  severity: OperationalEventSeverity;
  /** 0–1 — heuristic confidence, not model probability */
  confidence: number;
  timestamp: string;
  source: OperationalEventSource;
  /** Stable project key or display slug */
  project: string;
  filePath: string | null;
  summary: string;
  metadata: Record<string, unknown>;
}

export const OPERATIONAL_EVENTS_LOG_KEY = "operationalEvents" as const;
