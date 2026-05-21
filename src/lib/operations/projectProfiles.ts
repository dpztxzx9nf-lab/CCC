import type { SectorId } from "@/data/types";
import type { OperationalCategory } from "./taxonomy";
import type { OperatorId } from "./taxonomy";
import { createDefaultProjectRegistry } from "@/lib/projects/registry/seed";
import { activeRegistryEntries, registryEntryToProfile } from "@/lib/projects/registry/toProfile";

export interface ProjectProfile {
  id: string;
  canonicalName: string;
  localSlug: string | null;
  description: string;
  tagline: string;
  sectors: SectorId[];
  category: OperationalCategory;
  continuityPriority: number;
  operatorIds: OperatorId[];
  stack: string[];
  deploymentCapable: boolean;
  repoExpected: boolean;
  systemsAffected: string[];
}

const FALLBACK_PROFILES: ProjectProfile[] = activeRegistryEntries(
  createDefaultProjectRegistry(),
).map(registryEntryToProfile);

let profileCache: ProjectProfile[] | null = null;

export function invalidateProjectProfilesCache(): void {
  profileCache = null;
}

/** Client-safe profile list (seed fallback until server refresh). */
export function getProjectProfiles(): ProjectProfile[] {
  return profileCache ?? FALLBACK_PROFILES;
}

export function setProjectProfilesCache(profiles: ProjectProfile[]): void {
  profileCache = profiles;
}

export function getProjectProfile(id: string): ProjectProfile | undefined {
  return getProjectProfiles().find((p) => p.id === id);
}

export function getProfileByLocalSlug(slug: string): ProjectProfile | undefined {
  return getProjectProfiles().find((p) => p.localSlug === slug);
}
