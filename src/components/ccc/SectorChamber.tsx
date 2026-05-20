"use client";

import type { ChamberOccupant } from "@/lib/operator-placement";
import type { PhysicalChamber } from "@/data/types";
import { useCCC } from "@/context/CCCContext";
import { useSectorResidue } from "@/context/FacilityResidueContext";
import {
  getEffectiveChamberActivity,
  sectorEventBoost,
} from "@/lib/continuity/events/influence";
import { CHAMBER_GRID_AREA } from "@/lib/facility-layout";
import { SectorRoom } from "./SectorRoom";
import { SectorScenery } from "./SectorScenery";

interface SectorChamberProps {
  chamber: PhysicalChamber;
  occupants: ChamberOccupant[];
}

export function SectorChamber({ chamber, occupants }: SectorChamberProps) {
  const { openChamber, getDomainHeat, continuityEvents, highlightedDomains, discreteBurst } =
    useCCC();
  const domainId = chamber.primaryDomain;
  const heat = getDomainHeat(domainId);
  const activity = getEffectiveChamberActivity(heat, domainId, continuityEvents);
  const eventLit = highlightedDomains.includes(domainId);
  const eventPulse = sectorEventBoost(domainId, continuityEvents) >= 10;
  const residue = useSectorResidue(domainId);

  const activeStations = occupants
    .map((o) => o.behavior.stationId)
    .filter(Boolean) as string[];

  return (
    <article
      className={`ccc-chamber ccc-chamber--${domainId}${eventLit ? " ccc-chamber--event-lit" : ""}${eventPulse ? " ccc-chamber--event-pulse" : ""}`}
      style={{ gridArea: CHAMBER_GRID_AREA[chamber.id] }}
      data-activity={activity}
      data-domain={domainId}
      data-chamber={chamber.id}
      data-dominant={heat?.dominantActivity ?? undefined}
      data-occupied={occupants.length > 0 ? "true" : undefined}
      data-residue-glow={residue.glow > 0 ? residue.glow : undefined}
      data-residue-pressure={residue.pressure > 0 ? residue.pressure : undefined}
      data-residue-cool={residue.coolness > 1 ? residue.coolness : undefined}
      data-residue-warm={domainId === "forge" && residue.warmth > 0 ? residue.warmth : undefined}
      data-residue-flicker={
        domainId === "runtime" && residue.flicker > 0 ? residue.flicker : undefined
      }
    >
      <SectorScenery
        sectorId={domainId}
        heat={heat}
        activeStations={activeStations}
        hasTransit={
          discreteBurst.transitMotionActive &&
          occupants.some((o) => o.placement.isTransit)
        }
      />

      <button
        type="button"
        onClick={() => openChamber(chamber.id)}
        className="ccc-chamber__header ccc-tap-target"
        aria-label={`${chamber.name}, ${chamber.codename}, ${domainId} domain`}
      >
        <span className="ccc-chamber__codename">{chamber.codename}</span>
        {heat && activity !== "idle" && (
          <div className="ccc-chamber__heat" aria-hidden>
            <span
              className="ccc-chamber__heat-fill"
              style={{
                width: `${Math.max(
                  heat.activityScore + sectorEventBoost(domainId, continuityEvents),
                  6,
                )}%`,
              }}
            />
          </div>
        )}
      </button>

      <SectorRoom chamber={chamber} occupants={occupants} />
    </article>
  );
}
