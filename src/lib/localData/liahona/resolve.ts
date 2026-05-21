import type { RawScannedProject } from "@/lib/localData/scanners";
import { LIAHONA_ECOSYSTEM_ID } from "./types";

const LIAHONA_HINT = /liahona/i;

/** Primary Liahona continuity project from scan roots */
export function resolveLiahonaProject(
  projects: RawScannedProject[],
): RawScannedProject | null {
  const direct = projects.find(
    (p) =>
      p.id === "projects-liahona" ||
      LIAHONA_HINT.test(p.id) ||
      LIAHONA_HINT.test(p.name) ||
      /[\\/]Liahona$/i.test(p.path),
  );
  return direct ?? null;
}

export function liahonaProjectId(project: RawScannedProject): string {
  return LIAHONA_ECOSYSTEM_ID;
}
