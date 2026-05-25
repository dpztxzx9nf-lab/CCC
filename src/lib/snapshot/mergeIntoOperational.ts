import type {
  OperationalHistoryEventView,
  OperationalSnapshot,
  SnapshotMeta,
} from "@/data/operational-types";
import type { SectorId } from "@/data/types";
import { SECTOR_CONTINUITY_WEIGHT } from "@/lib/operations/continuityWeights";
import { getProjectProfile } from "@/lib/operations/projectProfiles";
import {
  activityToStatus,
  ALL_SECTOR_IDS,
  scoreToActivityLevel,
  type OperatorState,
} from "@/lib/operations/taxonomy";
import type { OperationalSignal } from "@/lib/operations/types";
import { signalTypeToActivityKind } from "@/lib/operations/signalSectorRouting";
import type { ContinuitySnapshot } from "./types";
import { resolveSnapshotProjectId, resolveSnapshotProjectName } from "./resolveProjectId";
import { snapshotHasData } from "./loadSnapshot";

const HISTORY_EVENT_TYPES = new Set([
  "PROJECT_EMERGED",
  "PROJECT_DORMANT",
  "PROJECT_REACTIVATED",
  "RUNTIME_ESCALATION",
  "SECTOR_PRESSURE_INCREASED",
  "SECTOR_PRESSURE_DECREASED",
  "OPERATOR_PRESSURE_SHIFT",
  "CONTINUITY_ACCELERATION",
]);

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

function mapOperationalSignals(
  snapshot: ContinuitySnapshot,
): OperationalSnapshot["signals"] {
  return (snapshot.operationalSignals ?? []).map((s) => {
    const rawProjectId = s.metadata?.projectId;
    const projectKey =
      typeof rawProjectId === "string" ? rawProjectId : "facility";
    const sp = snapshot.projects.find(
      (p) => p.id === projectKey || p.name === projectKey,
    );
    const kind = signalTypeToActivityKind(s.type);
    return {
      id: s.id,
      kind,
      label: s.type.replace(/_/g, " "),
      value:
        typeof s.metadata?.branch === "string"
          ? String(s.metadata.branch)
          : s.severity,
      projectId: resolveSnapshotProjectId(projectKey, sp?.name ?? ""),
    };
  });
}

function mapSignals(snapshot: ContinuitySnapshot): OperationalSnapshot["signals"] {
  const fromOperational = mapOperationalSignals(snapshot);
  const fromScan = snapshot.signals.map((s) => {
    const sp = snapshot.projects.find((p) => p.id === s.projectId);
    return {
      id: s.id,
      kind: s.kind,
      label: s.label,
      value: s.value,
      projectId: resolveSnapshotProjectId(s.projectId, sp?.name ?? ""),
    };
  });
  const seen = new Set(fromOperational.map((s) => s.id));
  const merged = [...fromOperational];
  for (const s of fromScan) {
    if (!seen.has(s.id)) merged.push(s);
  }
  return merged;
}

function mapHistoryEvents(snapshot: ContinuitySnapshot): OperationalHistoryEventView[] {
  return (snapshot.eventsRecent ?? [])
    .filter(
      (event) =>
        event.source === "archivist:history" ||
        HISTORY_EVENT_TYPES.has(event.type),
    )
    .map((event) => {
      const rawProjectId = event.metadata.projectId;
      const rawEvidence = event.metadata.evidence;
      const evidence =
        rawEvidence && typeof rawEvidence === "object"
          ? (rawEvidence as Record<string, unknown>)
          : {};

      return {
        id: event.id,
        type: event.type,
        projectId: typeof rawProjectId === "string" ? rawProjectId : null,
        sector: event.sector,
        severity: event.severity,
        summary: event.summary,
        evidence,
        createdAt: event.timestamp,
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
  const historyEvents = mapHistoryEvents(archivist);
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

  const totalMarkdownFiles = archivist.projects.reduce(
    (n, p) => n + p.markdownCount,
    0,
  );

  const snapshotMeta: SnapshotMeta = {
    generatedAt: archivist.generatedAt,
    agent: archivist.agent,
    scanRoots: archivist.scanRoots.map((r) => ({
      id: r.id,
      accessible: r.accessible,
      projectCount: r.projectCount,
    })),
    projectCount: archivist.projects.length,
    totalMarkdownFiles,
  };

  return buildMergeResult(base, archivist, {
    sectorHeat,
    operators,
    signals,
    historyEvents,
    projects,
    telemetry,
    snapshotMeta,
  });
}

function buildMergeResult(
  base: OperationalSnapshot,
  archivist: ContinuitySnapshot,
  built: {
    sectorHeat: OperationalSnapshot["sectorHeat"];
    operators: OperationalSnapshot["operators"];
    signals: OperationalSnapshot["signals"];
    historyEvents: OperationalSnapshot["historyEvents"];
    projects: OperationalSnapshot["projects"];
    telemetry: OperationalSnapshot["telemetry"];
    snapshotMeta: SnapshotMeta;
  },
): MergeContinuityResult {
  const { sectorHeat, operators, signals, historyEvents, projects, telemetry, snapshotMeta } =
    built;

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
      historyEvents,
      telemetry,
      systemStatus: overallStatus(sectorHeat),
      snapshotMeta,
      message: undefined,
      continuityEvents: base.continuityEvents,
    },
    snapshotMeta,
  };
}

/** Merge with optional facility telemetry fields on snapshot meta */
export function mergeContinuitySnapshotWithTelemetry(
  base: OperationalSnapshot,
  archivist: ContinuitySnapshot | null,
  facilityTelemetry?: {
    snapshotBytes: number;
    eventsBytes: number;
    eventsCount: number;
  } | null,
): MergeContinuityResult {
  const result = mergeContinuitySnapshot(base, archivist);
  if (!result.snapshotMeta || !facilityTelemetry) return result;

  result.snapshotMeta = {
    ...result.snapshotMeta,
    snapshotSizeBytes: facilityTelemetry.snapshotBytes,
    eventsFileBytes: facilityTelemetry.eventsBytes,
    eventsRecordCount: facilityTelemetry.eventsCount,
  };
  if (result.operational.snapshotMeta) {
    result.operational.snapshotMeta = result.snapshotMeta;
  }
  return result;
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
