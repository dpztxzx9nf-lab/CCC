import type { SectorId } from "@/data/types";
import type { OperationalSemanticMeaning } from "./types";

/** Minimum confidence to emit a semantic event */
export const SEMANTIC_CONFIDENCE_FLOOR = 0.42;

/** Multi-signal correlation */
export const MIN_CORRELATED_SIGNALS = 2;

/** Temporal / pressure thresholds (observable scales) */
export const FORGE_SUSTAINED_THRESHOLD = 0.85;
export const ARCHIVE_SUSTAINED_THRESHOLD = 0.75;
export const RUNTIME_SUSTAINED_THRESHOLD = 0.7;
export const OBSERVATORY_SUSTAINED_THRESHOLD = 0.65;
export const RELAY_SUSTAINED_THRESHOLD = 0.6;

export const MOMENTUM_EMERGENCE_MIN = 1.25;
export const MOMENTUM_INITIATIVE_MIN = 1.15;

export const MARKDOWN_CORPUS_MIN = 5;
export const MARKDOWN_GROWTH_RECENT_MIN = 2;

export const DORMANT_ACTIVITY_SCORE_MAX = 16;
export const LOW_MOMENTUM_PROJECT_MAX = 12;

/** Sustained-pressure horizon (hours) before meaning is structurally persisted */
export const SEMANTIC_PERSISTENCE_HOURS: Partial<
  Record<OperationalSemanticMeaning, number>
> = {
  active_initiative: 48,
  sustained_development_focus: 72,
  continuity_consolidation: 96,
  infrastructure_instability: 24,
  initiative_emergence: 12,
  reactivation_event: 6,
  deployment_stabilization: 48,
  ecosystem_expansion: 72,
  architecture_shift: 120,
  deployment_progress: 36,
};

/** Environmental boost from semantic meaning (per sector, scaled by confidence) */
export const SEMANTIC_PRESSURE_SCALE = 0.55;

/** Map semantic meaning → primary sector pressure target */
export const MEANING_SECTOR: Record<OperationalSemanticMeaning, SectorId> = {
  architecture_shift: "core",
  active_initiative: "forge",
  sustained_development_focus: "forge",
  infrastructure_instability: "runtime",
  continuity_consolidation: "archive",
  initiative_emergence: "forge",
  reactivation_event: "forge",
  deployment_stabilization: "relay",
  ecosystem_expansion: "observatory",
  deployment_progress: "relay",
};

/** Operator affinity by meaning */
export const OPERATOR_MEANING_AFFINITY: Record<
  string,
  Partial<Record<OperationalSemanticMeaning, number>>
> = {
  "nexus-7": {
    architecture_shift: 1.2,
    continuity_consolidation: 1.1,
    ecosystem_expansion: 0.9,
  },
  "deep-1": {
    continuity_consolidation: 1.35,
    architecture_shift: 0.85,
  },
  "fab-0": {
    active_initiative: 1.3,
    sustained_development_focus: 1.25,
    infrastructure_instability: 1.1,
    reactivation_event: 1.0,
  },
  "bcast-1": {
    deployment_progress: 1.2,
    deployment_stabilization: 1.25,
  },
  "scout-6": {
    ecosystem_expansion: 1.3,
    initiative_emergence: 1.1,
  },
};
