import type { AISpendSummary, AITokenUsageSummary } from "./aiUsage";
import type { AIIngestionReport } from "./ingestion";

export interface TelemetryMetricValue<T = number> {
  value: T | null;
  source: string;
  available: boolean;
  sourceMethod?: import("./aiUsage").AIUsageSourceMethod;
  unavailableReason?: string;
}

export interface Pm2ProcessTelemetry {
  name: string;
  status: string;
  uptimeMs: number | null;
  restartCount: number | null;
  memoryMb: number | null;
  cpu: number | null;
  pmId: number | null;
}

export interface OperationalTelemetry {
  collectedAt: string;
  /** Rolled-up spend (non-estimated entries); see aiSpend for per-tool detail. */
  apiSpend?: TelemetryMetricValue<number>;
  /** Rolled-up tokens (non-estimated entries); see aiTokenUsage for per-tool detail. */
  tokenUsage?: TelemetryMetricValue<number>;
  /** Source-agnostic token usage across tools/vendors. */
  aiTokenUsage?: AITokenUsageSummary;
  /** Source-agnostic spend across tools/vendors. */
  aiSpend?: AISpendSummary;
  /** Last automated ingestion pass (adapter readiness + ingest counts). */
  aiIngestion?: AIIngestionReport;
  embeddingCount?: TelemetryMetricValue<number>;
  queueDepth?: TelemetryMetricValue<number>;
  snapshot: {
    bytes: number;
    kb: number;
    lastModified: string | null;
    generatedAt: string | null;
  };
  events: {
    count: number;
    bytes: number;
    railCount: number;
    operationalCount: number;
    logUpdatedAt: string | null;
  };
  runtime?: {
    pm2Available: boolean;
    processes: Pm2ProcessTelemetry[];
    archivist?: {
      name: string;
      status: string;
      available: boolean;
    };
  };
}

export type {
  AIUsageTool,
  AIUsageProvider,
  AIUsageSource,
  AIUsageSourceMethod,
  AITokenUsageRecord,
  AISpendRecord,
  AITokenUsageSummary,
  AISpendSummary,
  AIToolCollectionStatus,
} from "./aiUsage";
export type { AIIngestionReport, AutomationReadiness } from "./ingestion";
