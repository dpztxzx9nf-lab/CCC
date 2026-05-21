import { anthropicIngestionAdapter } from "./adapters/anthropic";
import { exportWatcherAdapter } from "./adapters/exportWatcher";
import { githubIngestionAdapter } from "./adapters/github";
import { invoiceIngestionAdapter } from "./adapters/invoice";
import { liahonaIngestionAdapter } from "./adapters/liahona";
import { openaiIngestionAdapter } from "./adapters/openai";
import { pm2IngestionAdapter } from "./adapters/pm2";
import { vercelIngestionAdapter } from "./adapters/vercel";
import type { TelemetryIngestionAdapter } from "./types";

/** Registered provider adapters (order = execution order). */
export const TELEMETRY_INGESTION_ADAPTERS: readonly TelemetryIngestionAdapter[] =
  [
    openaiIngestionAdapter,
    anthropicIngestionAdapter,
    vercelIngestionAdapter,
    githubIngestionAdapter,
    pm2IngestionAdapter,
    liahonaIngestionAdapter,
    exportWatcherAdapter,
    invoiceIngestionAdapter,
  ] as const;

export function getIngestionAdapter(
  id: TelemetryIngestionAdapter["id"],
): TelemetryIngestionAdapter | undefined {
  return TELEMETRY_INGESTION_ADAPTERS.find((a) => a.id === id);
}
