import type { TelemetryMetric } from "../types";

/** All values are mock/demo — labeled in UI */
export const mockTelemetry: TelemetryMetric[] = [
  { id: "revenue", label: "Total revenue", value: "$128.4K", hint: "demo" },
  { id: "mrr", label: "MRR", value: "$12.8K", hint: "demo" },
  { id: "projects", label: "Active projects", value: "6" },
  { id: "deploys", label: "Deployments (30d)", value: "24", hint: "demo" },
  { id: "runtime", label: "Runtime health", value: "98.2%" },
  { id: "api-cost", label: "API cost (MTD)", value: "$342", hint: "demo" },
  { id: "tokens", label: "Tokens (7d)", value: "2.1M", hint: "demo" },
  { id: "operators", label: "Active operators", value: "5" },
];
