"use client";

import { useCCC } from "@/context/CCCContext";
import { useFacilityResidue } from "@/context/FacilityResidueContext";
import { getChamberActivity } from "@/lib/chamber-atmosphere";
import { getFacilityPulseWithEvents } from "@/lib/continuity/events/influence";
import { CHAMBER_ORDER } from "@/lib/facility-layout";
import type { ChamberId } from "@/data/ecology";

const CHAMBER_ARIA: Record<ChamberId, string> = {
  "nexus-prime": "Nexus Prime",
  "deep-stack": "Deep Stack",
  foundry: "Foundry",
  "observation-deck": "Observation Deck",
  "signal-bridge": "Signal Bridge",
  "live-grid": "Live Grid",
};

export function FacilityPulse() {
  const {
    operational,
    openChamber,
    continuityEvents,
    highlightedDomains,
    data,
  } = useCCC();
  const facilityResidue = useFacilityResidue();
  const heat = operational?.sectorHeat ?? [];
  const pulse = getFacilityPulseWithEvents(heat, continuityEvents);

  if (heat.length === 0 && !operational?.snapshotMeta) return null;

  const ariaSummary = [
    pulse.focusSector && `focus ${pulse.focusSector}`,
    pulse.hotSectors.length > 0 && `pressure ${pulse.hotSectors.join(", ")}`,
    pulse.calmCount > 0 && `${pulse.calmCount} calm`,
  ]
    .filter(Boolean)
    .join("; ");

  return (
    <div
      className="ccc-facility-pulse"
      role="group"
      aria-label={ariaSummary || "Facility chamber activity"}
    >
      {CHAMBER_ORDER.map((chamberId) => {
        const chamber = data.chambers.find((c) => c.id === chamberId);
        if (!chamber) return null;
        const domainId = chamber.primaryDomain;
        const h = heat.find((x) => x.sectorId === domainId);
        const activity = getChamberActivity(h);
        const isFocus = pulse.focusSector === domainId;
        const isHot =
          pulse.hotSectors.includes(domainId) ||
          (facilityResidue.sectors[domainId]?.pressure ?? 0) >= 2;
        const isEvent =
          pulse.eventSectors.includes(domainId) ||
          highlightedDomains.includes(domainId) ||
          (facilityResidue.sectors[domainId]?.glow ?? 0) >= 2;

        return (
          <button
            key={chamberId}
            type="button"
            onClick={() => openChamber(chamberId)}
            className={`ccc-env-pulse ccc-pulse-node ccc-env-pulse--${domainId} ccc-env-pulse--${activity} ccc-pulse-node--${activity}${isFocus ? " ccc-env-pulse--focus ccc-pulse-node--focus" : ""}${isHot ? " ccc-env-pulse--hot ccc-pulse-node--hot" : ""}${isEvent ? " ccc-pulse-node--event" : ""}`}
            aria-label={`${CHAMBER_ARIA[chamberId]}, ${domainId}${isFocus ? ", focus" : ""}${isHot ? ", pressure" : ""}`}
          />
        );
      })}
    </div>
  );
}
