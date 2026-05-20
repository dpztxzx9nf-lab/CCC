"use client";

import { useMemo } from "react";
import type { Operator, Sector } from "@/data/types";
import { useCCC } from "@/context/CCCContext";
import {
  computeInhabitantBehavior,
  getStationLayoutPosition,
} from "@/lib/inhabitant-behavior";
import { OperatorInhabitant } from "./OperatorInhabitant";
import { StationMarker } from "./StationMarker";

interface SectorRoomProps {
  sector: Sector;
  operators: Operator[];
}

export function SectorRoom({ sector, operators }: SectorRoomProps) {
  const { data, operational } = useCCC();

  const stations = data.stations.filter((s) => s.sectorId === sector.id);

  const behaviors = useMemo(
    () =>
      operators.map((op, i) =>
        computeInhabitantBehavior({
          operator: op,
          sectorId: sector.id,
          slotIndex: i,
          slotTotal: operators.length,
          data,
          operational,
        }),
      ),
    [operators, sector.id, data, operational],
  );

  const occupiedStationIds = new Set(
    behaviors.map((b) => b.stationId).filter(Boolean) as string[],
  );

  if (operators.length === 0) {
    return (
      <p className="text-sm text-ccc-muted">No operators stationed in this sector.</p>
    );
  }

  return (
    <div className="ccc-sector-floor relative min-h-[10.5rem] overflow-visible">
      <div className="ccc-sector-floor__grid" aria-hidden />
      <div className="ccc-sector-floor__line" aria-hidden />

      {stations.map((st) => (
        <StationMarker
          key={st.id}
          station={st}
          position={getStationLayoutPosition(st.id)}
          occupied={occupiedStationIds.has(st.id)}
        />
      ))}

      {behaviors.map((behavior) => {
        const op = operators.find((o) => o.id === behavior.operatorId);
        if (!op) return null;
        return (
          <OperatorInhabitant
            key={`${op.id}-${sector.id}`}
            operator={op}
            behavior={behavior}
          />
        );
      })}
    </div>
  );
}
