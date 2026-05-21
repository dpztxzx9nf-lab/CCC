import { collectApiSpendTelemetry } from "./collectors/apiSpend";
import { collectEmbeddingTelemetry } from "./collectors/embeddings";
import { collectPm2Telemetry } from "./collectors/pm2";
import { collectQueueTelemetry } from "./collectors/queue";
import {
  collectStorageTelemetry,
  resolveSnapshotGeneratedAt,
} from "./collectors/storage";
import { collectTokenTelemetry } from "./collectors/tokens";
import type { OperationalTelemetry } from "./types";

/** Server-only: gather observable operational telemetry (no fabricated metrics) */
export async function gatherOperationalTelemetry(
  cwd = process.cwd(),
): Promise<OperationalTelemetry> {
  const [
    storage,
    apiSpend,
    tokenUsage,
    embeddingCount,
    queueDepth,
    runtime,
    generatedAt,
  ] = await Promise.all([
    collectStorageTelemetry(cwd),
    collectApiSpendTelemetry(cwd),
    collectTokenTelemetry(cwd),
    collectEmbeddingTelemetry(cwd),
    collectQueueTelemetry(cwd),
    collectPm2Telemetry(),
    resolveSnapshotGeneratedAt(cwd),
  ]);

  const snapshot = {
    ...storage.snapshot,
    generatedAt: storage.snapshot.generatedAt ?? generatedAt,
  };

  return {
    collectedAt: new Date().toISOString(),
    apiSpend,
    tokenUsage,
    embeddingCount,
    queueDepth,
    snapshot,
    events: storage.events,
    runtime,
  };
}
