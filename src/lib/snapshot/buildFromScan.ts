import type { SectorId } from "@/data/types";
import type { ActivityKind } from "@/lib/operations/taxonomy";
import {
  ACTIVITY_SECTOR_MAP,
  ALL_SECTOR_IDS,
  scoreToActivityLevel,
} from "@/lib/operations/taxonomy";
import type { RawScannedProject } from "@/lib/localData/scanners";
import type {
  ContinuitySnapshot,
  ContinuitySnapshotOperator,
  ContinuitySnapshotProject,
  ContinuitySnapshotSignal,
  ContinuitySnapshotSectorHeat,
} from "./types";

const OPERATOR_SECTOR_OWNERSHIP: Record<string, SectorId[]> = {
  "nexus-7": ["core"],
  "deep-1": ["archive"],
  "fab-0": ["forge", "runtime"],
  "bcast-1": ["relay"],
  "scout-6": ["observatory", "core"],
};

const OPERATOR_CALLSIGNS: Record<string, string> = {
  "nexus-7": "NEXUS-7",
  "deep-1": "ARCHIVIST-0",
  "fab-0": "FAB-0",
  "bcast-1": "BCAST-1",
  "scout-6": "SCOUT-6",
};

function buildSignals(projects: RawScannedProject[]): ContinuitySnapshotSignal[] {
  const signals: ContinuitySnapshotSignal[] = [];

  for (const p of projects) {
    if (p.hasPackageJson) {
      signals.push({
        id: `${p.id}-pkg`,
        kind: "forge",
        label: "package.json",
        value: "Present",
        projectId: p.id,
        weight: 8,
      });
    }

    if (p.hasGit) {
      signals.push({
        id: `${p.id}-git`,
        kind: "continuity",
        label: "Git repository",
        value: p.recentCodeEdits > 0 ? "Active (7d)" : "Present",
        projectId: p.id,
        weight: p.recentCodeEdits > 0 ? 12 : 5,
      });
    }

    if (p.markdownCount > 0) {
      signals.push({
        id: `${p.id}-md`,
        kind: "archive",
        label: "Markdown volume",
        value: String(p.markdownCount),
        projectId: p.id,
        weight: Math.min(15, Math.round(p.markdownCount / 5)),
      });
    }

    if (p.obsidianVault) {
      signals.push({
        id: `${p.id}-obsidian`,
        kind: "continuity",
        label: "Obsidian vault",
        value: "Detected",
        projectId: p.id,
        weight: 14,
      });
    }

    if (p.runtimeCapable) {
      signals.push({
        id: `${p.id}-runtime`,
        kind: "runtime",
        label: "Runtime capable",
        value: p.likelyStack.includes("next") ? "Node / Next" : "Process scripts",
        projectId: p.id,
        weight: 10,
      });
    }

    if (p.recentActivityCount > 0) {
      signals.push({
        id: `${p.id}-recent`,
        kind: p.recentMarkdownEdits >= p.recentCodeEdits ? "documentation" : "forge",
        label: "Recent activity (7d)",
        value: `${p.recentActivityCount} files`,
        projectId: p.id,
        weight: Math.min(20, p.recentActivityCount * 3),
      });
    }

    if (p.likelyStack.includes("markdown-heavy") && p.activityScore > 0) {
      signals.push({
        id: `${p.id}-md-heavy`,
        kind: "documentation",
        label: "Documentation density",
        value: "Markdown-heavy tree",
        projectId: p.id,
        weight: 8,
      });
    }
  }

  return signals;
}

