"use client";

import type { SectorHeatView } from "@/data/operational-types";
import type { SectorId } from "@/data/types";
import { getChamberActivity } from "@/lib/chamber-atmosphere";

interface SectorSceneryProps {
  sectorId: SectorId;
  heat?: SectorHeatView;
}

function SceneryShell({
  sectorId,
  heat,
  children,
}: {
  sectorId: SectorId;
  heat?: SectorHeatView;
  children: React.ReactNode;
}) {
  const activity = getChamberActivity(heat);
  return (
    <div
      className={`ccc-scenery ccc-scenery--${sectorId} ccc-scenery--act-${activity}`}
      data-activity={activity}
      data-dominant={heat?.dominantActivity ?? undefined}
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

export function SectorScenery({ sectorId, heat }: SectorSceneryProps) {
  switch (sectorId) {
    case "core":
      return (
        <SceneryShell sectorId={sectorId} heat={heat}>
          <span className="ccc-scenery__bridge-rail" />
          <span className="ccc-scenery__nexus-ring" />
          <span className="ccc-scenery__transit-hub" />
        </SceneryShell>
      );
    case "archive":
      return (
        <SceneryShell sectorId={sectorId} heat={heat}>
          <span className="ccc-scenery__shelf ccc-scenery__shelf--1" />
          <span className="ccc-scenery__shelf ccc-scenery__shelf--2" />
          <span className="ccc-scenery__shelf ccc-scenery__shelf--3" />
          <span className="ccc-scenery__depth-glow" />
        </SceneryShell>
      );
    case "forge":
      return (
        <SceneryShell sectorId={sectorId} heat={heat}>
          <span className="ccc-scenery__crane-arm" />
          <span className="ccc-scenery__rail" />
          <span className="ccc-scenery__forge-glow" />
          <span className="ccc-scenery__ember" />
        </SceneryShell>
      );
    case "runtime":
      return (
        <SceneryShell sectorId={sectorId} heat={heat}>
          <span className="ccc-scenery__reactor" />
          <span className="ccc-scenery__reactor-core" />
          <span className="ccc-scenery__conduit ccc-scenery__conduit--l" />
          <span className="ccc-scenery__conduit ccc-scenery__conduit--r" />
        </SceneryShell>
      );
    case "relay":
      return (
        <SceneryShell sectorId={sectorId} heat={heat}>
          <span className="ccc-scenery__tower" />
          <span className="ccc-scenery__antenna" />
          <span className="ccc-scenery__beam" />
          <span className="ccc-scenery__pulse-ring" />
        </SceneryShell>
      );
    case "observatory":
      return (
        <SceneryShell sectorId={sectorId} heat={heat}>
          <span className="ccc-scenery__tower-mast" />
          <span className="ccc-scenery__lens" />
          <span className="ccc-scenery__scan-sweep" />
        </SceneryShell>
      );
    default:
      return null;
  }
}
