"use client";

import type { SectorOccupant } from "@/lib/operator-placement";
import type { Sector } from "@/data/types";
import { useCCC } from "@/context/CCCContext";
import { getStationLayoutPosition } from "@/lib/inhabitant-behavior";
import { OperatorInhabitant } from "./OperatorInhabitant";
import { WorkstationVisual } from "./WorkstationVisual";

interface SectorRoomProps {
  sector: Sector;
  occupants: SectorOccupant[];
}

export function SectorRoom({ sector, occupants }: SectorRoomProps) {
  const { data } = useCCC();

  const occupiedStationIds = new Set(
    occupants.map((o) => o.behavior.stationId).filter(Boolean) as string[],
  );

  const stations = data.stations.filter(
    (s) => s.sectorId === sector.id && occupiedStationIds.has(s.id),
  );

  if (occupants.length === 0) {
    return <div className="ccc-sector-floor ccc-sector-floor--empty" aria-hidden />;
  }

  return (
    <div
      className={`ccc-sector-floor ccc-sector-floor--${sector.id} relative overflow-visible`}
    >
      <div className="ccc-sector-floor__grid" aria-hidden />
      <div className="ccc-sector-floor__line" aria-hidden />

      {stations.map((st) => (
        <WorkstationVisual
          key={st.id}
          station={st}
          position={getStationLayoutPosition(st.id)}
          active
        />
      ))}

      {occupants.map(({ operator, behavior }) => (
        <OperatorInhabitant
          key={operator.id}
          operator={operator}
          behavior={behavior}
          placementSector={sector.id}
        />
      ))}
    </div>
  );
}
