"use client";

import type { Sector } from "@/data/types";
import { useCCC } from "@/context/CCCContext";
import { StatusBadge } from "./StatusBadge";

interface SectorCardProps {
  sector: Sector;
  operatorCount: number;
}

export function SectorCard({ sector, operatorCount }: SectorCardProps) {
  const { openSector } = useCCC();

  return (
    <button
      type="button"
      onClick={() => openSector(sector.id)}
      className="ccc-tap-target flex flex-col rounded-lg border border-ccc-border bg-ccc-surface/80 p-4 text-left transition-colors hover:border-ccc-accent/40 hover:bg-ccc-surface-raised active:bg-ccc-accent/5"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-ccc-text">{sector.name}</h3>
          <p className="font-mono text-xs tracking-wide text-ccc-accent-dim">
            {sector.codename}
          </p>
        </div>
        <StatusBadge status={sector.status} />
      </div>
      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ccc-muted">
        {sector.description}
      </p>
      <p className="mt-3 text-xs text-ccc-muted">
        {operatorCount} operator{operatorCount !== 1 ? "s" : ""} ·{" "}
        {sector.stationIds.length} station{sector.stationIds.length !== 1 ? "s" : ""}
      </p>
    </button>
  );
}
