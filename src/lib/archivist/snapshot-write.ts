import path from "path";
import { writeUtf8ContinuityJson } from "@/lib/encoding/json-io";
import { readContinuityEventLog } from "@/lib/continuity/events/store";
import { scanAllSnapshotRoots } from "@/lib/localData/scanners";
import { deriveEcosystemOperationalSignals } from "@/lib/localData/ecosystems";
import { deriveGitOperationalSignals } from "@/lib/operations/signals/gitSignals";
import { buildContinuitySnapshot } from "@/lib/snapshot/buildFromScan";
import type { ArchivistConfig } from "@/lib/localData/archivist-config";

export async function writeContinuitySnapshot(
  config: ArchivistConfig,
): Promise<{ outputPath: string; projectCount: number; signalCount: number }> {
  const { projects, scanRoots } = await scanAllSnapshotRoots();
  const log = await readContinuityEventLog(config);
  const operational = log.operationalEvents ?? [];
  const [gitSignals, ecosystemSignals] = await Promise.all([
    deriveGitOperationalSignals(projects),
    deriveEcosystemOperationalSignals(projects),
  ]);
  const operationalSignals = [...gitSignals, ...ecosystemSignals];
  const snapshot = buildContinuitySnapshot(
    projects,
    scanRoots,
    operational,
    operationalSignals,
  );
  const outputPath = path.join(config.cccProjectRoot, config.snapshotOutputRelative);

  await writeUtf8ContinuityJson(outputPath, snapshot);

  return {
    outputPath,
    projectCount: snapshot.projects.length,
    signalCount: snapshot.signals.length,
  };
}
