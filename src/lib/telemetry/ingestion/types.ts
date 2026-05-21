import type {
  AIUsageSourceMethod,
  AISpendRecord,
  AITokenUsageRecord,
} from "../aiUsage";

export type IngestionAdapterId =
  | "openai_api"
  | "anthropic_api"
  | "vercel"
  | "github"
  | "pm2_runtime"
  | "liahona_writer"
  | "invoice_inbox"
  | "export_watcher";

export type AutomationReadinessStatus =
  | "active"
  | "configured"
  | "missing_credentials"
  | "no_data"
  | "not_implemented"
  | "error";

export interface AutomationReadiness {
  adapterId: IngestionAdapterId;
  label: string;
  provider: string;
  ready: boolean;
  automated: boolean;
  primarySourceMethod: AIUsageSourceMethod;
  status: AutomationReadinessStatus;
  reason: string;
  lastCheckedAt: string;
  tokenObservations: number;
  spendObservations: number;
}

export interface IngestionAdapterResult {
  readiness: AutomationReadiness;
  tokenEntries: AITokenUsageRecord[];
  spendEntries: AISpendRecord[];
}

export interface AIIngestionReport {
  ranAt: string;
  adapters: AutomationReadiness[];
  ingestedTokenEntries: number;
  ingestedSpendEntries: number;
  skippedDuplicates: number;
}

export interface TelemetryIngestionAdapter {
  id: IngestionAdapterId;
  label: string;
  provider: string;
  primarySourceMethod: AIUsageSourceMethod;
  collect(cwd: string): Promise<IngestionAdapterResult>;
}
