import type { SectorId } from "@/data/types";
import type { SectorActivityClass } from "./types";
import {
  DORMANT_PRESSURE_MAX,
  DORMANT_STRUCTURAL_MAX,
  DORMANT_TRANSIENT_MAX,
  STRUCTURAL_BASELINE_THRESHOLD,
  SUSTAINED_PRESSURE_THRESHOLD,
  TRANSIENT_DOMINANCE_RATIO,
} from "./constants";

export interface SectorPressureSlice {
  sectorId: SectorId;
  transientPressure: number;
  sustainedPressure: number;
  historicalPressure: number;
  structuralBaseline: number;
  environmentalPressure: number;
}

export function classifySectorActivity(
  slice: SectorPressureSlice,
): SectorActivityClass {
  const {
    transientPressure,
    sustainedPressure,
    historicalPressure,
    structuralBaseline,
    environmentalPressure,
  } = slice;

  if (
    environmentalPressure < DORMANT_PRESSURE_MAX &&
    transientPressure < DORMANT_TRANSIENT_MAX &&
    structuralBaseline < DORMANT_STRUCTURAL_MAX
  ) {
    return "dormant";
  }

  if (
    structuralBaseline >= STRUCTURAL_BASELINE_THRESHOLD &&
    historicalPressure < 0.55 &&
    transientPressure < 0.45 &&
    sustainedPressure < SUSTAINED_PRESSURE_THRESHOLD * 0.6
  ) {
    return "structurally_active";
  }

  if (
    sustainedPressure >= SUSTAINED_PRESSURE_THRESHOLD ||
    (historicalPressure >= 0.85 && sustainedPressure >= 0.5)
  ) {
    return "sustained_load";
  }

  if (
    transientPressure >= 0.35 &&
    transientPressure >= sustainedPressure * TRANSIENT_DOMINANCE_RATIO
  ) {
    return "transient_active";
  }

  if (environmentalPressure > 0 || structuralBaseline > 0) {
    return sustainedPressure > transientPressure ? "sustained_load" : "transient_active";
  }

  return "dormant";
}
