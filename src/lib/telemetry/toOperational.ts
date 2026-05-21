import type { DerivedTelemetryView } from "@/data/operational-types";
import {
  aiToolsObservedHint,
  compactTelemetryLines,
  formatBytes,
  formatInteger,
  formatUsd,
  metricDisplayValue,
  TELEMETRY_UNKNOWN,
} from "./format";
import type { OperationalTelemetry } from "./types";

/** Map facility telemetry into operational snapshot telemetry slots */
export function telemetryToDerivedViews(
  t: OperationalTelemetry,
): DerivedTelemetryView[] {
  const api = metricDisplayValue(t.apiSpend, formatUsd);
  const tokens = metricDisplayValue(t.tokenUsage, formatInteger);
  const emb = metricDisplayValue(t.embeddingCount, formatInteger);
  const queue = metricDisplayValue(t.queueDepth, formatInteger);

  const archivistStatus = t.runtime?.archivist?.available
    ? t.runtime.archivist.status
    : TELEMETRY_UNKNOWN;

  const rows: DerivedTelemetryView[] = [
    {
      id: "api-cost",
      label: "AI Spend",
      value: api.value,
      hint: api.resolved
        ? api.hint
        : t.aiSpend
          ? aiToolsObservedHint(
              t.aiSpend.observedToolCount,
              t.aiSpend.toolStatus.length,
            )
          : api.hint,
    },
    {
      id: "tokens",
      label: "Token Usage",
      value: tokens.value,
      hint: tokens.resolved
        ? tokens.hint
        : t.aiTokenUsage
          ? aiToolsObservedHint(
              t.aiTokenUsage.observedToolCount,
              t.aiTokenUsage.toolStatus.length,
            )
          : tokens.hint,
    },
    {
      id: "embedding-count",
      label: "Embedding Count",
      value: emb.value,
      hint: emb.hint,
    },
    {
      id: "queue-depth",
      label: "Queue Depth",
      value: queue.value,
      hint: queue.hint,
    },
    {
      id: "snapshot-bytes",
      label: "Snapshot Size",
      value: formatBytes(t.snapshot.bytes),
      hint: t.snapshot.lastModified ?? t.snapshot.generatedAt ?? undefined,
    },
    {
      id: "events-log",
      label: "Events Log",
      value: String(t.events.count),
      hint: `${formatBytes(t.events.bytes)} · ${t.events.operationalCount} operational`,
    },
    {
      id: "archivist-pm2",
      label: "Archivist PM2",
      value: archivistStatus,
      hint: t.runtime?.pm2Available ? "pm2 jlist" : "pm2 unavailable",
    },
  ];

  return rows;
}

export { compactTelemetryLines };
