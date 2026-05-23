/**
 * Operator / sector attribution contract (types only — Phase 0).
 * Derivation code still uses legacy tables until Phase 1.
 */

import type { OperationalDomainId } from "@/data/ecology";
import type { OperatorId } from "@/lib/operations/taxonomy";

export const OPERATOR_ATTRIBUTION_POLICY_VERSION = 1 as const;

/** Target single ownership table (normative for Phase 1+) */
export const SUBSTRATE_SECTOR_OPERATOR_OWNERSHIP: Record<
  OperationalDomainId,
  OperatorId[]
> = {
  core: ["nexus-7", "scout-6"],
  archive: ["deep-1"],
  forge: ["fab-0"],
  runtime: ["fab-0"],
  relay: ["bcast-1"],
  observatory: ["scout-6"],
};

export const SUBSTRATE_FALLBACK_OPERATOR: OperatorId = "deep-1";

export type DomainAttributionSource = "manifest" | "scan" | "signal";
export type DomainAttributionConfidence = "authored" | "derived" | "inferred";

export type DomainPolicy = "manifest" | "scan-wins" | "manifest-wins";

export interface SectorAttribution {
  projectId: string;
  domains: {
    primary: OperationalDomainId;
    secondary: OperationalDomainId[];
    source: DomainAttributionSource;
    confidence: DomainAttributionConfidence;
  };
}

export interface OperatorAttributionPolicy {
  policyVersion: typeof OPERATOR_ATTRIBUTION_POLICY_VERSION;
  sectorOwnership: Record<OperationalDomainId, OperatorId[]>;
  fallbackOperator: OperatorId;
}

export function substrateOperatorAttributionPolicy(): OperatorAttributionPolicy {
  return {
    policyVersion: OPERATOR_ATTRIBUTION_POLICY_VERSION,
    sectorOwnership: SUBSTRATE_SECTOR_OPERATOR_OWNERSHIP,
    fallbackOperator: SUBSTRATE_FALLBACK_OPERATOR,
  };
}
