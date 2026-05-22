"use client";

import { memo, useEffect, useMemo, useRef } from "react";
import { useCCC } from "@/context/CCCContext";
import { useFacilityResidue } from "@/context/FacilityResidueContext";
import { CHAMBER_ORDER } from "@/lib/facility-layout";
import { activeEventPulseKinds } from "@/lib/continuity/events/influence";
import { buildFacilityOccupants } from "@/lib/operator-placement";
import { HistoricTransitLayer } from "@/components/continuity/HistoricTransitLayer";
import { InfrastructureAnchorLayer } from "@/components/operations/InfrastructureAnchorLayer";
import { LiveTransitLayer } from "@/components/operations/LiveTransitLayer";
import { FacilitySignalLayer } from "@/components/operations/FacilitySignalLayer";
import { SectorChamber } from "./SectorChamber";

export const FacilityMegastructure = memo(function FacilityMegastructure() {
  const {
    data,
    loading,
    operational,
    continuityEvents,
    facilityNow,
    discreteBurst,
  } = useCCC();
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

  const eventPulses =
    discreteBurst.discreteActive
      ? activeEventPulseKinds(continuityEvents, facilityNow)
      : [];
  const infraEventPulse = eventPulses.length > 0;
  const transitWear =
    residue.transitRoutes.length > 0
      ? Math.max(...residue.transitRoutes.map((r) => r.wearTier))
      : 0;
  const pulseCadence = Math.max(
    0,
    ...CHAMBER_ORDER.map(
      (id) =>
        residue.sectors[data.chambers.find((c) => c.id === id)?.primaryDomain ?? "core"]
          ?.pulseCadence ?? 0,
    ),
  );

  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const block = (event: Event) => event.preventDefault();
    el.addEventListener("selectstart", block);
    return () => el.removeEventListener("selectstart", block);
  }, []);

  const blockNativeSelection = (event: { preventDefault: () => void }) => {
    event.preventDefault();
  };

  return (
    <div
      ref={wrapRef}
      className="ccc-megastructure-wrap max-lg:overflow-x-clip overflow-visible"
      onSelect={blockNativeSelection}
      onDragStart={blockNativeSelection}
      onContextMenu={blockNativeSelection}
    >
      <div
        className="ccc-megastructure"
        aria-label="Continuity Command Center facility"
        data-transit-wear={transitWear > 0 ? transitWear : undefined}
        data-pulse-cadence={pulseCadence > 1 ? pulseCadence : undefined}
      >
        <HistoricTransitLayer />
        <InfrastructureAnchorLayer
          wearTier={transitWear}
          pulseCadence={pulseCadence}
          eventPulse={infraEventPulse}
        />

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
        <LiveTransitLayer />
        <FacilitySignalLayer />
      </div>
    </div>
  );
});
