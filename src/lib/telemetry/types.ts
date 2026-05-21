export interface TelemetryMetricValue<T = number> {
  value: T | null;
  source: string;
  available: boolean;
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
  apiSpend?: TelemetryMetricValue<number>;
  tokenUsage?: TelemetryMetricValue<number>;
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
