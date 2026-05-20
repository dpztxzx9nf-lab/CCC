"use client";

import type { Station } from "@/data/types";
import type { InhabitantPosition } from "@/data/inhabitant-types";

interface WorkstationVisualProps {
  station: Station;
  position: InhabitantPosition;
  active: boolean;
}

export function WorkstationVisual({ station, position, active }: WorkstationVisualProps) {
  if (!active) return null;

  return (
    <div
      className={`ccc-workstation ccc-workstation--${station.id}`}
      style={{ left: `${position.x}%`, bottom: "22%" }}
      aria-hidden
    >
      <span className="ccc-workstation__base" />
      <span className="ccc-workstation__rig" />
      <span className="ccc-workstation__signal" />
    </div>
  );
}
