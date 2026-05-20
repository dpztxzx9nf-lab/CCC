"use client";

import type { Station } from "@/data/types";
import type { InhabitantPosition } from "@/data/inhabitant-types";

interface StationMarkerProps {
  station: Station;
  position: InhabitantPosition;
  occupied: boolean;
}

export function StationMarker({ station, position, occupied }: StationMarkerProps) {
  return (
    <div
      className="pointer-events-none absolute z-[1] -translate-x-1/2"
      style={{ left: `${position.x}%`, bottom: "22%" }}
      aria-hidden
      title={station.name}
    >
      <span
        className={`mx-auto block h-1.5 w-6 rounded-sm ${
          occupied ? "bg-ccc-accent/25" : "bg-ccc-border/40"
        }`}
      />
    </div>
  );
}
