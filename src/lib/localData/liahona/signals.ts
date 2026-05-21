import { createSignal } from "@/lib/operations/signals/createSignal";
import type { OperationalSignal } from "@/lib/operations/types";
import type { RawScannedProject } from "@/lib/localData/scanners";
import { observeLiahonaFilesystem } from "./observe";
import { liahonaProjectId, resolveLiahonaProject } from "./resolve";

export const LIAHONA_SIGNAL_SOURCE = "continuity:liahona" as const;

export async function deriveLiahonaOperationalSignals(
  projects: RawScannedProject[],
): Promise<OperationalSignal[]> {
  const project = resolveLiahonaProject(projects);
  if (!project) return [];

  const observation = await observeLiahonaFilesystem(project.path);
  const projectId = liahonaProjectId(project);
  const meta = {
    ecosystemId: "liahona",
    projectId,
    scannedProjectId: project.id,
    repoPath: project.path,
    observation,
    activityScore: project.activityScore,
    recentActivityCount: project.recentActivityCount,
    recentCodeEdits: project.recentCodeEdits,
    runtimeCapable: project.runtimeCapable,
    hasGit: project.hasGit,
  };

  const signals: OperationalSignal[] = [];

  if (
    observation.runtimeMarkerCount >= 1 &&
    (project.runtimeCapable ||
      project.recentCodeEdits > 0 ||
      project.recentActivityCount > 0)
  ) {
    signals.push(
      createSignal({
        source: LIAHONA_SIGNAL_SOURCE,
        sector: "runtime",
        type: "liahona_runtime_activity",
        severity:
          project.recentCodeEdits > 0 ? "medium" : "low",
        stableKey: `${projectId}:runtime`,
        metadata: meta,
      }),
    );
  }

  if (observation.sourcesMarkerCount >= 1) {
    signals.push(
      createSignal({
        source: LIAHONA_SIGNAL_SOURCE,
        sector: "observatory",
        type: "liahona_source_retrieval",
        severity:
          observation.sourcesMarkerCount >= 2 ? "medium" : "low",
        stableKey: `${projectId}:sources`,
        metadata: meta,
      }),
    );
  }

  if (observation.memoryMarkerCount >= 2) {
    signals.push(
      createSignal({
        source: LIAHONA_SIGNAL_SOURCE,
        sector: "observatory",
        type: "liahona_memory_systems",
        severity: "medium",
        stableKey: `${projectId}:memory`,
        metadata: meta,
      }),
    );
  }

  if (
    observation.projectionMarkerCount >= 1 &&
    project.recentActivityCount > 0
  ) {
    signals.push(
      createSignal({
        source: LIAHONA_SIGNAL_SOURCE,
        sector: "relay",
        type: "liahona_projection_surface",
        severity: "medium",
        stableKey: `${projectId}:projection`,
        metadata: meta,
      }),
    );
  }

  if (
    observation.discordMarkerCount >= 1 &&
    (project.recentActivityCount > 0 || project.recentCodeEdits > 0)
  ) {
    signals.push(
      createSignal({
        source: LIAHONA_SIGNAL_SOURCE,
        sector: "relay",
        type: "liahona_discord_continuity",
        severity: "medium",
        stableKey: `${projectId}:discord`,
        metadata: meta,
      }),
    );
  }

  if (
    project.runtimeCapable &&
    project.hasGit &&
    observation.deployMarkerCount >= 1 &&
    project.recentActivityCount <= 2
  ) {
    signals.push(
      createSignal({
        source: LIAHONA_SIGNAL_SOURCE,
        sector: "runtime",
        type: "liahona_runtime_stabilization",
        severity: "low",
        stableKey: `${projectId}:stabilization`,
        metadata: meta,
      }),
    );
  }

  return signals;
}
