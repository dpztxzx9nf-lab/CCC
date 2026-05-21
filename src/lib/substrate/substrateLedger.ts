import type { OperationalSnapshot, SnapshotMeta } from "@/data/operational-types";
import type { OperationalTelemetry } from "@/lib/telemetry";
import {
  formatBytes,
  formatInteger,
  formatUsd,
  metricDisplayValue,
  TELEMETRY_UNKNOWN,
} from "@/lib/telemetry/format";

const PLACEHOLDER = "—";

export const SUBSTRATE_LEDGER_IDS = [
  "api-spend",
  "token-usage",
  "indexed-artifacts",
  "continuity-cache",
  "embedding-count",
  "runtime-systems",
  "watch-roots",
  "queue-depth",
  "snapshot-size",
  "last-sync",
] as const;

export type SubstrateLedgerId = (typeof SUBSTRATE_LEDGER_IDS)[number];

export interface SubstrateLedgerSlot {
  id: SubstrateLedgerId;
  label: string;
  value: string;
  resolved: boolean;
  hint?: string;
}

function compactSyncLabel(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso.slice(0, 16);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(t);
}

/**
 * Raw substrate / ingestion scale for the top ledger. No synthesized operational narrative.
 */
export function buildSubstrateLedgerSlots(
  operational: OperationalSnapshot | null,
  snapshotMeta: SnapshotMeta | null,
  continuityRowsLoaded: number,
  facilityTelemetry: OperationalTelemetry | null = null,
): SubstrateLedgerSlot[] {
  const meta = snapshotMeta ?? operational?.snapshotMeta ?? null;
  const isLiveData = Boolean(operational && operational.source !== "mock");

  const api = metricDisplayValue(facilityTelemetry?.apiSpend, formatUsd);
  const tokens = metricDisplayValue(facilityTelemetry?.tokenUsage, formatInteger);
  const emb = metricDisplayValue(
    facilityTelemetry?.embeddingCount,
    formatInteger,
  );
  const queue = metricDisplayValue(facilityTelemetry?.queueDepth, formatInteger);

  const indexedArtifacts =
    meta != null && meta.totalMarkdownFiles >= 0
      ? String(meta.totalMarkdownFiles)
      : PLACEHOLDER;
  const artifactsResolved = Boolean(
    isLiveData &&
      operational?.enabled &&
      indexedArtifacts !== PLACEHOLDER &&
      !Number.isNaN(Number(indexedArtifacts)),
  );

  const runtimeActive =
    operational?.projects.filter((p) => p.detected && p.activityScore > 0).length ?? 0;
  const runtimeValue = isLiveData ? String(runtimeActive) : PLACEHOLDER;
  const runtimeResolved = Boolean(isLiveData && operational?.projects.some((p) => p.detected));

  const rootsStr =
    meta && meta.scanRoots.length > 0
      ? `${meta.scanRoots.filter((r) => r.accessible).length}/${meta.scanRoots.length}`
      : PLACEHOLDER;

  const syncIso =
    facilityTelemetry?.snapshot.generatedAt ??
    meta?.generatedAt ??
    operational?.scannedAt ??
    null;
  const lastSync =
    isLiveData && syncIso ? compactSyncLabel(syncIso) : undefined;

  let snapshotBytesLabel = TELEMETRY_UNKNOWN;
  let snapshotBytesResolved = false;
  const snapBytes =
    facilityTelemetry?.snapshot.bytes ??
    meta?.snapshotSizeBytes ??
    null;
  if (snapBytes != null && Number.isFinite(snapBytes) && snapBytes >= 0) {
    snapshotBytesLabel = formatBytes(snapBytes);
    snapshotBytesResolved = true;
  }

  const eventsCount =
    facilityTelemetry?.events.count ??
    (continuityRowsLoaded >= 0 ? continuityRowsLoaded : null);
  const eventsValue =
    eventsCount != null
      ? String(eventsCount)
      : continuityRowsLoaded >= 0
        ? String(continuityRowsLoaded)
        : TELEMETRY_UNKNOWN;

  return [
    {
      id: "api-spend",
      label: "API Spend",
      value: api.value,
      resolved: api.resolved,
      hint: api.hint,
    },
    {
      id: "token-usage",
      label: "Token Usage",
      value: tokens.value,
      resolved: tokens.resolved,
      hint: tokens.hint,
    },
    {
      id: "indexed-artifacts",
      label: "Indexed Artifacts",
      value: indexedArtifacts,
      resolved: artifactsResolved,
      hint:
        operational?.source === "archivist"
          ? "markdown corpus · snapshot"
          : operational?.enabled
            ? "markdown corpus · ingest"
            : undefined,
    },
    {
      id: "continuity-cache",
      label: "Continuity Cache",
      value: eventsValue,
      resolved: eventsCount != null || continuityRowsLoaded >= 0,
      hint: facilityTelemetry
        ? `${formatBytes(facilityTelemetry.events.bytes)} on disk`
        : "event rows loaded",
    },
    {
      id: "embedding-count",
      label: "Embedding Count",
      value: emb.value,
      resolved: emb.resolved,
      hint: emb.hint,
    },
    {
      id: "runtime-systems",
      label: "Runtime Systems",
      value: runtimeValue,
      resolved: runtimeResolved,
      hint: facilityTelemetry?.runtime?.pm2Available
        ? "active projects · pm2 reachable"
        : "active detected projects",
    },
    {
      id: "watch-roots",
      label: "Watch Roots",
      value: rootsStr,
      resolved: Boolean(rootsStr && rootsStr !== PLACEHOLDER),
      hint: meta ? "ARCHIVIST matrix" : undefined,
    },
    {
      id: "queue-depth",
      label: "Queue Depth",
      value: queue.value,
      resolved: queue.resolved,
      hint: queue.hint,
    },
    {
      id: "snapshot-size",
      label: "Snapshot Size",
      value: snapshotBytesLabel,
      resolved: snapshotBytesResolved,
      hint: facilityTelemetry?.snapshot.lastModified
        ? `mtime · ${facilityTelemetry.snapshot.lastModified.slice(0, 19)}`
        : snapshotBytesResolved
          ? "continuity-snapshot.json"
          : "unavailable",
    },
    {
      id: "last-sync",
      label: "Last Sync",
      value: lastSync ?? TELEMETRY_UNKNOWN,
      resolved: Boolean(lastSync),
      hint:
        operational?.source === "archivist"
          ? "snapshot stamp"
          : operational?.enabled
            ? "ingest stamp"
            : undefined,
    },
  ];
}
