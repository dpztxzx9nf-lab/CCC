/**
 * Normalized signal contract (types only — Phase 0).
 * No normalizer implementation; snapshot still uses ContinuitySnapshotSignal.
 */

import type { OperationalDomainId } from "@/data/ecology";
import type { ActivityKind } from "@/lib/operations/taxonomy";

export type SignalSource =
  | "scan-full"
  | "scan-light"
  | "watch-delta"
  | "git-adapter"
  | "ecosystem-adapter"
  | "telemetry-adapter";

export type NormalizedSignalSeverity = "info" | "low" | "medium" | "high";

export interface NormalizedSignal {
  id: string;
  observedAt: string;
  projectId: string | null;
  source: SignalSource;
  type: string;
  severity: NormalizedSignalSeverity;
  weight: number;
  activityKind: ActivityKind;
  evidence: Record<string, string | number | boolean>;
}

export type SignalSectorRoutingRule =
  | "activity-map"
  | "path-hint"
  | "type-route";

/** Derived sector projection — not persisted on snapshot signals in Phase 0 */
export interface SignalSectorProjection {
  primaryDomain: OperationalDomainId;
  secondaryDomains: OperationalDomainId[];
  routingRule: SignalSectorRoutingRule;
}
