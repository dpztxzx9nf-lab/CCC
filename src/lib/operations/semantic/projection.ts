import type { SectorId } from "@/data/types";
import { ALL_SECTOR_IDS } from "@/lib/operations/taxonomy";
import {
  MEANING_SECTOR,
  OPERATOR_MEANING_AFFINITY,
  SEMANTIC_PRESSURE_SCALE,
} from "./constants";
import type { SemanticDerivationResult, SemanticOperationalEvent } from "./types";

function emptySectorRecord(): Record<SectorId, number> {
  const o = {} as Record<SectorId, number>;
  for (const id of ALL_SECTOR_IDS) o[id] = 0;
  return o;
}

/** Feed semantic meaning into sector environmental pressure */
export function buildSemanticEnvironmentalBoost(
  events: SemanticOperationalEvent[],
): Record<SectorId, number> {
  const boost = emptySectorRecord();
  for (const e of events) {
    const primary = MEANING_SECTOR[e.meaning] ?? e.sector;
    const w = e.confidence * SEMANTIC_PRESSURE_SCALE;
    boost[primary] += w;
    for (const s of e.sectors) {
      if (s !== primary) boost[s] += w * 0.25;
    }
  }
  return boost;
}

const OPERATOR_IDS = [
  "nexus-7",
  "deep-1",
  "fab-0",
  "bcast-1",
  "scout-6",
] as const;

/** Operator preference boost from interpreted meanings */
export function buildSemanticOperatorBoost(
  events: SemanticOperationalEvent[],
): Record<string, number> {
  const boost: Record<string, number> = {};
  for (const opId of OPERATOR_IDS) boost[opId] = 0;

  for (const e of events) {
    for (const opId of OPERATOR_IDS) {
      const affinity = OPERATOR_MEANING_AFFINITY[opId]?.[e.meaning] ?? 0;
      if (affinity <= 0) continue;
      boost[opId] += e.confidence * affinity * 0.35;
    }
  }
  return boost;
}

/** Apply projection boosts onto derivation result */
export function applySemanticProjection(
  result: SemanticDerivationResult,
): SemanticDerivationResult {
  const environmentalPressureBoost = buildSemanticEnvironmentalBoost(
    result.events,
  );
  const operatorMeaningBoost = buildSemanticOperatorBoost(result.events);
  return {
    referenceTime: result.referenceTime,
    events: result.events,
    environmentalPressureBoost,
    operatorMeaningBoost,
  };
}
