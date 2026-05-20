import type { OperationalSnapshot } from "@/data/operational-types";
import type { CCCData } from "@/data/types";
import { getCCCDataSync } from "@/lib/data-source";
import { mergeOperationalIntoCCCData } from "@/lib/operations/merge";

export function applyOperationalSnapshot(
  base: CCCData,
  snapshot: OperationalSnapshot,
): CCCData {
  return mergeOperationalIntoCCCData(base, snapshot);
}

export function getInitialCommandData(): CCCData {
  return getCCCDataSync();
}
