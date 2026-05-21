import type { OperationalTelemetry, Pm2ProcessTelemetry } from "../types";

export const TELEMETRY_PERSISTENCE_SCHEMA_VERSION = 1 as const;

export type TelemetryPersistenceSchemaVersion =
  typeof TELEMETRY_PERSISTENCE_SCHEMA_VERSION;

/** Max recent activity entries kept per store (rolling totals are always preserved). */
export const RECENT_MAX_ENTRIES = 120;

/** Drop recent entries older than this window (7 days). */
export const RECENT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export interface TelemetryRecentEntry {
  at: string;
  value: number;
  delta?: number;
  note?: string;
}

export interface TelemetryStoreBase {
  schemaVersion: TelemetryPersistenceSchemaVersion;
  createdAt: string;
  updatedAt: string;
}

export interface TokenUsageStore extends TelemetryStoreBase {
  rolling: { totalTokens: number | null };
  recent: TelemetryRecentEntry[];
}

export interface ApiSpendStore extends TelemetryStoreBase {
  rolling: { totalUsd: number | null };
  recent: TelemetryRecentEntry[];
}

export interface EmbeddingsStore extends TelemetryStoreBase {
  rolling: { count: number | null };
  recent: TelemetryRecentEntry[];
}

export interface QueueStore extends TelemetryStoreBase {
  rolling: { depth: number | null };
  recent: TelemetryRecentEntry[];
}

export interface RuntimeRecentEntry {
  at: string;
  pm2Available: boolean;
  processCount: number;
}

export interface RuntimeStore extends TelemetryStoreBase {
  rolling: {
    pm2Available: boolean | null;
    processCount: number | null;
  };
  recent: RuntimeRecentEntry[];
  lastSnapshot: {
    at: string;
    pm2Available: boolean;
    processes: Pm2ProcessTelemetry[];
    archivist?: NonNullable<OperationalTelemetry["runtime"]>["archivist"];
  } | null;
}

export type TelemetryStoreName =
  | "token-usage"
  | "api-spend"
  | "embeddings"
  | "queue"
  | "runtime";
