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
      className="pointer-events-none absolute z-[1] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
      style={{ left: `${position.x}%`, top: `${position.y}%` }}
      aria-hidden
    >
      <span
        className={`h-2 w-2 rounded-sm border ${
          occupied
            ? "border-ccc-accent/60 bg-ccc-accent/30"
            : "border-ccc-border bg-ccc-surface/80"
        }`}
      />
      <span className="mt-0.5 max-w-[5rem] truncate text-center text-[9px] leading-tight text-ccc-muted">
        {station.name}
      </span>
    </div>
  );
}
