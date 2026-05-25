import path from "path";
import { readUtf8ContinuityJsonFile, writeUtf8ContinuityJson } from "@/lib/encoding/json-io";
import {
  appendOperationalEvents,
  readContinuityEventLog,
} from "@/lib/continuity/events/store";
import { deriveContinuityHistoryOperationalEvents } from "@/lib/continuity/history";
import { scanAllSnapshotRoots } from "@/lib/localData/scanners";
import { deriveEcosystemOperationalSignals } from "@/lib/localData/ecosystems";
import { deriveGitOperationalSignals } from "@/lib/operations/signals/gitSignals";
import { deriveHistoricalContinuitySignals } from "@/lib/operations/signals/historicalContinuity";
import { derivePm2RuntimeOperationalSignals } from "@/lib/operations/signals/pm2Runtime.server";
import { mergeDiscoveredProjectsIntoRegistry } from "@/lib/projects/registry/discovery";
import { buildManifestRefFromRegistry } from "@/lib/substrate/manifest-ref";
import { buildContinuitySnapshot } from "@/lib/snapshot/buildFromScan";
import { parseContinuitySnapshot } from "@/lib/snapshot/parseSnapshot";
import type { ArchivistConfig } from "@/lib/localData/archivist-config";
import type { ContinuitySnapshot } from "@/lib/snapshot/types";

async function readPreviousSnapshot(
  outputPath: string,
): Promise<ContinuitySnapshot | null> {
  try {
    const data: unknown = await readUtf8ContinuityJsonFile(outputPath);
    return parseContinuitySnapshot(data);
  } catch {
    return null;
  }
}

export async function writeContinuitySnapshot(
  config: ArchivistConfig,
): Promise<{ outputPath: string; projectCount: number; signalCount: number }> {
  const outputPath = path.join(config.cccProjectRoot, config.snapshotOutputRelative);
  const previousSnapshot = await readPreviousSnapshot(outputPath);
  const { projects, scanRoots } = await scanAllSnapshotRoots();
  await mergeDiscoveredProjectsIntoRegistry(projects, config.cccProjectRoot);
  const log = await readContinuityEventLog(config);
  const operational = log.operationalEvents ?? [];
  const [gitSignals, ecosystemSignals, pm2Signals] = await Promise.all([
    deriveGitOperationalSignals(projects),
    deriveEcosystemOperationalSignals(projects),
    derivePm2RuntimeOperationalSignals(),
  ]);
  const operationalSignals = [...gitSignals, ...ecosystemSignals, ...pm2Signals];
  const initialHistoricalSignals = deriveHistoricalContinuitySignals({
    operationalEvents: operational,
    continuityEvents: log.events,
    operationalSignals,
  });
  const manifestRef = buildManifestRefFromRegistry(config.cccProjectRoot);
  const provisionalSnapshot = buildContinuitySnapshot(
    projects,
    scanRoots,
    operational,
    [...operationalSignals, ...initialHistoricalSignals],
    {
      manifestRef,
      hostId: process.env.CCC_HOST_ID,
    },
  );

  const historyEvents = deriveContinuityHistoryOperationalEvents(
    previousSnapshot,
    provisionalSnapshot,
  );
  const operationalWithHistory = [...historyEvents, ...operational];
  const historicalSignals = deriveHistoricalContinuitySignals({
    operationalEvents: operationalWithHistory,
    continuityEvents: log.events,
    operationalSignals,
  });
  const snapshot = buildContinuitySnapshot(
    projects,
    scanRoots,
    operationalWithHistory,
    [...operationalSignals, ...historicalSignals],
    {
      manifestRef,
      hostId: process.env.CCC_HOST_ID,
    },
  );

  await writeUtf8ContinuityJson(outputPath, snapshot);
  await appendOperationalEvents(config, historyEvents);

  return {
    outputPath,
    projectCount: snapshot.projects.length,
    signalCount: snapshot.signals.length,
  };
}
