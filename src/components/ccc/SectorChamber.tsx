"use client";

import type { ChamberOccupant } from "@/lib/operator-placement";
import type { PhysicalChamber } from "@/data/types";
import { useCCC } from "@/context/CCCContext";
import { useSectorResidue } from "@/context/FacilityResidueContext";
import {
  effectiveActivityScore,
  getEffectiveChamberActivity,
  sectorEventBoost,
} from "@/lib/continuity/events/influence";
import { deriveHistoryEnvironmentalProjection } from "@/lib/continuity/history";
import { CHAMBER_GRID_AREA } from "@/lib/facility-layout";
import { orientationDomainScoreDelta } from "@/lib/human-orientation";
import { SectorRoom } from "./SectorRoom";
import { SectorScenery } from "./SectorScenery";

interface SectorChamberProps {
  chamber: PhysicalChamber;
  occupants: ChamberOccupant[];
}

export function SectorChamber({ chamber, occupants }: SectorChamberProps) {
  const {
    openChamber,
    getDomainHeat,
    operational,
    continuityEvents,
    highlightedDomains,
    facilityNow,
    discreteBurst,
    humanOrientation,
  } = useCCC();
  const domainId = chamber.primaryDomain;
  const heat = getDomainHeat(domainId);
  const dominantActivity = heat?.dominantActivity ?? undefined;
  const orientBias = orientationDomainScoreDelta(domainId, humanOrientation);
  const activity = getEffectiveChamberActivity(
    heat,
    domainId,
    continuityEvents,
    orientBias,
  );
  const historyProjection = deriveHistoryEnvironmentalProjection(
    operational?.historyEvents,
    facilityNow,
  );
  const historySector = historyProjection.sectors[domainId];
  const historyBoost = historySector?.boost ?? 0;
  const effectiveScore = Math.min(
    100,
    effectiveActivityScore(heat, domainId, continuityEvents, orientBias) +
      historyBoost,
  );
  const projectedActivity =
    effectiveScore <= 4
      ? "idle"
      : effectiveScore >= 52
        ? "high"
        : effectiveScore >= 20
          ? "medium"
          : "low";
  const eventLit = highlightedDomains.includes(domainId);
  const eventPulse =
    sectorEventBoost(domainId, continuityEvents) >= 10 ||
    (historySector?.strength ?? 0) >= 0.24;
  const residue = useSectorResidue(domainId);

  const activeStations = occupants
    .map((o) => o.behavior.stationId)
    .filter(Boolean) as string[];

  return (
    <article
      className={`ccc-chamber ccc-chamber--${domainId}${orientBias !== 0 ? " ccc-chamber--orient-nudge" : ""}${eventLit ? " ccc-chamber--event-lit" : ""}${eventPulse ? " ccc-chamber--event-pulse" : ""}`}
      style={{ gridArea: CHAMBER_GRID_AREA[chamber.id] }}
      data-activity={historyBoost > 0 ? projectedActivity : activity}
      data-domain={domainId}
      data-chamber={chamber.id}
      data-dominant={dominantActivity}
      data-historical={
        dominantActivity?.includes("historical") || residue.pressure >= 3
          ? "true"
          : undefined
      }
      data-transient={
        (discreteBurst.discreteActive && eventPulse) || historyBoost > 0
          ? "true"
          : undefined
      }
      data-history-projection={historySector?.mode}
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
                  effectiveScore,
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
