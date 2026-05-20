"use client";

import { useMemo } from "react";
import { useCCC } from "@/context/CCCContext";
import { useFacilityResidue } from "@/context/FacilityResidueContext";
import { CHAMBER_ORDER } from "@/lib/facility-layout";
import { activeEventPulseKinds } from "@/lib/continuity/events/influence";
import { buildFacilityOccupants } from "@/lib/operator-placement";
import { HistoricTransitLayer } from "@/components/continuity/HistoricTransitLayer";
import { FacilitySignalLayer } from "@/components/operations/FacilitySignalLayer";
import { SectorChamber } from "./SectorChamber";

export function FacilityMegastructure() {
  const { data, loading, operational, continuityEvents } = useCCC();
  const residue = useFacilityResidue();

  const occupantsByChamber = useMemo(
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

  const eventPulses = activeEventPulseKinds(continuityEvents);
  const transitPulse = eventPulses.length > 0 ? " ccc-transit--event-pulse" : "";
  const transitWear =
    residue.transitRoutes.length > 0
      ? Math.max(...residue.transitRoutes.map((r) => r.wearTier))
      : 0;
  const pulseCadence = Math.max(
    0,
    ...CHAMBER_ORDER.map((id) => residue.sectors[data.chambers.find((c) => c.id === id)?.primaryDomain ?? "core"]?.pulseCadence ?? 0),
  );

  return (
    <div className="ccc-megastructure-wrap overflow-visible">
      <div
        className="ccc-megastructure"
        aria-label="Continuity Command Center facility"
        data-transit-wear={transitWear > 0 ? transitWear : undefined}
        data-pulse-cadence={pulseCadence > 1 ? pulseCadence : undefined}
      >
        <HistoricTransitLayer />
        <div className={`ccc-transit ccc-transit--elevator${transitPulse}`} aria-hidden />
        <div className={`ccc-transit ccc-transit--spine-h${transitPulse}`} aria-hidden />
        <div className={`ccc-transit ccc-transit--spine-v${transitPulse}`} aria-hidden />

        {CHAMBER_ORDER.map((chamberId) => {
          const chamber = data.chambers.find((c) => c.id === chamberId);
          if (!chamber) return null;
          return (
            <SectorChamber
              key={chamber.id}
              chamber={chamber}
              occupants={occupantsByChamber[chamber.id] ?? []}
            />
          );
        })}
        <FacilitySignalLayer />
      </div>
    </div>
  );
}
