import type { Project } from "@/data/types";
import type { ProjectProfile } from "@/lib/operations/projectProfiles";
import type { ProjectOperationalView } from "@/data/operational-types";
import type { ProjectRegistryEntry, ProjectRegistryStatus } from "./schema";

export function registryEntryToProfile(
  entry: ProjectRegistryEntry,
): ProjectProfile {
  return {
    id: entry.id,
    canonicalName: entry.name,
    localSlug: entry.localSlug,
    description: entry.description,
    tagline: entry.tagline,
    sectors: entry.domainIds,
    category: entry.category,
    continuityPriority: entry.continuityPriority,
    operatorIds: entry.operatorIds,
    stack: entry.stack,
    deploymentCapable: entry.deploymentCapable,
    repoExpected: entry.repoExpected,
    systemsAffected: entry.systemsAffected,
  };
}

export function registryEntryToProject(
  entry: ProjectRegistryEntry,
): Project {
  return {
    id: entry.id,
    name: entry.name,
    tagline: entry.tagline,
    status: entry.status,
    domainIds: entry.domainIds,
    sectorIds: entry.domainIds,
    description: entry.description,
    highlights: entry.highlights,
    ecosystem: entry.ecosystem,
  };
}

export interface EnrichedRegistryProject extends Project {
  registryStatus: ProjectRegistryStatus;
  linkedPaths: string[];
  urls: string[];
  localSlug: string | null;
  archived: boolean;
  activityDetected: boolean;
  activityLevel: string | null;
  topSignal: string | null;
  displayStatus: string;
}

export function enrichRegistryProject(
  entry: ProjectRegistryEntry,
  derived?: ProjectOperationalView | null,
): EnrichedRegistryProject {
  const base = registryEntryToProject(entry);
  const activityDetected = derived?.detected ?? false;
  const displayStatus =
    activityDetected && entry.status === "unlinked" ? "detected" : entry.status;

  const highlights = [...entry.highlights];
  if (derived?.detected && derived.topSignal) {
    const signalLine = `Signal: ${derived.topSignal}`;
    if (!highlights.includes(signalLine)) highlights.push(signalLine);
  }

  return {
    ...base,
    highlights,
    registryStatus: entry.status,
    linkedPaths: entry.linkedPaths,
    urls: entry.urls,
    localSlug: entry.localSlug,
    archived: Boolean(entry.archivedAt),
    activityDetected,
    activityLevel: derived?.activityLevel ?? null,
    topSignal: derived?.topSignal ?? null,
    displayStatus,
  };
}

export function activeRegistryEntries(
  registry: { projects: ProjectRegistryEntry[] },
): ProjectRegistryEntry[] {
  return registry.projects.filter((p) => !p.archivedAt);
}
