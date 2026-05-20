import type { SystemStatus } from "@/data/types";
import type { OperationalSnapshot } from "@/data/operational-types";
import type { LocalContinuityReport, LocalProjectSummary } from "@/lib/localData/types";
import { isLocalIngestionEnabled } from "@/lib/localData/is-enabled";
import { mockCCCData } from "@/data/mock";
import {
  ACTIVITY_HEAT_WEIGHT,
  priorityMultiplier,
  SECTOR_CONTINUITY_WEIGHT,
} from "./continuityWeights";
import {
  classifyProjectActivity,
  projectActivityScore,
  type ClassifiedSignal,
} from "./classification";
import {
  PROJECT_PROFILES,
  type ProjectProfile,
} from "./projectProfiles";
import {
  ACTIVITY_SECTOR_MAP,
  activityToStatus,
  ALL_SECTOR_IDS,
  OPERATOR_IDS,
  scoreToActivityLevel,
  type OperatorId,
  type OperatorState,
} from "./taxonomy";

function resolveLocalSummary(
  profile: ProjectProfile,
  report: LocalContinuityReport | null,
): LocalProjectSummary | null {
  if (!report?.enabled || !profile.localSlug) return null;
  return report.sources.find((s) => s.slug === profile.localSlug) ?? null;
}

function buildProjectViews(
  report: LocalContinuityReport | null,
): {
  views: OperationalSnapshot["projects"];
  signals: ClassifiedSignal[];
  byProject: Map<string, ClassifiedSignal[]>;
} {
  const signals: ClassifiedSignal[] = [];
  const byProject = new Map<string, ClassifiedSignal[]>();

  const views = PROJECT_PROFILES.map((profile) => {
    const summary = resolveLocalSummary(profile, report);
    const classified = classifyProjectActivity(profile, summary);
    signals.push(...classified);
    byProject.set(profile.id, classified);

    const score = projectActivityScore(classified);
    const top = classified.sort((a, b) => b.weight - a.weight)[0];

    return {
      projectId: profile.id,
      canonicalName: profile.canonicalName,
      detected: summary?.detected ?? false,
      activityScore: score,
      activityLevel: scoreToActivityLevel(score),
      topSignal: top ? `${top.label}: ${top.value}` : null,
      sectors: profile.sectors,
      category: profile.category,
      continuityPriority: profile.continuityPriority,
    };
  });

  return { views, signals, byProject };
}

function buildSectorHeat(
  projects: OperationalSnapshot["projects"],
  allSignals: ClassifiedSignal[],
): OperationalSnapshot["sectorHeat"] {
  const heat = new Map<
    string,
    { score: number; load: number; kinds: Map<string, number> }
  >();

  for (const sectorId of ALL_SECTOR_IDS) {
    heat.set(sectorId, { score: 0, load: 0, kinds: new Map() });
  }

  for (const signal of allSignals) {
    const sectors = ACTIVITY_SECTOR_MAP[signal.kind] ?? [];
    const profile = PROJECT_PROFILES.find((p) => p.id === signal.projectId);
    const mult = profile ? priorityMultiplier(profile.continuityPriority) : 1;

    for (const sectorId of sectors) {
      const entry = heat.get(sectorId)!;
      const w = (ACTIVITY_HEAT_WEIGHT[signal.kind] ?? 5) * mult;
      entry.score += w;
      entry.kinds.set(signal.kind, (entry.kinds.get(signal.kind) ?? 0) + w);
    }
  }

  for (const project of projects) {
    if (project.activityScore > 0) {
      for (const sectorId of project.sectors) {
        const entry = heat.get(sectorId);
        if (entry) entry.load += 1;
      }
    }
  }

  return ALL_SECTOR_IDS.map((sectorId) => {
    const entry = heat.get(sectorId)!;
    const baseWeight = SECTOR_CONTINUITY_WEIGHT[sectorId];
    const normalized = Math.min(100, Math.round(entry.score / 3));
    const weighted = Math.min(100, Math.round(normalized * baseWeight));

    let dominantActivity: string | null = null;
    let maxKind = 0;
    for (const [kind, val] of entry.kinds) {
      if (val > maxKind) {
        maxKind = val;
        dominantActivity = kind;
      }
    }

    return {
      sectorId,
      activityScore: weighted,
      continuityWeight: baseWeight,
      operationalLoad: entry.load,
      activityLevel: scoreToActivityLevel(weighted),
      status: activityToStatus(weighted),
      dominantActivity,
    };
  });
}

