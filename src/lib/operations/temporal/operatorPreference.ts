import type { SectorId } from "@/data/types";
import type { TemporalContinuityModel } from "./types";
import {
  OP_WEIGHT_HISTORICAL,
  OP_WEIGHT_MOMENTUM,
  OP_WEIGHT_SUSTAINED,
  OP_WEIGHT_TRANSIENT,
} from "./constants";

/** Prefer sustained operational gravity over newest transient spike */
export function operatorSectorPreferenceScore(
  temporal: TemporalContinuityModel,
  sectorId: SectorId,
  semanticSectorBoost = 0,
): number {
  const s = temporal.sectors[sectorId];
  if (!s) return semanticSectorBoost * 0.5;
  return (
    s.sustainedPressure * OP_WEIGHT_SUSTAINED +
    s.momentum * OP_WEIGHT_MOMENTUM +
    s.historicalPressure * OP_WEIGHT_HISTORICAL +
    s.transientPressure * OP_WEIGHT_TRANSIENT +
    semanticSectorBoost
  );
}
