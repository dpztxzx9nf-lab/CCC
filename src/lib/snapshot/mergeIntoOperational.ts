import type { OperationalSnapshot } from "@/data/operational-types";
import type { SnapshotMeta } from "@/data/operational-types";
import type { SectorId } from "@/data/types";
import { SECTOR_CONTINUITY_WEIGHT } from "@/lib/operations/continuityWeights";
import { getProjectProfile } from "@/lib/operations/projectProfiles";
import {
  activityToStatus,
  ALL_SECTOR_IDS,
  scoreToActivityLevel,
  type OperatorState,
} from "@/lib/operations/taxonomy";
import type { ContinuitySnapshot } from "./types";
import { resolveSnapshotProjectId, resolveSnapshotProjectName } from "./resolveProjectId";
import { snapshotHasData } from "./loadSnapshot";

export interface MergeContinuityResult {
  operational: OperationalSnapshot;
  snapshotMeta: SnapshotMeta | null;
}

function operatorStateFromWorkload(workload: number): OperatorState {
  if (workload >= 50) return "elevated";
  if (workload >= 20) return "focused";
  if (workload > 0) return "distributed";
  return "idle";
}

function mapSectorHeat(
  snapshot: ContinuitySnapshot,
): OperationalSnapshot["sectorHeat"] {
  return ALL_SECTOR_IDS.map((sectorId) => {
    const h = snapshot.sectorHeat[sectorId];
    const activityScore = h?.activityScore ?? 0;
    return {
      sectorId,
      activityScore,
      continuityWeight: SECTOR_CONTINUITY_WEIGHT[sectorId],
      operationalLoad: h?.operationalLoad ?? 0,
      activityLevel: h?.activityLevel ?? scoreToActivityLevel(activityScore),
      status: activityToStatus(activityScore),
      dominantActivity: h?.dominantActivity ?? null,
    };
  });
}

function mapOperators(snapshot: ContinuitySnapshot): OperationalSnapshot["operators"] {
  return snapshot.operators.map((op) => {
    const activeSnap = op.activeProjectId
      ? snapshot.projects.find((p) => p.id === op.activeProjectId)
      : undefined;
    const activeName = activeSnap?.name ?? "";
    const canonicalProjectId = op.activeProjectId
      ? resolveSnapshotProjectId(op.activeProjectId, activeName)
      : null;
    const workload = op.workload;

    return {
      operatorId: op.operatorId,
      callsign: op.callsign,
      currentAssignment: canonicalProjectId
        ? resolveSnapshotProjectName(op.activeProjectId!, activeName)
        : "Facility standby",
      activeProjectId: canonicalProjectId,
      activeProjectName: op.activeProjectId
        ? resolveSnapshotProjectName(op.activeProjectId, activeName)
        : null,
      operationalState: operatorStateFromWorkload(workload),
      workload,
      currentActivity: op.currentActivity,
      status: workload >= 60 ? "elevated" : workload > 0 ? "nominal" : "nominal",
      lastSignal: op.lastSignal,
    };
  });
}

function mapSignals(snapshot: ContinuitySnapshot): OperationalSnapshot["signals"] {
  return snapshot.signals.map((s) => {
    const sp = snapshot.projects.find((p) => p.id === s.projectId);
    return {
      id: s.id,
      kind: s.kind,
      label: s.label,
      value: s.value,
      projectId: resolveSnapshotProjectId(s.projectId, sp?.name ?? ""),
    };
  });
}

function mergeProjects(
  base: OperationalSnapshot["projects"],
  snapshot: ContinuitySnapshot,
): OperationalSnapshot["projects"] {
  const merged = new Map(base.map((p) => [p.projectId, { ...p }]));

  for (const sp of snapshot.projects) {
    const canonicalId = resolveSnapshotProjectId(sp.id, sp.name);
    const profile = getProjectProfile(canonicalId);
    const top = snapshot.signals
      .filter((s) => s.projectId === sp.id)
      .sort((a, b) => b.weight - a.weight)[0];

    merged.set(canonicalId, {
      projectId: canonicalId,
      canonicalName: profile?.canonicalName ?? sp.name,
      detected: true,
      activityScore: sp.activityScore,
      activityLevel: scoreToActivityLevel(sp.activityScore),
      topSignal: top ? `${top.label}: ${top.value}` : null,
      sectors: profile?.sectors ?? [sp.sectorClassification],
      category: profile?.category ?? "platform",
      continuityPriority: profile?.continuityPriority ?? 2,
    });
  }

  return Array.from(merged.values());
}

