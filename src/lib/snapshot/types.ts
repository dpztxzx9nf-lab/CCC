import type { SectorId } from "@/data/types";
import type {
  ContinuitySnapshotSchemaVersion,
  SnapshotManifestRef,
  SnapshotScanMeta,
} from "@/lib/substrate/snapshot-schema";
export type { SnapshotManifestRef, SnapshotScanMeta } from "@/lib/substrate/snapshot-schema";
export { CONTINUITY_SNAPSHOT_SCHEMA_VERSION } from "@/lib/substrate/snapshot-schema";
import type { ActivityKind } from "@/lib/operations/taxonomy";
import type { OperationalEvent } from "@/lib/operations/events";
import type { OperationalSignal } from "@/lib/operations/types";
import type { SectorActivityClass } from "@/lib/operations/temporal/types";
import type {
  LastSignificantOperationalEvent,
  SemanticMilestoneRow,
} from "@/lib/operations/deriveOperationalSnapshot";
import type { SemanticOperationalEvent } from "@/lib/operations/semantic/types";

export interface ContinuitySnapshotProject {
  id: string;
  name: string;
  path: string;
  scanRoot: string;
  hasPackageJson: boolean;
  hasGit: boolean;
  markdownCount: number;
  lastModified: string | null;
  runtimeCapable: boolean;
  likelyStack: string[];
  sectorClassification: SectorId;
  activityScore: number;
  recentActivityCount: number;
  obsidianVault: boolean;
}

export interface ContinuitySnapshotSectorHeat {
  activityScore: number;
  activityLevel: "idle" | "low" | "medium" | "high";
  operationalLoad: number;
  dominantActivity: string | null;
}

export interface ContinuitySnapshotOperator {
  operatorId: string;
  callsign: string;
  workload: number;
  currentActivity: string;
  activeProjectId: string | null;
  lastSignal: string | null;
}

export interface ContinuitySnapshotSignal {
  id: string;
  kind: ActivityKind;
  label: string;
  value: string;
  projectId: string;
  weight: number;
}

export interface SnapshotBuildOptions {
  manifestRef?: SnapshotManifestRef;
  hostId?: string;
}

export interface ContinuitySnapshot {
  /** Omitted on legacy snapshots; required on new writes (v1) */
  schemaVersion?: ContinuitySnapshotSchemaVersion;
  /** Registry lineage at generation time */
  manifestRef?: SnapshotManifestRef;
  /** Scan mode metadata (Phase 0: full snapshots only) */
  scan?: SnapshotScanMeta;
  generatedAt: string;
  agent: "ARCHIVIST-0";
  projects: ContinuitySnapshotProject[];
  sectorHeat: Record<SectorId, ContinuitySnapshotSectorHeat>;
  operators: ContinuitySnapshotOperator[];
  signals: ContinuitySnapshotSignal[];
  /** Normalized operational signals (git scan, future pipelines) */
  operationalSignals?: OperationalSignal[];
  scanRoots: { id: string; path: string; accessible: boolean; projectCount: number }[];
  /** Recent normalized operational activity (empty until watch/snapshot pipeline persists events) */
  eventsRecent?: OperationalEvent[];
  sectorPressure?: Record<SectorId, number>;
  /** Decay-weighted historical pressure per sector */
  historicalPressure?: Record<SectorId, number>;
  /** Rolling momentum per sector (recent vs prior window) */
  sectorMomentum?: Record<SectorId, number>;
  /** Transient / sustained / dormant / structural classification */
  sectorActivityClass?: Record<SectorId, SectorActivityClass>;
  dormantSectors?: SectorId[];
  projectMomentum?: Record<string, number>;
  semanticMilestones?: SemanticMilestoneRow[];
  /** Derived operational meanings (multi-signal correlation, no LLM) */
  semanticEvents?: SemanticOperationalEvent[];
  dormantProjects?: string[];
  activeProjects?: string[];
  lastSignificantEvent?: LastSignificantOperationalEvent | null;
}
