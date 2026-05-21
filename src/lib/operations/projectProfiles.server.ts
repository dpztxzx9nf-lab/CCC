import "server-only";

import { loadProjectRegistrySync } from "@/lib/projects/registry/store";
import {
  activeRegistryEntries,
  registryEntryToProfile,
} from "@/lib/projects/registry/toProfile";
import { createDefaultProjectRegistry } from "@/lib/projects/registry/seed";
import type { ProjectProfile } from "./projectProfiles";

export function loadServerProjectProfiles(): ProjectProfile[] {
  try {
    const registry = loadProjectRegistrySync();
    return activeRegistryEntries(registry).map(registryEntryToProfile);
  } catch {
    return activeRegistryEntries(createDefaultProjectRegistry()).map(
      registryEntryToProfile,
    );
  }
}
