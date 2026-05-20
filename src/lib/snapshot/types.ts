import type { SectorId } from "@/data/types";
import type { ActivityKind } from "@/lib/operations/taxonomy";
import type { OperationalEvent } from "@/lib/operations/events";
import type {
  LastSignificantOperationalEvent,
  SemanticMilestoneRow,
} from "@/lib/operations/deriveOperationalSnapshot";

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

export interface ContinuitySnapshot {
  generatedAt: string;
  agent: "ARCHIVIST-0";
  projects: ContinuitySnapshotProject[];
  sectorHeat: Record<SectorId, ContinuitySnapshotSectorHeat>;
  operators: ContinuitySnapshotOperator[];
  signals: ContinuitySnapshotSignal[];
  scanRoots: { id: string; path: string; accessible: boolean; projectCount: number }[];
  /** Recent normalized operational activity (empty until watch/snapshot pipeline persists events) */
  eventsRecent?: OperationalEvent[];
  sectorPressure?: Record<SectorId, number>;
  projectMomentum?: Record<string, number>;
  semanticMilestones?: SemanticMilestoneRow[];
  dormantProjects?: string[];
  activeProjects?: string[];
  lastSignificantEvent?: LastSignificantOperationalEvent | null;
}
