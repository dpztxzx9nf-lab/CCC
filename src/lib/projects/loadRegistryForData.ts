import type { Project } from "@/data/types";
import type { EnrichedRegistryProject } from "@/lib/projects/registry/toProfile";
import { registryEntryToProject } from "@/lib/projects/registry/toProfile";
import { createDefaultProjectRegistry } from "@/lib/projects/registry/seed";
import { activeRegistryEntries } from "@/lib/projects/registry/toProfile";

const SEED_PROJECTS = activeRegistryEntries(createDefaultProjectRegistry()).map(
  registryEntryToProject,
);

export function loadRegistryProjectsForData(): Project[] {
  return SEED_PROJECTS;
}

export function enrichedToProject(entry: EnrichedRegistryProject): Project {
  return {
    id: entry.id,
    name: entry.name,
    tagline: entry.tagline,
    status: entry.registryStatus,
    domainIds: entry.domainIds,
    sectorIds: entry.domainIds,
    description: entry.description,
    highlights: entry.highlights,
    ecosystem: entry.ecosystem,
  };
}
