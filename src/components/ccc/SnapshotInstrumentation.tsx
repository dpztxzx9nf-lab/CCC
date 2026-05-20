"use client";

import { useCCC } from "@/context/CCCContext";
import { snapshotAgeHoursFromIso } from "@/lib/snapshot/loadSnapshot";

export function SnapshotInstrumentation() {
  const { snapshotMeta, operational } = useCCC();

  if (!snapshotMeta) {
    if (operational?.enabled && !operational.snapshotMeta) {
      return (
        <p className="ccc-snapshot-instrument text-[10px] text-ccc-muted/70">
          No ARCHIVIST snapshot — {operational.label}
        </p>
      );
    }
    return null;
  }

  const ageH = snapshotAgeHoursFromIso(snapshotMeta.generatedAt);

  const stale = ageH > 24;
  const when = new Date(snapshotMeta.generatedAt);
  const timeLabel = Number.isNaN(when.getTime())
    ? snapshotMeta.generatedAt
    : when.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

  const roots = snapshotMeta.scanRoots
    .map((r) => `${r.id}${r.accessible ? "" : "×"}`)
    .join(" · ");

  return (
    <p
      className={`ccc-snapshot-instrument text-[10px] tracking-wide ${stale ? "text-ccc-warn/80" : "text-ccc-muted/75"}`}
      title={`ARCHIVIST continuity snapshot · ${snapshotMeta.projectCount} projects`}
    >
      <span className="font-mono text-ccc-accent-dim">{snapshotMeta.agent}</span>
      <span className="mx-1 opacity-40">|</span>
      <span>{timeLabel}</span>
      {stale && <span className="ml-1 text-ccc-warn">stale</span>}
      <span className="mx-1 opacity-40">|</span>
      <span>roots {roots}</span>
    </p>
  );
}
