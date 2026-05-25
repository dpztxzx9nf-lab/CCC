import { createHash } from "crypto";
import type { SectorId } from "@/data/types";
import type {
  OperationalEvent,
  OperationalEventSeverity,
  OperationalEventType,
} from "@/lib/operations/events";
import { ALL_SECTOR_IDS } from "@/lib/operations/taxonomy";
import type {
  ContinuitySnapshot,
  ContinuitySnapshotOperator,
  ContinuitySnapshotProject,
  ContinuitySnapshotSectorHeat,
} from "@/lib/snapshot/types";

export type ContinuityHistoryDeltaType =
  | "PROJECT_EMERGED"
  | "PROJECT_DORMANT"
  | "PROJECT_REACTIVATED"
  | "RUNTIME_ESCALATION"
  | "SECTOR_PRESSURE_INCREASED"
  | "SECTOR_PRESSURE_DECREASED"
  | "OPERATOR_PRESSURE_SHIFT"
  | "CONTINUITY_ACCELERATION";

export interface ContinuityHistoryDeltaEvidence {
  previousSnapshotGeneratedAt: string;
  currentSnapshotGeneratedAt: string;
  previousValue?: number | string | null;
  currentValue?: number | string | null;
  delta?: number;
  previousActivityScore?: number;
  currentActivityScore?: number;
  previousRecentActivityCount?: number;
  currentRecentActivityCount?: number;
  previousRuntimeCapable?: boolean;
  currentRuntimeCapable?: boolean;
  path?: string;
  name?: string;
  markers?: string[];
}

export interface ContinuityHistoryDeltaEvent {
  id: string;
  type: ContinuityHistoryDeltaType;
  projectId: string | null;
  sector: SectorId;
  severity: OperationalEventSeverity;
  summary: string;
  evidence: ContinuityHistoryDeltaEvidence;
  createdAt: string;
}

const PRESSURE_DELTA_THRESHOLD = 8;
const OPERATOR_WORKLOAD_DELTA_THRESHOLD = 18;
const ACCELERATION_DELTA_THRESHOLD = 25;

function stableId(input: {
  type: ContinuityHistoryDeltaType;
  projectId: string | null;
  sector: SectorId;
  previousGeneratedAt: string;
  currentGeneratedAt: string;
}): string {
  const key = [
    input.type,
    input.projectId ?? "sector",
    input.sector,
    input.previousGeneratedAt,
    input.currentGeneratedAt,
  ].join(":");
  return `history-${createHash("sha1").update(key).digest("hex").slice(0, 16)}`;
}

function markersForProject(project: ContinuitySnapshotProject): string[] {
  const markers: string[] = [];
  if (project.hasPackageJson) markers.push("package.json");
  if (project.hasGit) markers.push(".git");
  if (project.markdownCount > 0) markers.push(`${project.markdownCount} markdown files`);
  if (project.runtimeCapable) markers.push("runtime capable");
  if (project.obsidianVault) markers.push("obsidian vault");
  return markers;
}

function severityForDelta(delta: number): OperationalEventSeverity {
  const absolute = Math.abs(delta);
  if (absolute >= 35) return "high";
  if (absolute >= 16) return "medium";
  return "low";
}

function event(input: {
  type: ContinuityHistoryDeltaType;
  projectId: string | null;
  sector: SectorId;
  severity: OperationalEventSeverity;
  summary: string;
  evidence: ContinuityHistoryDeltaEvidence;
  createdAt: string;
}): ContinuityHistoryDeltaEvent {
  return {
    id: stableId({
      type: input.type,
      projectId: input.projectId,
      sector: input.sector,
      previousGeneratedAt: input.evidence.previousSnapshotGeneratedAt,
      currentGeneratedAt: input.evidence.currentSnapshotGeneratedAt,
    }),
    type: input.type,
    projectId: input.projectId,
    sector: input.sector,
    severity: input.severity,
    summary: input.summary,
    evidence: input.evidence,
    createdAt: input.createdAt,
  };
}

function projectMap(
  snapshot: ContinuitySnapshot,
): Map<string, ContinuitySnapshotProject> {
  return new Map(snapshot.projects.map((project) => [project.id, project]));
}

function dormantSet(snapshot: ContinuitySnapshot): Set<string> {
  return new Set(snapshot.dormantProjects ?? []);
}

function activeSet(snapshot: ContinuitySnapshot): Set<string> {
  return new Set(snapshot.activeProjects ?? []);
}

function sectorPressureValue(
  snapshot: ContinuitySnapshot,
  sector: SectorId,
): number {
  return (
    snapshot.sectorPressure?.[sector] ??
    snapshot.sectorHeat?.[sector]?.activityScore ??
    0
  );
}

function totalRecentActivity(snapshot: ContinuitySnapshot): number {
  return snapshot.projects.reduce((total, project) => {
    return total + project.recentActivityCount + project.activityScore;
  }, 0);
}

