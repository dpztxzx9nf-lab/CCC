import type { ArchivistConfig } from "@/lib/localData/archivist-config";
import type { CycleResult } from "@/lib/archivist/cycle";
import { generateEventsFromCycle, generateManualSnapshotEvent } from "./generate";
import { appendContinuityEvents } from "./store";

export async function recordEventsFromCycle(
  config: ArchivistConfig,
  cycle: CycleResult,
  snapshotMeta?: { projectCount: number; signalCount: number },
): Promise<{ appended: number; total: number }> {
  const events = generateEventsFromCycle({
    consolidation: cycle.consolidation,
    snapshotWritten: cycle.snapshotWritten,
    deployResult: cycle.deployResult,
    snapshotMeta,
    source: "archivist",
  });

  return appendContinuityEvents(config, events);
}

export async function recordManualSnapshotEvent(
  config: ArchivistConfig,
  meta: { projectCount: number; signalCount: number },
): Promise<{ appended: number; total: number }> {
  const event = generateManualSnapshotEvent(meta);
  return appendContinuityEvents(config, [event]);
}
