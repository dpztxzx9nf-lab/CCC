"use client";

import type { SectorOccupant } from "@/lib/operator-placement";
import type { Sector } from "@/data/types";
import { useCCC } from "@/context/CCCContext";
import { getChamberActivity } from "@/lib/chamber-atmosphere";
import { SECTOR_GRID_AREA } from "@/lib/facility-layout";
import { SectorRoom } from "./SectorRoom";
import { SectorScenery } from "./SectorScenery";

interface SectorChamberProps {
  sector: Sector;
  occupants: SectorOccupant[];
}

export function SectorChamber({ sector, occupants }: SectorChamberProps) {
  const { openSector, getSectorHeat } = useCCC();
  const heat = getSectorHeat(sector.id);
  const activity = getChamberActivity(heat);
  const activeStations = occupants
    .map((o) => o.behavior.stationId)
    .filter(Boolean) as string[];

  return (
    <article
      className={`ccc-chamber ccc-chamber--${sector.id}`}
      style={{ gridArea: SECTOR_GRID_AREA[sector.id] }}
      data-activity={activity}
      data-dominant={heat?.dominantActivity ?? undefined}
      data-occupied={occupants.length > 0 ? "true" : undefined}
    >
      <SectorScenery
        sectorId={sector.id}
        heat={heat}
        activeStations={activeStations}
        hasTransit={occupants.some((o) => o.behavior.transitFrom)}
      />

      <button
        type="button"
        onClick={() => openSector(sector.id)}
        className="ccc-chamber__header ccc-tap-target"
        aria-label={`${sector.name}, ${sector.codename}, ${sector.status}`}
      >
        <span className="ccc-chamber__codename">{sector.codename}</span>
        {heat && activity !== "idle" && (
          <div className="ccc-chamber__heat" aria-hidden>
            <span
              className="ccc-chamber__heat-fill"
              style={{ width: `${Math.max(heat.activityScore, 6)}%` }}
            />
          </div>
        )}
      </button>

      <SectorRoom sector={sector} occupants={occupants} />
    </article>
  );
}
