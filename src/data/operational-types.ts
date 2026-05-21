import type { SectorId, SystemStatus } from "./types";
import type { ContinuityEventView } from "@/lib/continuity/events/types";
import type { ActivityKind, ActivityLevel, OperatorState } from "@/lib/operations/taxonomy";

/** Client-safe operational snapshot — no filesystem paths */

export interface ClassifiedSignalView {
  id: string;
  kind: ActivityKind;
  label: string;
  value: string;
  projectId: string;
}

export interface ProjectOperationalView {
  projectId: string;
  canonicalName: string;
  detected: boolean;
  activityScore: number;
  activityLevel: ActivityLevel;
  topSignal: string | null;
  sectors: SectorId[];
  category: string;
  continuityPriority: number;
}

export interface SectorHeatView {
  sectorId: SectorId;
  activityScore: number;
  continuityWeight: number;
  operationalLoad: number;
  activityLevel: ActivityLevel;
  status: SystemStatus;
  dominantActivity: string | null;
}

export interface OperatorOperationalView {
  operatorId: string;
  callsign: string;
  currentAssignment: string;
  activeProjectId: string | null;
  activeProjectName: string | null;
  operationalState: OperatorState;
  workload: number;
  currentActivity: string;
  status: SystemStatus;
  lastSignal: string | null;
}

export interface DerivedTelemetryView {
  id: string;
  label: string;
  value: string;
  hint?: string;
}

export interface SnapshotMeta {
  generatedAt: string;
  agent: string;
  scanRoots: { id: string; accessible: boolean; projectCount: number }[];
  projectCount: number;
  /** Indexed markdown corpus scale across archived projects */
  totalMarkdownFiles: number;
  /** Frozen snapshot artifact size when instrumentation provides it */
  snapshotSizeBytes?: number;
  eventsFileBytes?: number;
  eventsRecordCount?: number;
}

export interface OperationalSnapshot {
  enabled: boolean;
  label: string;
  scannedAt: string;
  source: "local" | "mock" | "archivist";
  projects: ProjectOperationalView[];
  sectorHeat: SectorHeatView[];
  operators: OperatorOperationalView[];
  telemetry: DerivedTelemetryView[];
  signals: ClassifiedSignalView[];
  systemStatus: SystemStatus;
  message?: string;
  snapshotMeta?: SnapshotMeta;
  /** Recent reality-derived continuity events (newest first) */
  continuityEvents?: ContinuityEventView[];
}
