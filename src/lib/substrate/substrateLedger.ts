import type { OperationalSnapshot, SnapshotMeta } from "@/data/operational-types";

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

function telemetryIndex(
  telemetry: OperationalSnapshot["telemetry"],
): Record<string, { label: string; value: string; hint?: string }> {
  return Object.fromEntries(telemetry.map((t) => [t.id, t]));
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

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return PLACEHOLDER;
  const u = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < u.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n < 10 && i > 0 ? n.toFixed(1) : Math.round(n)} ${u[i]}`;
}

/**
 * Raw substrate / ingestion scale for the top ledger. No synthesized operational narrative.
 */
export function buildSubstrateLedgerSlots(
  operational: OperationalSnapshot | null,
  snapshotMeta: SnapshotMeta | null,
  continuityRowsLoaded: number,
): SubstrateLedgerSlot[] {
  const meta = snapshotMeta ?? operational?.snapshotMeta ?? null;
  const tel =
    operational && operational.telemetry.length > 0 ? telemetryIndex(operational.telemetry) : {};

  const isLiveData = Boolean(operational && operational.source !== "mock");

  const apiSpend = tel["api-cost"]?.value;
  const tokenUsage = tel["tokens"]?.value;

  const mdFromTelemetry = tel["continuity-md"]?.value;
  const indexedArtifacts =
    meta != null && meta.totalMarkdownFiles >= 0
      ? String(meta.totalMarkdownFiles)
      : mdFromTelemetry !== undefined &&
          mdFromTelemetry !== "" &&
          mdFromTelemetry !== PLACEHOLDER
        ? mdFromTelemetry
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
      : tel["scan-roots"]?.value;

  let lastSync: string | undefined;
  const syncIso = meta?.generatedAt ?? operational?.scannedAt;
  if (isLiveData && syncIso) lastSync = compactSyncLabel(syncIso);

  let snapshotBytesLabel = PLACEHOLDER;
  let snapshotBytesResolved = false;
  if (
    meta?.snapshotSizeBytes != null &&
    Number.isFinite(meta.snapshotSizeBytes) &&
    meta.snapshotSizeBytes >= 0
  ) {
    snapshotBytesLabel = formatBytes(meta.snapshotSizeBytes);
    snapshotBytesResolved = true;
  }

  return [
    {
      id: "api-spend",
      label: "API Spend",
      value: isLiveData && apiSpend ? apiSpend : PLACEHOLDER,
      resolved: isLiveData && Boolean(apiSpend),
      hint: !apiSpend ? "integration pending" : undefined,
    },
    {
      id: "token-usage",
      label: "Token Usage",
      value: isLiveData && tokenUsage ? tokenUsage : PLACEHOLDER,
      resolved: isLiveData && Boolean(tokenUsage),
      hint: !tokenUsage ? "integration pending" : undefined,
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
      value: continuityRowsLoaded >= 0 ? String(continuityRowsLoaded) : PLACEHOLDER,
      resolved: true,
      hint: "event rows loaded",
    },
    {
      id: "embedding-count",
      label: "Embedding Count",
      value: PLACEHOLDER,
      resolved: false,
      hint: "integration pending",
    },
    {
      id: "runtime-systems",
      label: "Runtime Systems",
      value: runtimeValue,
      resolved: runtimeResolved,
      hint: "active detected projects",
    },
    {
      id: "watch-roots",
      label: "Watch Roots",
      value: rootsStr ?? PLACEHOLDER,
      resolved: Boolean(rootsStr),
      hint: meta ? "ARCHIVIST matrix" : undefined,
    },
    {
      id: "queue-depth",
      label: "Queue Depth",
      value: PLACEHOLDER,
      resolved: false,
      hint: "integration pending",
    },
    {
      id: "snapshot-size",
      label: "Snapshot Size",
      value: snapshotBytesLabel,
      resolved: snapshotBytesResolved,
      hint: snapshotBytesResolved ? "artifact" : "integration pending",
    },
    {
      id: "last-sync",
      label: "Last Sync",
      value: lastSync ?? PLACEHOLDER,
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
