import type { OperationalTelemetry, TelemetryMetricValue } from "./types";

export const TELEMETRY_UNKNOWN = "unknown";

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return TELEMETRY_UNKNOWN;
  const u = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < u.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n < 10 && i > 0 ? n.toFixed(1) : Math.round(n)} ${u[i]}`;
}

export function formatUsd(amount: number): string {
  return `$${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function formatInteger(n: number): string {
  return Math.round(n).toLocaleString();
}

export function metricDisplayValue(
  metric: TelemetryMetricValue<number> | undefined,
  formatValue: (n: number) => string,
): { value: string; resolved: boolean; hint: string } {
  if (!metric) {
    return { value: TELEMETRY_UNKNOWN, resolved: false, hint: "unavailable" };
  }
  if (!metric.available || metric.value == null) {
    return {
      value: TELEMETRY_UNKNOWN,
      resolved: false,
      hint: metric.source,
    };
  }
  return {
    value: formatValue(metric.value),
    resolved: true,
    hint: metric.source,
  };
}

export function compactTelemetryLines(
  t: OperationalTelemetry,
): { label: string; value: string; hint?: string }[] {
  const api = metricDisplayValue(t.apiSpend, formatUsd);
  const tokens = metricDisplayValue(t.tokenUsage, formatInteger);
  const emb = metricDisplayValue(t.embeddingCount, formatInteger);
  const queue = metricDisplayValue(t.queueDepth, formatInteger);

  const archivist = t.runtime?.archivist;
  const pm2Hint = t.runtime?.pm2Available
    ? archivist?.available
      ? `pm2:${archivist.name} ${archivist.status}`
      : "pm2:ccc-archivist not registered"
    : "pm2 unavailable";

  return [
    { label: "API Spend", value: api.value, hint: api.hint },
    { label: "Token Usage", value: tokens.value, hint: tokens.hint },
    { label: "Embedding Count", value: emb.value, hint: emb.hint },
    { label: "Queue", value: queue.value, hint: queue.hint },
    {
      label: "Snapshot",
      value: formatBytes(t.snapshot.bytes),
      hint: t.snapshot.generatedAt ?? t.snapshot.lastModified ?? undefined,
    },
    {
      label: "Events Log",
      value: `${t.events.count} (${formatBytes(t.events.bytes)})`,
      hint: t.events.logUpdatedAt ?? undefined,
    },
    {
      label: "Archivist",
      value: archivist?.available ? archivist.status : TELEMETRY_UNKNOWN,
      hint: pm2Hint,
    },
  ];
}
