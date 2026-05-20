"use client";

import type { Operator, Sector } from "@/data/types";
import { useCCC } from "@/context/CCCContext";
import { getChamberActivity } from "@/lib/chamber-atmosphere";
import { SECTOR_GRID_AREA } from "@/lib/facility-layout";
import { SectorRoom } from "./SectorRoom";
import { SectorScenery } from "./SectorScenery";
import { StatusBadge } from "./StatusBadge";

interface SectorChamberProps {
  sector: Sector;
  operators: Operator[];
}

export function SectorChamber({ sector, operators }: SectorChamberProps) {
  const { openSector, getSectorHeat } = useCCC();
  const heat = getSectorHeat(sector.id);
  const activity = getChamberActivity(heat);

  return (
    <article
      className={`ccc-chamber ccc-chamber--${sector.id}`}
      style={{ gridArea: SECTOR_GRID_AREA[sector.id] }}
      data-activity={activity}
      data-dominant={heat?.dominantActivity ?? undefined}
    >
      <SectorScenery sectorId={sector.id} heat={heat} />

      <button
        type="button"
        onClick={() => openSector(sector.id)}
        className="ccc-chamber__header ccc-tap-target"
      >
        <div className="ccc-chamber__title-row">
          <div>
            <h3 className="ccc-chamber__name">{sector.name}</h3>
            <p className="ccc-chamber__codename">{sector.codename}</p>
          </div>
          <StatusBadge status={sector.status} />
        </div>
        {heat && activity !== "idle" && (
          <div className="ccc-chamber__heat" aria-hidden>
            <span
              className="ccc-chamber__heat-fill"
              style={{ width: `${Math.max(heat.activityScore, 6)}%` }}
            />
          </div>
        )}
      </button>

      <SectorRoom sector={sector} operators={operators} />
    </article>
  );
}
