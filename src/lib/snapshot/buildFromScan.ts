import type { RawScannedProject } from "@/lib/localData/scanners";
import type { OperationalEvent } from "@/lib/operations/events";
import type { OperationalSignal } from "@/lib/operations/types";
import {
  deriveOperationalSnapshotFields,
} from "@/lib/operations/deriveOperationalSnapshot";
import {
  buildOperatorsFromSignals,
  buildSectorHeatFromSignals,
  deriveTemporalContinuity,
  mergeSectorPressure,
} from "@/lib/operations/deriveSignalProjection";
import type {
  ContinuitySnapshot,
  ContinuitySnapshotProject,
  ContinuitySnapshotSignal,
} from "./types";

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

export function buildContinuitySnapshot(
  projects: RawScannedProject[],
  scanRoots: ContinuitySnapshot["scanRoots"],
  operationalEvents: OperationalEvent[] = [],
  operationalSignals: OperationalSignal[] = [],
): ContinuitySnapshot {
  const augmented = deriveOperationalSnapshotFields(projects, operationalEvents);
  const temporal = deriveTemporalContinuity(operationalSignals, projects);
  const combinedPressure = mergeSectorPressure(
    augmented.sectorPressure,
    temporal.environmentalPressure,
  );

  const signals = buildSignals(projects);
  const sectorHeat = buildSectorHeatFromSignals(
    projects,
    signals,
    temporal,
    operationalSignals,
  );
  const operators = buildOperatorsFromSignals(
    projects,
    sectorHeat,
    operationalSignals,
    temporal,
  );

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
    operationalSignals,
    scanRoots,
    eventsRecent: augmented.eventsRecent,
    sectorPressure: combinedPressure,
    historicalPressure: temporal.historicalPressure,
    sectorMomentum: temporal.sectorMomentum,
    sectorActivityClass: temporal.sectorActivityClass,
    dormantSectors: temporal.dormantSectors,
    projectMomentum: augmented.projectMomentum,
    semanticMilestones: augmented.semanticMilestones,
    dormantProjects: augmented.dormantProjects,
    activeProjects: augmented.activeProjects,
    lastSignificantEvent: augmented.lastSignificantEvent,
  };
}
