import {
  isSnapshotManifestRef,
  isSnapshotScanMeta,
  isSupportedContinuitySnapshotSchemaVersion,
} from "@/lib/substrate/snapshot-schema";
import type { ContinuitySnapshot } from "./types";

/** Shape validation — does not require schemaVersion (legacy compatible). */
export function isContinuitySnapshotShape(data: unknown): data is ContinuitySnapshot {
  if (!data || typeof data !== "object") return false;
  const o = data as Record<string, unknown>;
  if (o.agent !== "ARCHIVIST-0") return false;
  if (typeof o.generatedAt !== "string") return false;
  if (!Array.isArray(o.projects)) return false;
  if (!o.sectorHeat || typeof o.sectorHeat !== "object") return false;
  if (!Array.isArray(o.operators)) return false;
  if (!Array.isArray(o.signals)) return false;
  if (o.operationalSignals !== undefined && !Array.isArray(o.operationalSignals)) {
    return false;
  }
  return true;
}

/** Legacy snapshot: written before schemaVersion was introduced. */
export function isLegacyContinuitySnapshot(snapshot: ContinuitySnapshot): boolean {
  return snapshot.schemaVersion === undefined;
}

/**
 * Parse and validate a continuity snapshot from JSON.
 * Returns null for invalid shape or unsupported schemaVersion.
 */
export function parseContinuitySnapshot(data: unknown): ContinuitySnapshot | null {
  if (!isContinuitySnapshotShape(data)) return null;

  const o = data as unknown as Record<string, unknown>;
  if (!isSupportedContinuitySnapshotSchemaVersion(o.schemaVersion)) return null;
  if (o.manifestRef !== undefined && !isSnapshotManifestRef(o.manifestRef)) return null;
  if (o.scan !== undefined && !isSnapshotScanMeta(o.scan)) return null;

  return data as ContinuitySnapshot;
}
