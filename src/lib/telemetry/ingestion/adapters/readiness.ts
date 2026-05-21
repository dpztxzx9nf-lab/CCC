import type { AIUsageSourceMethod } from "../../aiUsage";
import type {
  AutomationReadiness,
  AutomationReadinessStatus,
  IngestionAdapterId,
  IngestionAdapterResult,
} from "../types";

export function buildReadiness(
  partial: Omit<
    AutomationReadiness,
    "lastCheckedAt" | "tokenObservations" | "spendObservations"
  > & {
    tokenObservations?: number;
    spendObservations?: number;
  },
): AutomationReadiness {
  return {
    ...partial,
    lastCheckedAt: new Date().toISOString(),
    tokenObservations: partial.tokenObservations ?? 0,
    spendObservations: partial.spendObservations ?? 0,
  };
}

export function emptyResult(
  adapterId: IngestionAdapterId,
  label: string,
  provider: string,
  primarySourceMethod: AIUsageSourceMethod,
  status: AutomationReadinessStatus,
  reason: string,
  ready = false,
): IngestionAdapterResult {
  return {
    readiness: buildReadiness({
      adapterId,
      label,
      provider,
      ready,
      automated: ready && status === "active",
      primarySourceMethod,
      status,
      reason,
    }),
    tokenEntries: [],
    spendEntries: [],
  };
}
