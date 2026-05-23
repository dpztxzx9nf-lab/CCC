export {
  CONTINUITY_SNAPSHOT_SCHEMA_VERSION,
  isSnapshotManifestRef,
  isSnapshotScanMeta,
  isSupportedContinuitySnapshotSchemaVersion,
  type ContinuitySnapshotSchemaVersion,
  type ManifestSchemaVersion,
  type SnapshotManifestRef,
  type SnapshotScanMeta,
  type SnapshotScanMode,
} from "./snapshot-schema";

export {
  buildManifestRefFromRegistry,
} from "./manifest-ref";

export type { ProjectIdentity } from "./project-identity";

export type {
  NormalizedSignal,
  NormalizedSignalSeverity,
  SignalSectorProjection,
  SignalSectorRoutingRule,
  SignalSource,
} from "./normalized-signal";

export {
  OPERATOR_ATTRIBUTION_POLICY_VERSION,
  SUBSTRATE_FALLBACK_OPERATOR,
  SUBSTRATE_SECTOR_OPERATOR_OWNERSHIP,
  substrateOperatorAttributionPolicy,
  type DomainAttributionConfidence,
  type DomainAttributionSource,
  type DomainPolicy,
  type OperatorAttributionPolicy,
  type SectorAttribution,
} from "./attribution";
