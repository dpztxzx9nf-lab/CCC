import { runTelemetryIngestion } from "./ingestion";
import { collectAISpend } from "./collectors/aiSpend";
import { collectAITokenUsage } from "./collectors/aiTokens";
import { collectEmbeddingTelemetry } from "./collectors/embeddings";
import { collectPm2Telemetry } from "./collectors/pm2";
import { collectQueueTelemetry } from "./collectors/queue";
import {
  collectStorageTelemetry,
  resolveSnapshotGeneratedAt,
} from "./collectors/storage";
import {
  spendMetricFromSummary,
  tokenMetricFromSummary,
} from "./collectors/aiUsageCollect";
import type { AIUsageTool, AIToolCollectionStatus } from "./aiUsage";
import type { AIIngestionReport } from "./ingestion";
import type { IngestionAdapterId } from "./ingestion";
import type { OperationalTelemetry } from "./types";

const TOOL_ADAPTER_HINTS: Partial<
  Record<AIUsageTool, IngestionAdapterId[]>
> = {
  openai_api: ["openai_api", "export_watcher"],
  anthropic_api: ["anthropic_api", "export_watcher"],
  liahona: ["liahona_writer"],
  chatgpt: ["invoice_inbox", "export_watcher"],
  cursor: ["invoice_inbox", "export_watcher"],
  codex: ["invoice_inbox", "export_watcher"],
  claude_code: ["invoice_inbox", "export_watcher"],
  github_copilot: ["invoice_inbox", "export_watcher"],
};

function applyIngestionReadiness(
  status: AIToolCollectionStatus[],
  ingestion: AIIngestionReport,
): AIToolCollectionStatus[] {
  const byId = new Map(ingestion.adapters.map((a) => [a.adapterId, a]));
  return status.map((row) => {
    const hints = TOOL_ADAPTER_HINTS[row.tool] ?? [];
    const related = hints
      .map((id) => byId.get(id))
      .filter((a): a is NonNullable<typeof a> => !!a);
    let tokenReason = row.tokenUnavailableReason;
    let spendReason = row.spendUnavailableReason;
    if (!row.tokensAvailable && related.length > 0) {
      const best = related.find((a) => a.status !== "active") ?? related[0];
      if (best) {
        tokenReason = `${tokenReason} [${best.adapterId}: ${best.reason}]`;
      }
    }
    if (!row.spendAvailable && related.length > 0) {
      const best = related.find((a) => a.status !== "active") ?? related[0];
      if (best) {
        spendReason = `${spendReason} [${best.adapterId}: ${best.reason}]`;
      }
    }
    return { ...row, tokenUnavailableReason: tokenReason, spendUnavailableReason: spendReason };
  });
}

function mergeToolStatus(
  tokenStatus: AIToolCollectionStatus[],
  spendStatus: AIToolCollectionStatus[],
): AIToolCollectionStatus[] {
  return tokenStatus.map((t) => {
    const s = spendStatus.find((x) => x.tool === t.tool);
    if (!s) return t;
    return {
      ...t,
      spendAvailable: s.spendAvailable,
      spendSources: s.spendSources,
      spendUnavailableReason: s.spendUnavailableReason,
    };
  });
}

/** Server-only: gather observable operational telemetry (no fabricated metrics) */
export async function gatherOperationalTelemetry(
  cwd = process.cwd(),
): Promise<OperationalTelemetry> {
  const aiIngestion = await runTelemetryIngestion(cwd);

  const [
    storage,
    aiTokenUsage,
    aiSpend,
    embeddingCount,
    queueDepth,
    runtime,
    generatedAt,
  ] = await Promise.all([
    collectStorageTelemetry(cwd),
    collectAITokenUsage(cwd),
    collectAISpend(cwd),
    collectEmbeddingTelemetry(cwd),
    collectQueueTelemetry(cwd),
    collectPm2Telemetry(),
    resolveSnapshotGeneratedAt(cwd),
  ]);

  let toolStatus = mergeToolStatus(
    aiTokenUsage.toolStatus,
    aiSpend.toolStatus,
  );
  toolStatus = applyIngestionReadiness(toolStatus, aiIngestion);
  aiTokenUsage.toolStatus = toolStatus;
  aiSpend.toolStatus = toolStatus;

  const snapshot = {
    ...storage.snapshot,
    generatedAt: storage.snapshot.generatedAt ?? generatedAt,
  };

  return {
    collectedAt: new Date().toISOString(),
    tokenUsage: tokenMetricFromSummary(aiTokenUsage),
    apiSpend: spendMetricFromSummary(aiSpend),
    aiTokenUsage,
    aiSpend,
    aiIngestion,
    embeddingCount,
    queueDepth,
    snapshot,
    events: storage.events,
    runtime,
  };
}
