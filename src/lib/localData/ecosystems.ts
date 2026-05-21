import type { RawScannedProject } from "@/lib/localData/scanners";
import {
  deriveKindexOperationalSignals,
  evaluateKindexSemanticRules,
  resolveKindexScope,
} from "@/lib/localData/kindex";
import {
  deriveLiahonaOperationalSignals,
  evaluateLiahonaSemanticRules,
  resolveLiahonaProject,
} from "@/lib/localData/liahona";
import type { SemanticRuleCandidate } from "@/lib/operations/semantic/rules";
import type { OperationalSignal } from "@/lib/operations/types";

/** KINDEX + Liahona operational signals from observable continuity */
export async function deriveEcosystemOperationalSignals(
  projects: RawScannedProject[],
): Promise<OperationalSignal[]> {
  const [kindex, liahona] = await Promise.all([
    deriveKindexOperationalSignals(projects),
    deriveLiahonaOperationalSignals(projects),
  ]);
  return [...kindex, ...liahona];
}

export function evaluateEcosystemSemanticRules(
  projects: RawScannedProject[],
  signals: OperationalSignal[],
): SemanticRuleCandidate[] {
  const kindexScope = resolveKindexScope(projects);
  const liahona = resolveLiahonaProject(projects);
  return [
    ...evaluateKindexSemanticRules(kindexScope, signals),
    ...evaluateLiahonaSemanticRules(liahona, signals),
  ];
}
