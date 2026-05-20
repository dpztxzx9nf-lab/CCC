import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { readContinuityEventLog } from "@/lib/continuity/events/store";
import { scanAllSnapshotRoots } from "@/lib/localData/scanners";
import { deriveGitOperationalSignals } from "@/lib/operations/signals/gitSignals";
import { buildContinuitySnapshot } from "@/lib/snapshot/buildFromScan";
import type { ArchivistConfig } from "@/lib/localData/archivist-config";

export async function writeContinuitySnapshot(
  config: ArchivistConfig,
): Promise<{ outputPath: string; projectCount: number; signalCount: number }> {
  const { projects, scanRoots } = await scanAllSnapshotRoots();
  const log = await readContinuityEventLog(config);
  const operational = log.operationalEvents ?? [];
  const gitSignals = await deriveGitOperationalSignals(projects);
  const snapshot = buildContinuitySnapshot(
    projects,
    scanRoots,
    operational,
    gitSignals,
  );
  const outputPath = path.join(config.cccProjectRoot, config.snapshotOutputRelative);

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf-8");

  return {
    outputPath,
    projectCount: snapshot.projects.length,
    signalCount: snapshot.signals.length,
  };
}
