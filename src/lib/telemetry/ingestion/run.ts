import { persistIngestionResults } from "./persist";
import { TELEMETRY_INGESTION_ADAPTERS } from "./registry";
import type { AIIngestionReport, IngestionAdapterResult } from "./types";

export async function runTelemetryIngestion(
  cwd = process.cwd(),
): Promise<AIIngestionReport> {
  const ranAt = new Date().toISOString();
  const results: IngestionAdapterResult[] = await Promise.all(
    TELEMETRY_INGESTION_ADAPTERS.map((adapter) => adapter.collect(cwd)),
  );

  const { ingestedTokenEntries, ingestedSpendEntries, skippedDuplicates } =
    await persistIngestionResults(cwd, results);

  return {
    ranAt,
    adapters: results.map((r) => r.readiness),
    ingestedTokenEntries,
    ingestedSpendEntries,
    skippedDuplicates,
  };
}
