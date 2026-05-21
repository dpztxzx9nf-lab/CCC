import "server-only";

import type { LocalContinuityReport } from "@/lib/localData/types";
import type { OperationalSnapshot } from "@/data/operational-types";
import { buildOperationalSnapshot as buildOperationalSnapshotCore } from "./operationalState";
import { loadServerProjectProfiles } from "./projectProfiles.server";

/** Server snapshot build using on-disk project registry. */
export function buildOperationalSnapshot(
  report: LocalContinuityReport | null,
): OperationalSnapshot {
  return buildOperationalSnapshotCore(report, loadServerProjectProfiles());
}
