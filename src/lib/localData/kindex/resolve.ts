import type { RawScannedProject } from "@/lib/localData/scanners";
import type { KindexScope } from "./types";
import { KINDEX_ECOSYSTEM_ID } from "./types";

const KINDEX_PATH_HINT = /[\\/]kindex/i;
const KINDEX_MEMBER_ID_HINT =
  /^secondbrain-nested-(continuity|architecture|archive|sources|projects)$/i;

/** Projects that participate in the KINDEX continuity ecosystem */
export function resolveKindexScope(
  projects: RawScannedProject[],
): KindexScope {
  const members = projects.filter(
    (p) =>
      KINDEX_PATH_HINT.test(p.path) ||
      KINDEX_PATH_HINT.test(p.id) ||
      KINDEX_PATH_HINT.test(p.name) ||
      KINDEX_MEMBER_ID_HINT.test(p.id) ||
      p.id === "projects-secondbrain",
  );

  const anchor =
    members.find((p) => KINDEX_PATH_HINT.test(p.path)) ??
    members.find((p) => p.id === "projects-secondbrain") ??
    members[0] ??
    null;

  return {
    ecosystemId: KINDEX_ECOSYSTEM_ID,
    projectId: KINDEX_ECOSYSTEM_ID,
    members,
    anchor,
  };
}
