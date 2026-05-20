"use client";

import type { SectorHeatView } from "@/data/operational-types";
import type { SectorId } from "@/data/types";
import { getChamberActivity } from "@/lib/chamber-atmosphere";

interface SectorSceneryProps {
  sectorId: SectorId;
  heat?: SectorHeatView;
  activeStations?: string[];
  hasTransit?: boolean;
}

function SceneryShell({
  sectorId,
  heat,
  activeStations,
  hasTransit,
  children,
}: {
  sectorId: SectorId;
  heat?: SectorHeatView;
  activeStations?: string[];
  hasTransit?: boolean;
  children: React.ReactNode;
}) {
  const activity = getChamberActivity(heat);
  return (
    <div
      className={`ccc-scenery ccc-scenery--${sectorId} ccc-scenery--act-${activity}`}
      data-activity={activity}
      data-dominant={heat?.dominantActivity ?? undefined}
      data-transit={hasTransit ? "true" : undefined}
      data-stations={activeStations?.join(" ") || undefined}
      aria-hidden
    >
      <span className="ccc-scenery__depth-back" />
      <span className="ccc-scenery__frame ccc-scenery__frame--tl" />
      <span className="ccc-scenery__frame ccc-scenery__frame--br" />
      <span className="ccc-scenery__catwalk" />
      <span className="ccc-scenery__shaft" />
      {children}
    </div>
  );
}

export function SectorScenery({
  sectorId,
  heat,
  activeStations = [],
  hasTransit,
}: SectorSceneryProps) {
  const has = (id: string) => activeStations.includes(id);

  switch (sectorId) {
    case "core":
      return (
        <SceneryShell sectorId={sectorId} heat={heat} activeStations={activeStations} hasTransit={hasTransit}>
          <span className="ccc-scenery__bridge-rail" />
          <span className="ccc-scenery__nexus-ring" />
          <span className="ccc-scenery__transit-hub" />
          {has("governance-console") && <span className="ccc-scenery__oversight-display" />}
          {has("continuity-desk") && <span className="ccc-scenery__topology-table" />}
        </SceneryShell>
      );
    case "archive":
      return (
        <SceneryShell sectorId={sectorId} heat={heat} activeStations={activeStations} hasTransit={hasTransit}>
          <span className="ccc-scenery__shelf ccc-scenery__shelf--1" />
          <span className="ccc-scenery__shelf ccc-scenery__shelf--2" />
          <span className="ccc-scenery__shelf ccc-scenery__shelf--3" />
          <span className="ccc-scenery__depth-glow" />
          {(has("vault-indexer") || has("memory-lattice")) && (
            <span className="ccc-scenery__sync-beam" />
          )}
        </SceneryShell>
      );
    case "forge":
      return (
        <SceneryShell sectorId={sectorId} heat={heat} activeStations={activeStations} hasTransit={hasTransit}>
          <span className="ccc-scenery__crane-arm" />
          <span className="ccc-scenery__rail" />
          <span className="ccc-scenery__forge-glow" />
          <span className="ccc-scenery__ember" />
          {has("build-forge") && <span className="ccc-scenery__forge-bench" />}
          {has("deploy-rail") && <span className="ccc-scenery__deploy-rail-active" />}
        </SceneryShell>
      );
    case "runtime":
      return (
        <SceneryShell sectorId={sectorId} heat={heat} activeStations={activeStations} hasTransit={hasTransit}>
          <span className="ccc-scenery__reactor" />
          <span className="ccc-scenery__reactor-core" />
          <span className="ccc-scenery__conduit ccc-scenery__conduit--l" />
          <span className="ccc-scenery__conduit ccc-scenery__conduit--r" />
          {has("runtime-monitor") && <span className="ccc-scenery__diagnostics-panel" />}
        </SceneryShell>
      );
    case "relay":
      return (
        <SceneryShell sectorId={sectorId} heat={heat} activeStations={activeStations} hasTransit={hasTransit}>
          <span className="ccc-scenery__tower" />
          <span className="ccc-scenery__antenna" />
          <span className="ccc-scenery__beam" />
          <span className="ccc-scenery__pulse-ring" />
          {has("broadcast-hub") && <span className="ccc-scenery__uplink-pulse" />}
          {has("projection-deck") && <span className="ccc-scenery__tx-console" />}
        </SceneryShell>
      );
    case "observatory":
      return (
        <SceneryShell sectorId={sectorId} heat={heat} activeStations={activeStations} hasTransit={hasTransit}>
          <span className="ccc-scenery__tower-mast" />
          <span className="ccc-scenery__lens" />
          <span className="ccc-scenery__scan-sweep" />
          {(has("metrics-array") || has("cost-scanner")) && (
            <span className="ccc-scenery__scanner-table" />
          )}
        </SceneryShell>
      );
    default:
      return null;
  }
}
