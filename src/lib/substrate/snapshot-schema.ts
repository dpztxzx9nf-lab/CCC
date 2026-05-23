/** Continuity snapshot schema — Phase 0 */

export const CONTINUITY_SNAPSHOT_SCHEMA_VERSION = 1 as const;

export type ContinuitySnapshotSchemaVersion =
  typeof CONTINUITY_SNAPSHOT_SCHEMA_VERSION;

/** Registry file version at snapshot generation time (manifest v2 uses 2). */
export type ManifestSchemaVersion = 1 | 2;

export interface SnapshotManifestRef {
  manifestSchemaVersion: ManifestSchemaVersion;
  manifestUpdatedAt: string;
}

export type SnapshotScanMode = "full";

export interface SnapshotScanMeta {
  mode: SnapshotScanMode;
  hostId?: string;
}

export function isSupportedContinuitySnapshotSchemaVersion(
  value: unknown,
): value is ContinuitySnapshotSchemaVersion | undefined {
  return value === undefined || value === CONTINUITY_SNAPSHOT_SCHEMA_VERSION;
}

export function isSnapshotManifestRef(value: unknown): value is SnapshotManifestRef {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  return (
    (o.manifestSchemaVersion === 1 || o.manifestSchemaVersion === 2) &&
    typeof o.manifestUpdatedAt === "string" &&
    o.manifestUpdatedAt.length > 0
  );
}

export function isSnapshotScanMeta(value: unknown): value is SnapshotScanMeta {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  if (o.mode !== "full") return false;
  if (o.hostId !== undefined && typeof o.hostId !== "string") return false;
  return true;
}
