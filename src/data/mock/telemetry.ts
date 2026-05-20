import type { TelemetryMetric } from "../types";

/** No fabricated metrics — CCC substrate reads from operational snapshots + ledger elsewhere */
export const mockTelemetry: TelemetryMetric[] = [];
