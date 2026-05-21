import "server-only";

import type { ProjectOperationalView } from "@/data/operational-types";
import { isLocalIngestionEnabled, scanLocalContinuity } from "@/lib/localData";
import { buildOperationalSnapshot } from "@/lib/operations/operationalState.server";
import {
  enrichRegistryProject,
  type EnrichedRegistryProject,
} from "./toProfile";
import type { ProjectRegistryEntry } from "./schema";
import { loadProjectRegistry } from "./store";

export async function listEnrichedRegistryProjects(options?: {
  includeArchived?: boolean;
}): Promise<{
  projects: EnrichedRegistryProject[];
  archived: EnrichedRegistryProject[];
}> {
  const registry = await loadProjectRegistry();
  const report = isLocalIngestionEnabled() ? await scanLocalContinuity() : null;
  const snapshot = buildOperationalSnapshot(report);
  const derivedById = new Map(
    snapshot.projects.map((p) => [p.projectId, p] as const),
  );

  const enrich = (entry: ProjectRegistryEntry) =>
    enrichRegistryProject(entry, derivedById.get(entry.id) ?? null);

  const active = registry.projects
    .filter((p) => !p.archivedAt)
    .map(enrich);
  const archived = options?.includeArchived
    ? registry.projects.filter((p) => p.archivedAt).map(enrich)
    : [];

  return { projects: active, archived };
}

export function operationalViewsByProjectId(
  views: ProjectOperationalView[],
): Map<string, ProjectOperationalView> {
  return new Map(views.map((p) => [p.projectId, p]));
}
