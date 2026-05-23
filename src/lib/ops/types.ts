import type { OperationalTelemetry } from "@/lib/telemetry/types";

/** Client-safe row for /ops “Recent Continuity Signals”. */
export interface OpsContinuitySignalRow {
  id: string;
  timestamp: string;
  project: string;
  sector: string;
  meaning: string;
  severity: string;
  summary: string;
}

/** Client-safe storage stats for public continuity JSON artifacts. */
export interface ContinuityStorageStats {
  eventsFileBytes: number;
  snapshotFileBytes: number;
  totalBytes: number;
  logUpdatedAt: string | null;
  railEventCount: number;
  operationalEventCount: number;
  snapshotGeneratedAt: string | null;
  snapshotUpdatedAt: string | null;
}

export interface OpsPortalBundle {
  recentSignals: OpsContinuitySignalRow[];
  storageStats: ContinuityStorageStats;
  facilityTelemetry: OperationalTelemetry;
}
