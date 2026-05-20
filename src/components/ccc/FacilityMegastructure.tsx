"use client";

import { useMemo } from "react";
import { useCCC } from "@/context/CCCContext";
import { SECTOR_ORDER } from "@/lib/facility-layout";
import { activeEventPulseKinds } from "@/lib/continuity/events/influence";
import { buildFacilityOccupants } from "@/lib/operator-placement";
import { FacilitySignalLayer } from "@/components/operations/FacilitySignalLayer";
import { SectorChamber } from "./SectorChamber";

export function FacilityMegastructure() {
  const { data, loading, operational, continuityEvents } = useCCC();

  const occupantsBySector = useMemo(
    () => buildFacilityOccupants(data, operational),
    [data, operational],
  );

  if (loading) {
    return <p className="text-sm text-ccc-muted">Aligning megastructure sectors…</p>;
  }

  if (data.operators.length === 0) {
    return (
      <p className="text-sm text-ccc-muted">No operators available. Check command data source.</p>
    );
  }

  const sectors = SECTOR_ORDER.map((id) => data.sectors.find((s) => s.id === id)).filter(
    Boolean,
  );

  const eventPulses = activeEventPulseKinds(continuityEvents);
  const transitPulse = eventPulses.length > 0 ? " ccc-transit--event-pulse" : "";

  return (
    <div className="ccc-megastructure-wrap overflow-visible">
      <div className="ccc-megastructure" aria-label="Continuity Command Center facility">
        <div className={`ccc-transit ccc-transit--elevator${transitPulse}`} aria-hidden />
        <div className={`ccc-transit ccc-transit--spine-h${transitPulse}`} aria-hidden />
        <div className={`ccc-transit ccc-transit--spine-v${transitPulse}`} aria-hidden />

        {sectors.map((sector) => (
          <SectorChamber
            key={sector!.id}
            sector={sector!}
            occupants={occupantsBySector[sector!.id] ?? []}
          />
        ))}
        <FacilitySignalLayer />
      </div>
    </div>
  );
}
