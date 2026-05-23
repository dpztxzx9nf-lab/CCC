import {
  readContinuitySignalsForOpsFromDisk,
  readContinuityStorageStatsFromDisk,
} from "@/lib/continuity/events/store";
import { gatherOperationalTelemetry } from "@/lib/telemetry";
import type { OpsPortalBundle } from "./types";

export type { OpsPortalBundle } from "./types";

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
