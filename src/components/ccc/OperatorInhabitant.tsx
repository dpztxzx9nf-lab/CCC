"use client";

import { useMemo, useState } from "react";
import type { InhabitantBehavior } from "@/data/inhabitant-types";
import type { Operator, SectorId } from "@/data/types";
import { useCCC } from "@/context/CCCContext";
import {
  buildOperatorDisplayInfo,
  deriveOperatorPacket,
} from "@/lib/operator-display";
import { OperatorHoverCard } from "@/components/operators/OperatorHoverCard";
import { OperatorNameplate } from "@/components/operators/OperatorNameplate";
import { OperationalPacket } from "@/components/operations/OperationalPacket";
import { OperatorEntity } from "./OperatorEntity";

interface OperatorInhabitantProps {
  operator: Operator;
  behavior: InhabitantBehavior;
  placementSector: SectorId;
}

export function OperatorInhabitant({
  operator,
  behavior,
  placementSector,
}: OperatorInhabitantProps) {
  const { openOperator, operational } = useCCC();
  const [hovered, setHovered] = useState(false);

  const displayInfo = useMemo(
    () => buildOperatorDisplayInfo(operator, behavior, placementSector, operational),
    [operator, behavior, placementSector, operational],
  );

  const packet = useMemo(
    () => deriveOperatorPacket(operator, behavior, placementSector, operational),
    [operator, behavior, placementSector, operational],
  );

  return (
    <div
      className="ccc-inhabitant group absolute z-[5]"
      data-intensity={behavior.intensity}
      data-posture={behavior.posture}
      data-transit={behavior.transitFrom ? "true" : undefined}
      style={{
        left: `${behavior.position.x}%`,
        bottom: "14%",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      {behavior.transitFrom && (
        <span className="ccc-inhabitant__transit-beam" aria-hidden />
      )}

      <OperatorNameplate
        callsign={operator.callsign}
        intensity={behavior.intensity}
        isTransit={!!behavior.transitFrom}
      />

      {packet && (
        <OperationalPacket
          text={packet}
          packetKey={`${operator.id}-${packet}`}
          className="ccc-inhabitant__packet"
        />
      )}

      <OperatorHoverCard info={displayInfo} visible={hovered} />

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          openOperator(operator.id);
        }}
        className="ccc-agent-hit relative flex min-h-[3rem] min-w-[3rem] -translate-x-1/2 flex-col items-center justify-end border-0 bg-transparent p-0 outline-none"
        aria-label={`${operator.callsign}, ${displayInfo.sectorLabel}, ${displayInfo.task}`}
      >
        <OperatorEntity operator={operator} behavior={behavior} />
      </button>
    </div>
  );
}
