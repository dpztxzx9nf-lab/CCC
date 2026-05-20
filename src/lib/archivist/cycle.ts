import type { ArchivistConfig } from "@/lib/localData/archivist-config";
import { classifyFileChange } from "./classify-change";
import { consolidateChanges } from "./consolidate";
import { deploySnapshot, runBuild } from "./deploy";
import { isIgnoredPath } from "./noise";
import { recordEventsFromCycle } from "@/lib/continuity/events/pipeline";
import {
  recordOperationalDeployOutcome,
  recordOperationalFileSignalsFromCycle,
} from "@/lib/continuity/events/operationalPipeline";
import { writeContinuitySnapshot } from "./snapshot-write";

export interface CycleOptions {
  dryRun?: boolean;
  changedPaths?: string[];
}

export interface CycleResult {
  consolidation: ReturnType<typeof consolidateChanges>;
  snapshotWritten: boolean;
  deployResult: { pushed: boolean; commitHash: string | null; skippedReason: string | null };
  logs: string[];
}

let lastDeployAt = 0;

export function resetDeployCooldown(): void {
  lastDeployAt = 0;
}

export async function runArchivistCycle(
  config: ArchivistConfig,
  options: CycleOptions = {},
): Promise<CycleResult> {
  const logs: string[] = [];
  const paths = options.changedPaths ?? [];
  const dryRun = options.dryRun ?? false;

  const classified = paths
    .filter((p) => !isIgnoredPath(p))
    .map((p) => classifyFileChange(p, config.watchRoots));

  logs.push(`ARCHIVIST-0 observed ${paths.length} changes`);

  if (classified.length === 0) {
    logs.push("consolidated: no meaningful changes after filter");
    logs.push("significance: ignore");
    return {
      consolidation: consolidateChanges([], config),
      snapshotWritten: false,
      deployResult: { pushed: false, commitHash: null, skippedReason: "no changes" },
      logs,
    };
  }

  const consolidation = consolidateChanges(classified, config);
  const top = consolidation.activities[0];

  if (top) {
    logs.push(`consolidated: ${top.summary}`);
  } else {
    logs.push("consolidated: activity dispersed");
  }

  logs.push(`significance: ${consolidation.significance}`);

  if (consolidation.lockfileOnly) {
    logs.push("note: lockfile-only batch — significance capped");
  }

  if (!dryRun && classified.length > 0) {
    try {
      await recordOperationalFileSignalsFromCycle(config, classified, consolidation);
      logs.push("operational file signals persisted");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logs.push(`operational file signals skipped: ${msg}`);
    }
  }

  let snapshotWritten = false;
  let snapshotMeta: { projectCount: number; signalCount: number } | undefined;
  let deployResult = {
    pushed: false,
    commitHash: null as string | null,
    skippedReason: null as string | null,
  };

  const shouldSnapshot =
    consolidation.significance === "snapshot" ||
    consolidation.significance === "deploy-worthy";

  if (shouldSnapshot && config.autoSnapshot) {
    if (dryRun) {
      logs.push("snapshot skipped: dry run");
    } else {
      const written = await writeContinuitySnapshot(config);
      snapshotWritten = true;
      snapshotMeta = {
        projectCount: written.projectCount,
        signalCount: written.signalCount,
      };
      logs.push("snapshot updated");
    }
  } else if (shouldSnapshot && !config.autoSnapshot) {
    logs.push("snapshot skipped: autoSnapshot disabled");
  } else if (consolidation.significance === "observe") {
    logs.push("snapshot skipped: observe only");
  } else {
    logs.push("snapshot skipped: below threshold");
  }

  if (consolidation.significance === "deploy-worthy") {
    if (!config.autoDeploy) {
      logs.push("deploy skipped: autoDeploy disabled");
    } else if (dryRun) {
      logs.push("deploy skipped: dry run");
    } else {
      const cooldownMs = config.deployCooldownMinutes * 60 * 1000;
      const sinceDeploy = Date.now() - lastDeployAt;
      if (lastDeployAt > 0 && sinceDeploy < cooldownMs) {
        const waitMin = Math.ceil((cooldownMs - sinceDeploy) / 60000);
        logs.push(`deploy skipped: cooldown (${waitMin}m remaining)`);
      } else {
        const buildOk = await runBuild(config);
        if (!buildOk) {
          logs.push("deploy skipped: build failed");
        } else {
          deployResult = await deploySnapshot(config);
          if (deployResult.pushed && deployResult.commitHash) {
            lastDeployAt = Date.now();
            logs.push(`deploy pushed: ${deployResult.commitHash}`);
          } else {
            logs.push(`deploy skipped: ${deployResult.skippedReason ?? "unknown"}`);
          }
        }
      }
    }
  }

  const result = { consolidation, snapshotWritten, deployResult, logs };

  if (!dryRun) {
    try {
      const { appended, total } = await recordEventsFromCycle(
        config,
        result,
        snapshotMeta,
      );
      if (appended > 0) {
        logs.push(`events recorded: ${appended} (${total} in log)`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logs.push(`events skipped: ${msg}`);
    }
  }

  if (!dryRun) {
    try {
      await recordOperationalDeployOutcome(config, consolidation, deployResult);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logs.push(`operational deploy signal skipped: ${msg}`);
    }
  }

  return result;
}
