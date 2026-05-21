import {
  readContinuitySignalsForOpsFromDisk,
  readContinuityStorageStatsFromDisk,
  type ContinuityStorageStats,
  type OpsContinuitySignalRow,
} from "@/lib/continuity/events/store";
import {
  gatherOperationalTelemetry,
  type OperationalTelemetry,
} from "@/lib/telemetry";

export interface OpsPortalBundle {
  recentSignals: OpsContinuitySignalRow[];
  storageStats: ContinuityStorageStats;
  facilityTelemetry: OperationalTelemetry;
}

export async function loadOpsPortalBundle(): Promise<OpsPortalBundle> {
  const [allRows, storageStats, facilityTelemetry] = await Promise.all([
    readContinuitySignalsForOpsFromDisk(),
    readContinuityStorageStatsFromDisk(),
    gatherOperationalTelemetry(),
  ]);

  return {
    recentSignals: allRows.slice(0, 10),
    storageStats,
    facilityTelemetry,
  };
}
