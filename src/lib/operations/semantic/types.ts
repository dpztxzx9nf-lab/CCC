import type { SectorId } from "@/data/types";

/** Continuity-level operational meaning (derived, not raw signal types) */
export type OperationalSemanticMeaning =
  | "architecture_shift"
  | "active_initiative"
  | "sustained_development_focus"
  | "infrastructure_instability"
  | "continuity_consolidation"
  | "initiative_emergence"
  | "reactivation_event"
  | "deployment_stabilization"
  | "ecosystem_expansion"
  | "deployment_progress";

export interface SemanticEvidence {
  signalCount: number;
  correlatedSignalTypes: string[];
  sustainedPressure?: number;
  momentum?: number;
  markdownCount?: number;
  recentActivityCount?: number;
}

/** Interpreted continuity event — observable correlation only */
export interface SemanticOperationalEvent {
  id: string;
  meaning: OperationalSemanticMeaning;
  confidence: number;
  timestamp: string;
  sector: SectorId;
  sectors: SectorId[];
  projectId: string | null;
  summary: string;
  source: "semantic:continuity";
  evidence: SemanticEvidence;
}

export interface SemanticDerivationResult {
  referenceTime: string;
  events: SemanticOperationalEvent[];
  environmentalPressureBoost: Record<SectorId, number>;
  operatorMeaningBoost: Record<string, number>;
}