function buildSnapshotTelemetry(
  snapshot: ContinuitySnapshot,
  operators: OperationalSnapshot["operators"],
): OperationalSnapshot["telemetry"] {
  const active = snapshot.projects.filter((p) => p.activityScore > 0).length;
  const md = snapshot.projects.reduce((n, p) => n + p.markdownCount, 0);
  const recent = snapshot.projects.reduce((n, p) => n + p.recentActivityCount, 0);
  const rootsOk = snapshot.scanRoots.filter((r) => r.accessible).length;

  return [
    { id: "active-projects", label: "Active projects", value: String(active) },
    {
      id: "detected",
      label: "Scanned projects",
      value: String(snapshot.projects.length),
    },
    { id: "continuity-md", label: "Markdown corpus", value: String(md), hint: "snapshot" },
    { id: "recent", label: "Recent file activity", value: String(recent), hint: "7d" },
    {
      id: "operators",
      label: "Active operators",
      value: String(operators.filter((o) => o.workload > 0).length),
    },
    {
      id: "signals",
      label: "Continuity signals",
      value: String(snapshot.signals.length),
    },
    {
      id: "scan-roots",
      label: "Scan roots",
      value: `${rootsOk}/${snapshot.scanRoots.length}`,
      hint: "archivist",
    },
  ];
}

function overallStatus(heat: OperationalSnapshot["sectorHeat"]) {
  const max = Math.max(...heat.map((h) => h.activityScore), 0);
  if (max >= 70) return "elevated" as const;
  return "nominal" as const;
}

/**
 * Overlay ARCHIVIST-0 snapshot onto API/mock operational state.
 * Snapshot drives heat, operators, signals; projects merge by canonical id.
 */
export function mergeContinuitySnapshot(
  base: OperationalSnapshot,
  archivist: ContinuitySnapshot | null,
): MergeContinuityResult {
  if (!archivist || !snapshotHasData(archivist)) {
    return { operational: base, snapshotMeta: null };
  }

  const sectorHeat = mapSectorHeat(archivist);
  const operators = mapOperators(archivist);
  const signals = mapSignals(archivist);
  const projects = mergeProjects(base.projects, archivist);
  const telemetry =
    base.enabled && base.telemetry.length > 0
      ? base.telemetry.map((t) => {
          const snap = buildSnapshotTelemetry(archivist, operators).find(
            (s) => s.id === t.id,
          );
          return snap ?? t;
        })
      : buildSnapshotTelemetry(archivist, operators);

  const snapshotMeta: SnapshotMeta = {
    generatedAt: archivist.generatedAt,
    agent: archivist.agent,
    scanRoots: archivist.scanRoots.map((r) => ({
      id: r.id,
      accessible: r.accessible,
      projectCount: r.projectCount,
    })),
    projectCount: archivist.projects.length,
  };

  return {
    operational: {
      ...base,
      enabled: true,
      label: "ARCHIVIST-0 · SNAPSHOT",
      scannedAt: archivist.generatedAt,
      source: "archivist",
      projects,
      sectorHeat,
      operators,
      signals,
      telemetry,
      systemStatus: overallStatus(sectorHeat),
      snapshotMeta,
      message: undefined,
    },
    snapshotMeta,
  };
}

/** Expose snapshot project → sector for placement hints */
export function snapshotProjectSectors(
  archivist: ContinuitySnapshot,
): Map<string, SectorId> {
  const map = new Map<string, SectorId>();
  for (const p of archivist.projects) {
    const id = resolveSnapshotProjectId(p.id, p.name);
    map.set(id, p.sectorClassification);
    map.set(p.id, p.sectorClassification);
  }
  return map;
}
