import { randomUUID } from "crypto";
import type { ConsolidationResult } from "@/lib/archivist/consolidate";
import type { DeployResult } from "@/lib/archivist/deploy";
import type { ContinuityEventSource } from "./types";
import type { ContinuityEvent } from "./types";
import { operatorsForSectors } from "./attribution";
import {
  classifyConsolidation,
  classifyDeploy,
  classifySnapshotRefresh,
} from "./classify";

function buildEvent(
  classified: ReturnType<typeof classifyConsolidation> & object,
  source: ContinuityEventSource,
  evidence: ContinuityEvent["evidence"],
): ContinuityEvent {
  return {
    id: randomUUID(),
    occurredAt: new Date().toISOString(),
    kind: classified.kind,
    importance: classified.importance,
    title: classified.title,
    summary: classified.summary,
    sectors: classified.sectors,
    operators: operatorsForSectors(classified.sectors),
    projects: classified.projects,
    source,
    significance: classified.significance,
    evidence,
  };
}

export interface CycleEventInput {
  consolidation: ConsolidationResult;
  snapshotWritten: boolean;
  deployResult: DeployResult;
  snapshotMeta?: { projectCount: number; signalCount: number };
  source?: ContinuityEventSource;
}

/** Derive zero or more events from one ARCHIVIST cycle */
export function generateEventsFromCycle(input: CycleEventInput): ContinuityEvent[] {
  const events: ContinuityEvent[] = [];
  const source = input.source ?? "archivist";
  const { consolidation, snapshotWritten, deployResult } = input;

  const activity = classifyConsolidation(consolidation);
  if (activity?.shouldPersist) {
    const skipRedundantActivity =
      snapshotWritten &&
      activity.kind === "sector_activity" &&
      (consolidation.significance === "snapshot" ||
        consolidation.significance === "deploy-worthy");
    if (!skipRedundantActivity) {
      events.push(
        buildEvent(activity, source, {
          changeCount: consolidation.filteredChangeCount,
          totalScore: consolidation.totalScore,
          lockfileOnly: consolidation.lockfileOnly,
          snapshotWritten,
        }),
      );
    }
  }

  if (snapshotWritten && input.snapshotMeta) {
    const snap = classifySnapshotRefresh({
      projectCount: input.snapshotMeta.projectCount,
      signalCount: input.snapshotMeta.signalCount,
      manual: source === "manual",
    });
    events.push(
      buildEvent(snap, source, {
        changeCount: consolidation.filteredChangeCount,
        totalScore: consolidation.totalScore,
        lockfileOnly: consolidation.lockfileOnly,
        snapshotWritten: true,
      }),
    );
  }

  const deployEvent = classifyDeploy(deployResult, consolidation.significance);
  if (deployEvent?.shouldPersist) {
    events.push(
      buildEvent(deployEvent, source, {
        changeCount: consolidation.filteredChangeCount,
        totalScore: consolidation.totalScore,
        lockfileOnly: consolidation.lockfileOnly,
        snapshotWritten,
        deployCommit: deployResult.commitHash,
        deploySkippedReason: deployResult.skippedReason,
      }),
    );
  }

  return events;
}

export function generateManualSnapshotEvent(meta: {
  projectCount: number;
  signalCount: number;
}): ContinuityEvent {
  const classified = classifySnapshotRefresh({
    ...meta,
    manual: true,
  });
  return buildEvent(classified, "manual", {
    changeCount: 0,
    totalScore: 0,
    lockfileOnly: false,
    snapshotWritten: true,
  });
}