function operatorById(
  snapshot: ContinuitySnapshot,
): Map<string, ContinuitySnapshotOperator> {
  return new Map(snapshot.operators.map((operator) => [operator.operatorId, operator]));
}

function sectorForOperator(
  operator: ContinuitySnapshotOperator,
  snapshot: ContinuitySnapshot,
): SectorId {
  const activeProject = operator.activeProjectId
    ? snapshot.projects.find((project) => project.id === operator.activeProjectId)
    : null;
  return activeProject?.sectorClassification ?? "core";
}

function pressureSummary(
  sector: SectorId,
  direction: "increased" | "decreased",
  delta: number,
): string {
  return `${sector} pressure ${direction} by ${Math.abs(Math.round(delta))} from previous snapshot`;
}

export function deriveContinuityHistoryDeltas(
  previous: ContinuitySnapshot | null,
  current: ContinuitySnapshot,
): ContinuityHistoryDeltaEvent[] {
  if (!previous) return [];

  const createdAt = current.generatedAt;
  const previousProjects = projectMap(previous);
  const currentProjects = projectMap(current);
  const previousDormant = dormantSet(previous);
  const currentDormant = dormantSet(current);
  const previousActive = activeSet(previous);
  const currentActive = activeSet(current);
  const events: ContinuityHistoryDeltaEvent[] = [];

  for (const project of current.projects) {
    const prior = previousProjects.get(project.id);
    if (!prior) {
      events.push(
        event({
          type: "PROJECT_EMERGED",
          projectId: project.id,
          sector: project.sectorClassification,
          severity: project.runtimeCapable || project.recentActivityCount > 0 ? "medium" : "low",
          summary: `${project.name} emerged in continuity scan`,
          evidence: {
            previousSnapshotGeneratedAt: previous.generatedAt,
            currentSnapshotGeneratedAt: current.generatedAt,
            path: project.path,
            name: project.name,
            markers: markersForProject(project),
            currentActivityScore: project.activityScore,
            currentRecentActivityCount: project.recentActivityCount,
            currentRuntimeCapable: project.runtimeCapable,
          },
          createdAt,
        }),
      );
      continue;
    }

    if (
      !previousDormant.has(project.id) &&
      currentDormant.has(project.id) &&
      prior.activityScore > project.activityScore
    ) {
      events.push(
        event({
          type: "PROJECT_DORMANT",
          projectId: project.id,
          sector: project.sectorClassification,
          severity: "low",
          summary: `${project.name} moved into dormant continuity state`,
          evidence: {
            previousSnapshotGeneratedAt: previous.generatedAt,
            currentSnapshotGeneratedAt: current.generatedAt,
            previousActivityScore: prior.activityScore,
            currentActivityScore: project.activityScore,
            previousRecentActivityCount: prior.recentActivityCount,
            currentRecentActivityCount: project.recentActivityCount,
            path: project.path,
          },
          createdAt,
        }),
      );
    }

    if (
      (previousDormant.has(project.id) || !previousActive.has(project.id)) &&
      currentActive.has(project.id) &&
      (project.recentActivityCount > prior.recentActivityCount ||
        project.activityScore > prior.activityScore)
    ) {
      events.push(
        event({
          type: "PROJECT_REACTIVATED",
          projectId: project.id,
          sector: project.sectorClassification,
          severity: severityForDelta(project.activityScore - prior.activityScore),
          summary: `${project.name} reactivated from prior continuity state`,
          evidence: {
            previousSnapshotGeneratedAt: previous.generatedAt,
            currentSnapshotGeneratedAt: current.generatedAt,
            previousActivityScore: prior.activityScore,
            currentActivityScore: project.activityScore,
            previousRecentActivityCount: prior.recentActivityCount,
            currentRecentActivityCount: project.recentActivityCount,
            path: project.path,
          },
          createdAt,
        }),
      );
    }

    if (
      project.runtimeCapable &&
      (project.runtimeCapable !== prior.runtimeCapable ||
        project.sectorClassification === "runtime") &&
      project.activityScore - prior.activityScore >= PRESSURE_DELTA_THRESHOLD
    ) {
      events.push(
        event({
          type: "RUNTIME_ESCALATION",
          projectId: project.id,
          sector: "runtime",
          severity: severityForDelta(project.activityScore - prior.activityScore),
          summary: `${project.name} runtime pressure increased from previous snapshot`,
          evidence: {
            previousSnapshotGeneratedAt: previous.generatedAt,
            currentSnapshotGeneratedAt: current.generatedAt,
            previousActivityScore: prior.activityScore,
            currentActivityScore: project.activityScore,
            delta: project.activityScore - prior.activityScore,
            previousRuntimeCapable: prior.runtimeCapable,
            currentRuntimeCapable: project.runtimeCapable,
            path: project.path,
          },
          createdAt,
        }),
      );
    }
  }

  for (const project of previous.projects) {
    if (currentProjects.has(project.id)) continue;
    events.push(
      event({
        type: "PROJECT_DORMANT",
        projectId: project.id,
        sector: project.sectorClassification,
        severity: "medium",
        summary: `${project.name} no longer appears in current continuity scan`,
        evidence: {
          previousSnapshotGeneratedAt: previous.generatedAt,
          currentSnapshotGeneratedAt: current.generatedAt,
          previousActivityScore: project.activityScore,
          currentActivityScore: 0,
          previousRecentActivityCount: project.recentActivityCount,
          currentRecentActivityCount: 0,
          path: project.path,
        },
        createdAt,
      }),
    );
  }

  for (const sector of ALL_SECTOR_IDS) {
    const prev = sectorPressureValue(previous, sector);
    const curr = sectorPressureValue(current, sector);
    const delta = curr - prev;
    if (Math.abs(delta) < PRESSURE_DELTA_THRESHOLD) continue;

    const type =
      delta > 0 ? "SECTOR_PRESSURE_INCREASED" : "SECTOR_PRESSURE_DECREASED";
    events.push(
      event({
        type,
        projectId: null,
        sector,
        severity: severityForDelta(delta),
        summary: pressureSummary(sector, delta > 0 ? "increased" : "decreased", delta),
        evidence: {
          previousSnapshotGeneratedAt: previous.generatedAt,
          currentSnapshotGeneratedAt: current.generatedAt,
          previousValue: Math.round(prev * 100) / 100,
          currentValue: Math.round(curr * 100) / 100,
          delta: Math.round(delta * 100) / 100,
        },
        createdAt,
      }),
    );
  }

  const previousOperators = operatorById(previous);
  for (const operator of current.operators) {
    const prior = previousOperators.get(operator.operatorId);
    if (!prior) continue;
    const delta = operator.workload - prior.workload;
    const activeProjectChanged = operator.activeProjectId !== prior.activeProjectId;
    if (
      Math.abs(delta) < OPERATOR_WORKLOAD_DELTA_THRESHOLD &&
      !activeProjectChanged
    ) {
      continue;
    }

    events.push(
      event({
        type: "OPERATOR_PRESSURE_SHIFT",
        projectId: operator.activeProjectId,
        sector: sectorForOperator(operator, current),
        severity: severityForDelta(delta),
        summary: `${operator.callsign} pressure shifted from previous snapshot`,
        evidence: {
          previousSnapshotGeneratedAt: previous.generatedAt,
          currentSnapshotGeneratedAt: current.generatedAt,
          previousValue: prior.workload,
          currentValue: operator.workload,
          delta,
          name: operator.callsign,
        },
        createdAt,
      }),
    );
  }

  const previousTotal = totalRecentActivity(previous);
  const currentTotal = totalRecentActivity(current);
  const acceleration = currentTotal - previousTotal;
  if (acceleration >= ACCELERATION_DELTA_THRESHOLD) {
    events.push(
      event({
        type: "CONTINUITY_ACCELERATION",
        projectId: null,
        sector: "core",
        severity: severityForDelta(acceleration),
        summary: `Continuity activity accelerated by ${Math.round(acceleration)} points across scanned projects`,
        evidence: {
          previousSnapshotGeneratedAt: previous.generatedAt,
          currentSnapshotGeneratedAt: current.generatedAt,
          previousValue: previousTotal,
          currentValue: currentTotal,
          delta: acceleration,
        },
        createdAt,
      }),
    );
  }

  return events.sort((a, b) => {
    const severityRank = { high: 3, medium: 2, low: 1 };
    return severityRank[b.severity] - severityRank[a.severity];
  });
}

export function historyDeltaToOperationalEvent(
  delta: ContinuityHistoryDeltaEvent,
): OperationalEvent {
  return {
    id: delta.id,
    type: delta.type as OperationalEventType,
    sector: delta.sector,
    sectors: [delta.sector],
    severity: delta.severity,
    confidence: 0.9,
    timestamp: delta.createdAt,
    source: "archivist:history",
    project: delta.projectId ?? delta.sector,
    filePath: null,
    summary: delta.summary,
    metadata: {
      projectId: delta.projectId,
      historyType: delta.type,
      createdAt: delta.createdAt,
      evidence: delta.evidence,
      semanticMeaning:
        delta.type === "PROJECT_EMERGED"
          ? "initiative_emergence"
          : delta.type === "PROJECT_REACTIVATED"
            ? "reactivation_event"
            : delta.type === "RUNTIME_ESCALATION"
              ? "infrastructure_instability"
              : "continuity_consolidation",
    },
  };
}

export function deriveContinuityHistoryOperationalEvents(
  previous: ContinuitySnapshot | null,
  current: ContinuitySnapshot,
): OperationalEvent[] {
  return deriveContinuityHistoryDeltas(previous, current).map(
    historyDeltaToOperationalEvent,
  );
}
