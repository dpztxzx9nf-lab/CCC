import type { SectorId } from "@/data/types";
import { ALL_SECTOR_IDS } from "@/lib/operations/taxonomy";
import type { SemanticMeaning } from "@/lib/operations/classifySemanticMeaning";
import type { RawScannedProject } from "@/lib/localData/scanners";
import type {
  OperationalEvent,
  OperationalEventSeverity,
  OperationalEventType,
} from "./events";

const MILESTONE_SEMANTICS = new Set<SemanticMeaning>([
  "architecture_refinement",
  "ontology_change",
  "continuity_consolidation",
  "deployment_progress",
]);

export interface SemanticMilestoneRow {
  meaning: SemanticMeaning;
  timestamp: string;
  summary: string;
  project: string;
}

export interface LastSignificantOperationalEvent {
  timestamp: string;
  type: OperationalEventType;
  summary: string;
  severity: OperationalEventSeverity;
}

export interface OperationalSnapshotAugmentation {
  eventsRecent: OperationalEvent[];
  sectorPressure: Record<SectorId, number>;
  projectMomentum: Record<string, number>;
  semanticMilestones: SemanticMilestoneRow[];
  dormantProjects: string[];
  activeProjects: string[];
  lastSignificantEvent: LastSignificantOperationalEvent | null;
}

function severityWeight(s: OperationalEventSeverity): number {
  if (s === "high") return 3;
  if (s === "medium") return 1.5;
  return 0.45;
}

function emptyPressure(): Record<SectorId, number> {
  const o = {} as Record<SectorId, number>;
  for (const id of ALL_SECTOR_IDS) o[id] = 0;
  return o;
}

/** Derive snapshot augmentation + per-sector pressure from normalized operational events */
export function deriveOperationalSnapshotFields(
  projects: RawScannedProject[],
  events: OperationalEvent[],
  options?: { recentLimit?: number },
): OperationalSnapshotAugmentation {
  const recentLimit = options?.recentLimit ?? 48;
  const sorted = [...events].sort(
    (a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp),
  );

  const sectorPressure = emptyPressure();
  const projectMomentum: Record<string, number> = {};

  for (const e of sorted) {
    const w = severityWeight(e.severity) * e.confidence;
    sectorPressure[e.sector] += w;
    for (const s of e.sectors) {
      if (s !== e.sector) sectorPressure[s] += w * 0.35;
    }
    projectMomentum[e.project] = (projectMomentum[e.project] ?? 0) + w;
  }

  const semanticMilestones: SemanticMilestoneRow[] = [];
  for (const e of sorted) {
    const meaning = e.metadata?.semanticMeaning as SemanticMeaning | undefined;
    if (
      e.type === "semantic_milestone" ||
      (meaning && MILESTONE_SEMANTICS.has(meaning) && e.severity !== "low")
    ) {
      semanticMilestones.push({
        meaning: meaning ?? "continuity_consolidation",
        timestamp: e.timestamp,
        summary: e.summary,
        project: e.project,
      });
    }
    if (semanticMilestones.length >= 20) break;
  }

  const lastSignificant =
    sorted.find(
      (e) =>
        e.severity === "high" ||
        e.type === "deployment_signal" ||
        e.type === "build_failure" ||
        (e.metadata?.semanticMeaning &&
          MILESTONE_SEMANTICS.has(e.metadata.semanticMeaning as SemanticMeaning)),
    ) ?? null;

  const lastSignificantEvent: LastSignificantOperationalEvent | null = lastSignificant
    ? {
        timestamp: lastSignificant.timestamp,
        type: lastSignificant.type,
        summary: lastSignificant.summary,
        severity: lastSignificant.severity,
      }
    : null;

  const dormantProjects = projects
    .filter((p) => {
      const mom = projectMomentum[p.name] ?? 0;
      return p.activityScore < 14 && mom < 0.75;
    })
    .sort((a, b) => a.activityScore - b.activityScore)
    .slice(0, 24)
    .map((p) => p.id);

  const activeProjects = [...projects]
    .map((p) => ({
      id: p.id,
      score: p.activityScore + (projectMomentum[p.name] ?? 0) * 4,
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
    .map((x) => x.id);

  return {
    eventsRecent: sorted.slice(0, recentLimit),
    sectorPressure,
    projectMomentum,
    semanticMilestones,
    dormantProjects,
    activeProjects,
    lastSignificantEvent,
  };
}

/** Map pressure (raw weights) to additive heat points — bounded, no fake floor */
export function sectorPressureToHeatDelta(
  pressure: Record<SectorId, number>,
): Record<SectorId, number> {
  const out = emptyPressure();
  const max = Math.max(...Object.values(pressure), 0);
  if (max <= 0) return out;
  for (const id of ALL_SECTOR_IDS) {
    const n = pressure[id] ?? 0;
    out[id] = Math.round((n / max) * 22);
  }
  return out;
}