function buildOperatorViews(
  projects: OperationalSnapshot["projects"],
  byProject: Map<string, ClassifiedSignal[]>,
): OperationalSnapshot["operators"] {
  const mockOps = mockCCCData.operators;

  return OPERATOR_IDS.map((operatorId) => {
    const mock = mockOps.find((o) => o.id === operatorId)!;
    const owned = PROJECT_PROFILES.filter((p) =>
      p.operatorIds.includes(operatorId as OperatorId),
    );

    const ownedActivity = owned
      .map((p) => {
        const view = projects.find((v) => v.projectId === p.id);
        const sigs = byProject.get(p.id) ?? [];
        return {
          profile: p,
          score: view?.activityScore ?? 0,
          signals: sigs,
          detected: view?.detected ?? false,
        };
      })
      .sort((a, b) => b.score - a.score);

    const workload = Math.min(
      100,
      ownedActivity.reduce((sum, o) => sum + o.score, 0),
    );

    const primary = ownedActivity[0];
    const topSignal = primary?.signals.sort((a, b) => b.weight - a.weight)[0];

    let operationalState: OperatorState = "idle";
    if (workload >= 50) operationalState = "elevated";
    else if (workload >= 20) operationalState = "focused";
    else if (workload > 0) operationalState = "distributed";

    const activeProject = primary && primary.score > 0 ? primary.profile : null;

    const currentActivity = topSignal
      ? `${topSignal.label} — ${activeProject?.canonicalName ?? "standby"}`
      : activeProject
        ? `Monitoring ${activeProject.canonicalName}`
        : mock.currentActivity;

    const status: SystemStatus =
      workload >= 60 ? "elevated" : workload > 0 ? "nominal" : "nominal";

    return {
      operatorId,
      callsign: mock.callsign,
      currentAssignment: owned.map((p) => p.canonicalName).join(", "),
      activeProjectId: activeProject?.id ?? null,
      activeProjectName: activeProject?.canonicalName ?? null,
      operationalState,
      workload,
      currentActivity,
      status,
      lastSignal: topSignal ? `${topSignal.label}: ${topSignal.value}` : null,
    };
  });
}

function buildTelemetry(
  projects: OperationalSnapshot["projects"],
  operators: OperationalSnapshot["operators"],
  report: LocalContinuityReport | null,
): OperationalSnapshot["telemetry"] {
  const detected = projects.filter((p) => p.detected).length;
  const activeProjects = projects.filter((p) => p.activityScore > 0).length;
  const activeOps = operators.filter((o) => o.workload > 0).length;
  const mdTotal = report?.totals.markdownFiles ?? 0;
  const recent = report?.totals.recentActivityCount ?? 0;
  const deploySignals = projects.filter(
    (p) => p.activityLevel === "high" && p.category !== "knowledge",
  ).length;

  const runtimeProjects = projects.filter((p) => p.detected && p.activityScore > 0);
  const runtimeHealth =
    runtimeProjects.length === 0
      ? "—"
      : `${Math.round((detected / Math.max(projects.length, 1)) * 100)}%`;

  return [
    { id: "active-projects", label: "Active projects", value: String(activeProjects) },
    { id: "detected", label: "Sources detected", value: `${detected}/${projects.length}` },
    {
      id: "continuity-md",
      label: "Markdown corpus",
      value: String(mdTotal),
      hint: "local",
    },
    {
      id: "recent",
      label: "Recent file activity",
      value: String(recent),
      hint: "7d",
    },
    { id: "deploy", label: "Deployment signals", value: String(deploySignals) },
    { id: "runtime", label: "Runtime health", value: runtimeHealth },
    { id: "operators", label: "Active operators", value: String(activeOps) },
    {
      id: "signals",
      label: "Continuity signals",
      value: String(report?.signals.length ?? 0),
    },
  ];
}

function overallStatus(heat: OperationalSnapshot["sectorHeat"]): SystemStatus {
  const max = Math.max(...heat.map((h) => h.activityScore), 0);
  if (max >= 70) return "elevated";
  return "nominal";
}

/** Build operational topology from local continuity report */
export function buildOperationalSnapshot(
  report: LocalContinuityReport | null,
): OperationalSnapshot {
  const scannedAt = report?.scannedAt ?? new Date().toISOString();
  const enabled = Boolean(report?.enabled && isLocalIngestionEnabled());

  if (!enabled) {
    return buildMockFallbackSnapshot(scannedAt);
  }

  const { views, signals, byProject } = buildProjectViews(report);
  const sectorHeat = buildSectorHeat(views, signals);
  const operators = buildOperatorViews(views, byProject);
  const telemetry = buildTelemetry(views, operators, report);

  return {
    enabled: true,
    label: "DERIVED · LOCAL DEV",
    scannedAt,
    source: "local",
    projects: views,
    sectorHeat,
    operators,
    telemetry,
    signals: signals.map((s) => ({
      id: s.id,
      kind: s.kind,
      label: s.label,
      value: s.value,
      projectId: s.projectId,
    })),
    systemStatus: overallStatus(sectorHeat),
  };
}

function buildMockFallbackSnapshot(scannedAt: string): OperationalSnapshot {
  const report: LocalContinuityReport = {
    enabled: false,
    label: "MOCK / DEMO DATA",
    scannedAt,
    sources: [],
    signals: [],
    totals: {
      projects: PROJECT_PROFILES.length,
      detectedProjects: 0,
      markdownFiles: 0,
      recentActivityCount: 0,
      sourcesScanned: 0,
    },
    message: "Local ingestion disabled — operational mapping from seed profiles only.",
  };

  const { views, signals, byProject } = buildProjectViews(report);
  const sectorHeat = buildSectorHeat(views, signals);
  const operators = buildOperatorViews(views, byProject);

  return {
    enabled: false,
    label: "MOCK / DEMO DATA",
    scannedAt,
    source: "mock",
    projects: views,
    sectorHeat,
    operators,
    telemetry: [],
    signals: [],
    systemStatus: mockCCCData.systemStatus,
    message: report.message,
  };
}

export { PROJECT_PROFILES, getProfileByLocalSlug } from "./projectProfiles";
