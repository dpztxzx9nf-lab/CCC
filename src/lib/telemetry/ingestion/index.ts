export type {
  IngestionAdapterId,
  AutomationReadiness,
  AutomationReadinessStatus,
  IngestionAdapterResult,
  AIIngestionReport,
  TelemetryIngestionAdapter,
} from "./types";
export { TELEMETRY_INGESTION_ADAPTERS, getIngestionAdapter } from "./registry";
export { runTelemetryIngestion } from "./run";