function buildSectorHeat(
  projects: RawScannedProject[],
  signals: ContinuitySnapshotSignal[],
): Record<SectorId, ContinuitySnapshotSectorHeat> {
  const heat: Record<SectorId, ContinuitySnapshotSectorHeat> = {} as Record<
    SectorId,
    ContinuitySnapshotSectorHeat
  >;

  for (const sectorId of ALL_SECTOR_IDS) {
    const inSector = projects.filter((p) => p.sectorClassification === sectorId);
    const scoreFromProjects = inSector.reduce((n, p) => n + p.activityScore, 0);
    const signalBoost = signals
      .filter((s) => (ACTIVITY_SECTOR_MAP[s.kind] ?? []).includes(sectorId))
      .reduce((n, s) => n + s.weight, 0);

    const activityScore = Math.min(100, Math.round(scoreFromProjects / 2 + signalBoost / 4));

    const kinds = new Map<string, number>();
    for (const s of signals) {
      if ((ACTIVITY_SECTOR_MAP[s.kind] ?? []).includes(sectorId)) {
        kinds.set(s.kind, (kinds.get(s.kind) ?? 0) + s.weight);
      }
    }
    let dominantActivity: string | null = null;
    let max = 0;
    for (const [k, v] of kinds) {
      if (v > max) {
        max = v;
        dominantActivity = k;
      }
    }

    heat[sectorId] = {
      activityScore,
      activityLevel: scoreToActivityLevel(activityScore),
      operationalLoad: inSector.filter((p) => p.activityScore > 0).length,
      dominantActivity,
    };
  }

  return heat;
}

function buildOperators(
  projects: RawScannedProject[],
  sectorHeat: Record<SectorId, ContinuitySnapshotSectorHeat>,
  signals: ContinuitySnapshotSignal[],
): ContinuitySnapshotOperator[] {
  return Object.entries(OPERATOR_SECTOR_OWNERSHIP).map(([operatorId, sectors]) => {
    const relevant = projects.filter((p) => sectors.includes(p.sectorClassification));
    const workload = Math.min(
      100,
      relevant.reduce((n, p) => n + p.activityScore, 0),
    );

    const top = [...relevant].sort((a, b) => b.activityScore - a.activityScore)[0];
    const sectorSignals = signals.filter(
      (s) => top && s.projectId === top.id,
    );
    const last = sectorSignals.sort((a, b) => b.weight - a.weight)[0];

    const hotSector = sectors.find((s) => sectorHeat[s].activityScore >= 25);

    let currentActivity = "Standby — no local activity in owned sectors";
    if (top && top.activityScore > 0) {
      currentActivity = `${top.name}: ${top.recentActivityCount > 0 ? "recent file activity" : "structure detected"}`;
    } else if (hotSector) {
      currentActivity = `${hotSector} sector heat ${sectorHeat[hotSector].activityScore}`;
    }

    return {
      operatorId,
      callsign: OPERATOR_CALLSIGNS[operatorId] ?? operatorId,
      workload,
      currentActivity,
      activeProjectId: top && top.activityScore > 0 ? top.id : null,
      lastSignal: last ? `${last.label}: ${last.value}` : null,
    };
  });
}

export function buildContinuitySnapshot(
  projects: RawScannedProject[],
  scanRoots: ContinuitySnapshot["scanRoots"],
): ContinuitySnapshot {
  const signals = buildSignals(projects);
  const sectorHeat = buildSectorHeat(projects, signals);
  const operators = buildOperators(projects, sectorHeat, signals);

  const snapshotProjects: ContinuitySnapshotProject[] = projects.map((p) => ({
    id: p.id,
    name: p.name,
    path: p.path,
    scanRoot: p.scanRoot,
    hasPackageJson: p.hasPackageJson,
    hasGit: p.hasGit,
    markdownCount: p.markdownCount,
    lastModified: p.lastModified,
    runtimeCapable: p.runtimeCapable,
    likelyStack: p.likelyStack,
    sectorClassification: p.sectorClassification,
    activityScore: p.activityScore,
    recentActivityCount: p.recentActivityCount,
    obsidianVault: p.obsidianVault,
  }));

  return {
    generatedAt: new Date().toISOString(),
    agent: "ARCHIVIST-0",
    projects: snapshotProjects,
    sectorHeat,
    operators,
    signals,
    scanRoots,
  };
}
