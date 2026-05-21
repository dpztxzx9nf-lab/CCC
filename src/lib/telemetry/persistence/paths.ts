import path from "path";
import type { TelemetryStoreName } from "./schema";

export const TELEMETRY_DATA_DIR = "data/telemetry";

const FILE_BY_STORE: Record<TelemetryStoreName, string> = {
  "token-usage": "token-usage.json",
  "api-spend": "api-spend.json",
  embeddings: "embeddings.json",
  queue: "queue.json",
  runtime: "runtime.json",
};

export function telemetryStorePath(
  cwd: string,
  store: TelemetryStoreName,
): string {
  return path.join(cwd, TELEMETRY_DATA_DIR, FILE_BY_STORE[store]);
}

export function telemetryStoreSourceLabel(store: TelemetryStoreName): string {
  return `file:${TELEMETRY_DATA_DIR}/${FILE_BY_STORE[store]}`;
}
