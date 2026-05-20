import { MIN_CORRELATED_SIGNALS, SEMANTIC_CONFIDENCE_FLOOR } from "./constants";
import type { SemanticEvidence } from "./types";

/** Confidence from correlated observable evidence — no LLM */
export function scoreSemanticConfidence(
  evidence: SemanticEvidence,
  requiredSignals: number = MIN_CORRELATED_SIGNALS,
): number {
  const { signalCount, correlatedSignalTypes, sustainedPressure = 0, momentum = 0 } =
    evidence;

  if (signalCount < requiredSignals) return 0;

  let c = 0.38;
  c += Math.min(0.28, (signalCount - requiredSignals) * 0.08);
  c += Math.min(0.18, correlatedSignalTypes.length * 0.05);
  if (sustainedPressure >= 0.85) c += 0.12;
  else if (sustainedPressure >= 0.5) c += 0.06;
  if (momentum >= 1.2) c += 0.1;
  else if (momentum >= 1) c += 0.04;

  return Math.min(0.96, Math.max(0, c));
}

export function passesConfidenceFloor(confidence: number): boolean {
  return confidence >= SEMANTIC_CONFIDENCE_FLOOR;
}
