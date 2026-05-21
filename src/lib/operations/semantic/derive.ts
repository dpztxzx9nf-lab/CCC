import { createHash } from "crypto";
import type { SectorId } from "@/data/types";
import type { RawScannedProject } from "@/lib/localData/scanners";
import type { OperationalSignal } from "../types";
import type { TemporalContinuityModel } from "../temporal/types";
import { passesConfidenceFloor } from "./confidence";
import {
  buildProjectProfiles,
  buildSectorProfiles,
} from "./correlate";
import { evaluateEcosystemSemanticRules } from "@/lib/localData/ecosystems";
import { evaluateProjectRules, evaluateSectorRules } from "./rules";
import { sanitizeContinuityText } from "@/lib/encoding";
import { applySemanticProjection } from "./projection";
import type {
  SemanticDerivationResult,
  SemanticOperationalEvent,
} from "./types";

export interface SemanticDerivationInput {
  signals: OperationalSignal[];
  temporal: TemporalContinuityModel;
  projects: RawScannedProject[];
  dormantProjectIds?: string[];
  activeProjectIds?: string[];
  referenceMs?: number;
}

function stableSemanticId(
  meaning: string,
  projectId: string | null,
  sector: SectorId,
): string {
  const digest = createHash("sha256")
    .update(`semantic\0${meaning}\0${projectId ?? "facility"}\0${sector}`)
    .digest("hex")
    .slice(0, 14);
  return `sem-${digest}`;
}

function dedupeCandidates(
  candidates: ReturnType<typeof evaluateProjectRules>,
): typeof candidates {
  const best = new Map<string, (typeof candidates)[0]>();
  for (const c of candidates) {
    const key = `${c.meaning}:${c.projectId ?? "global"}:${c.sector}`;
    const prev = best.get(key);
    if (!prev || c.confidence > prev.confidence) best.set(key, c);
  }
  return Array.from(best.values());
}

function toEvent(
  c: ReturnType<typeof evaluateProjectRules>[0],
  referenceTime: string,
): SemanticOperationalEvent {
  return {
    id: stableSemanticId(c.meaning, c.projectId, c.sector),
    meaning: c.meaning,
    confidence: Math.round(c.confidence * 100) / 100,
    timestamp: referenceTime,
    sector: c.sector,
    sectors: c.sectors,
    projectId: c.projectId,
    summary: sanitizeContinuityText(c.summary),
    source: "semantic:continuity",
    evidence: c.evidence,
  };
}

/**
 * Raw continuity → semantic interpretation → operational meaning.
 * Heuristic multi-signal correlation only.
 */
export function deriveSemanticOperationalLayer(
  input: SemanticDerivationInput,
): SemanticDerivationResult {
  const referenceMs = input.referenceMs ?? Date.parse(input.temporal.referenceTime) ?? Date.now();
  const referenceTime = new Date(referenceMs).toISOString();
  const dormant = input.dormantProjectIds ?? [];
  const active = input.activeProjectIds ?? [];

  const projectProfiles = buildProjectProfiles(
    input.projects,
    input.signals,
    input.temporal,
    dormant,
    active,
  );
  const sectorProfiles = buildSectorProfiles(projectProfiles, input.temporal);

  const rawCandidates = [
    ...projectProfiles.flatMap((p) => evaluateProjectRules(p)),
    ...evaluateSectorRules(sectorProfiles),
    ...evaluateEcosystemSemanticRules(input.projects, input.signals),
  ];

  const events: SemanticOperationalEvent[] = dedupeCandidates(rawCandidates)
    .filter((c) => passesConfidenceFloor(c.confidence))
    .map((c) => toEvent(c, referenceTime))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 32);

  return applySemanticProjection({
    referenceTime,
    events,
    environmentalPressureBoost: {} as Record<SectorId, number>,
    operatorMeaningBoost: {},
  });
}
