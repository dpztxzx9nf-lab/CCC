import { loadDedupeIndex } from "./dedupe";
import {
  persistIngestionResults,
  runtimeObservationIdFromSnapshot,
} from "./persist";
import { TELEMETRY_INGESTION_ADAPTERS } from "./registry";
import type { AIIngestionReport, IngestionAdapterResult } from "./types";

export async function runTelemetryIngestion(
  cwd = process.cwd(),
): Promise<AIIngestionReport> {
  const ranAt = new Date().toISOString();
  const results: IngestionAdapterResult[] = await Promise.all(
    TELEMETRY_INGESTION_ADAPTERS.map((adapter) => adapter.collect(cwd)),
  );

  const pm2Result = results.find((r) => r.readiness.adapterId === "pm2_runtime");
  let runtimeObservationId: string | null = null;
  if (pm2Result) {
    const { readPersistedRuntimeFallback } = await import(
      "../persistence/stores"
    );
    const runtime = await readPersistedRuntimeFallback(cwd);
    if (runtime) {
      runtimeObservationId = runtimeObservationIdFromSnapshot(runtime);
    }
  }

  const stats = await persistIngestionResults(cwd, results, {
    runtimeObservationId,
  });

  const index = await loadDedupeIndex(cwd);

  return {
    ranAt,
    adapters: results.map((r) => r.readiness),
    ingestedTokenEntries: stats.ingestedTokenEntries,
    ingestedSpendEntries: stats.ingestedSpendEntries,
    skippedDuplicates: stats.skippedDuplicates,
    skippedToken: stats.skippedToken,
    skippedSpend: stats.skippedSpend,
    dedupe: {
      indexUpdatedAt: index.updatedAt,
      observationsIndexed: Object.keys(index.observations).length,
      lastSkippedDuplicates: index.ingestion.lastSkippedDuplicates,
      totalRuns: index.ingestion.totalRuns,
      totalSkippedDuplicates: index.ingestion.totalSkippedDuplicates,
    },
  };
}
