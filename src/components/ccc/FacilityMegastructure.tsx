"use client";

import { useCCC } from "@/context/CCCContext";
import { SECTOR_ORDER } from "@/lib/facility-layout";
import { getOperatorsForSector } from "@/lib/operators-for-sector";
import { SectorChamber } from "./SectorChamber";

export function FacilityMegastructure() {
  const { data, loading } = useCCC();

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

  return (
    <div className="ccc-megastructure-wrap overflow-visible">
      <div className="ccc-megastructure" aria-label="Continuity Command Center facility">
        <div className="ccc-transit ccc-transit--elevator" aria-hidden />
        <div className="ccc-transit ccc-transit--spine-h" aria-hidden />
        <div className="ccc-transit ccc-transit--spine-v" aria-hidden />

        {sectors.map((sector) => (
          <SectorChamber
            key={sector!.id}
            sector={sector!}
            operators={getOperatorsForSector(sector!.id, data)}
          />
        ))}
      </div>
    </div>
  );
}
