"use client";

import { useCCC } from "@/context/CCCContext";
import { getChamberActivity } from "@/lib/chamber-atmosphere";
import { useFacilityResidue } from "@/context/FacilityResidueContext";
import { getFacilityPulseWithEvents } from "@/lib/continuity/events/influence";
import { SECTOR_ORDER } from "@/lib/facility-layout";
import type { SectorId } from "@/data/types";

const SECTOR_ARIA: Record<SectorId, string> = {
  core: "Core",
  archive: "Archive",
  forge: "Forge",
  observatory: "Observatory",
  relay: "Relay",
  runtime: "Runtime",
};

export function FacilityPulse() {
  const { operational, openSector, continuityEvents, highlightedSectors } = useCCC();
  const heat = operational?.sectorHeat ?? [];
  const facilityResidue = useFacilityResidue();
  const pulse = getFacilityPulseWithEvents(heat, continuityEvents);

  const residueHot = SECTOR_ORDER.filter(
    (id) => (facilityResidue.sectors[id]?.pressure ?? 0) >= 2,
  );

  if (heat.length === 0 && !operational?.snapshotMeta) return null;

  const ariaSummary = [
    pulse.focusSector && `focus ${SECTOR_ARIA[pulse.focusSector as SectorId]}`,
    pulse.hotSectors.length > 0 &&
      `pressure ${pulse.hotSectors.map((id) => SECTOR_ARIA[id as SectorId] ?? id).join(", ")}`,
    pulse.calmCount > 0 && `${pulse.calmCount} calm`,
  ]
    .filter(Boolean)
    .join("; ");

  return (
    <div
      className="ccc-facility-pulse"
      role="group"
      aria-label={ariaSummary || "Facility sector activity"}
    >
      {SECTOR_ORDER.map((sectorId) => {
        const h = heat.find((x) => x.sectorId === sectorId);
        const activity = getChamberActivity(h);
        const isFocus = pulse.focusSector === sectorId;
        const isHot =
          pulse.hotSectors.includes(sectorId) || residueHot.includes(sectorId);
        const isEvent =
          pulse.eventSectors.includes(sectorId) ||
          highlightedSectors.includes(sectorId) ||
          (facilityResidue.sectors[sectorId]?.glow ?? 0) >= 2;

        return (
          <button
            key={sectorId}
            type="button"
            onClick={() => openSector(sectorId)}
            className={`ccc-pulse-node ccc-pulse-node--${activity}${isFocus ? " ccc-pulse-node--focus" : ""}${isHot ? " ccc-pulse-node--hot" : ""}${isEvent ? " ccc-pulse-node--event" : ""}`}
            aria-label={`${SECTOR_ARIA[sectorId]}, ${activity}${isFocus ? ", focus" : ""}${isHot ? ", pressure" : ""}`}
          />
        );
      })}
    </div>
  );
}
