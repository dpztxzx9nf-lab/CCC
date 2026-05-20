import type { ArchivistConfig } from "@/lib/localData/archivist-config";
import type { ClassifiedChange } from "@/lib/archivist/classify-change";
import type { ConsolidationResult } from "@/lib/archivist/consolidate";
import type { DeployResult } from "@/lib/archivist/deploy";
import {
  normalizeClassifiedChanges,
  normalizeOperationalSignal,
} from "@/lib/operations/normalizeEvent";
import { appendOperationalEvents, readContinuityEventLog } from "./store";

/** File/watch signals — persisted before snapshot write so augmentation matches the cycle */
export async function recordOperationalFileSignalsFromCycle(
  config: ArchivistConfig,
  classified: ClassifiedChange[],
  consolidation: ConsolidationResult,
): Promise<{ appended: number; total: number }> {
  const ops = normalizeClassifiedChanges(classified, {
    lockfileOnly: consolidation.lockfileOnly,
  });
  return appendOperationalEvents(config, ops);
}

/**
 * Deploy outcome — after snapshot/deploy attempt.
 * May appear in continuity-events.json before the next snapshot regeneration.
 */
export async function recordOperationalDeployOutcome(
  config: ArchivistConfig,
  consolidation: ConsolidationResult,
  deployResult: DeployResult,
): Promise<{ appended: number; total: number }> {
  if (consolidation.significance !== "deploy-worthy" && !deployResult.pushed) {
    const log = await readContinuityEventLog(config);
    return { appended: 0, total: log.operationalEvents?.length ?? 0 };
  }

  const op = normalizeOperationalSignal({
    kind: "deploy_outcome",
    deployed: deployResult.pushed,
    commitHash: deployResult.commitHash,
    skippedReason: deployResult.skippedReason,
    significanceTier: consolidation.significance,
  });

  return appendOperationalEvents(config, [op]);
}
