/**
 * CCC operator interaction architecture.
 *
 * HOVER — situational operational awareness ("what is happening right now?")
 * CLICK — continuity / intelligence inspection ("what is this operator across time?")
 *
 * Hover must never duplicate dossier depth; click must never feel like a hover profile.
 */

export type OperatorInteractionMode = "hover-awareness" | "continuity-dossier";

/** Transient glance card — operational state only */
export interface OperatorHoverAwareness {
  /** Uppercase operational posture (e.g. BUILDING) */
  stateLabel: string;
  /** Current activity line */
  activity: string;
  /** Why the state is active — signal cause */
  cause: string | null;
  /** Recency · load · optional confidence */
  metrics: string;
  sectorTone: import("@/lib/operator-hover-language").OperatorSectorTone;
  hasLiveSignal: boolean;
}

/** Persistent inspection panel — assembled in operator-dossier-record */
export type { OperatorDossierRecord } from "@/lib/operator-dossier-record";
export type {
  OperatorInterpretationProfile,
  ClassifiedSubstrateSignal,
  SubstrateSignalKind,
} from "@/lib/operator-interpretation";
