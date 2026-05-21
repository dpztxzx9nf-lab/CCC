"use client";

import { useMemo } from "react";
import { useCCC } from "@/context/CCCContext";
import { FacilityResidueProvider } from "@/context/FacilityResidueContext";
import { computeFacilityResidue } from "@/lib/continuity/residue";
import { ContinuityEventRail } from "@/components/continuity/ContinuityEventRail";
import { FacilityMegastructure } from "./FacilityMegastructure";
import { LocalSignalsPanel } from "./LocalSignalsPanel";
import { OperationalTopologyPanel } from "./OperationalTopologyPanel";
import { TelemetryBar } from "./TelemetryBar";

/** Center surface — Command Center facility (default). */
export function FacilityCommandSurface() {
  const { operational, continuityEvents, activePanel } = useCCC();
  const inspectingOperatorId =
    activePanel?.kind === "operator" ? activePanel.id : undefined;

  const facilityResidue = useMemo(
    () => computeFacilityResidue(continuityEvents, operational, []),
    [continuityEvents, operational],
  );

  return (
    <FacilityResidueProvider value={facilityResidue}>
      <div
        className="ccc-facility-surface flex min-h-0 flex-1 flex-col"
        data-operator-inspection={inspectingOperatorId}
      >
        <TelemetryBar />

        <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-x-hidden px-2 py-3 md:gap-4 md:px-4 md:py-5 lg:flex-row lg:gap-5 lg:overflow-x-visible">
          <section className="min-h-0 min-w-0 flex-1 max-lg:overflow-x-clip lg:overflow-visible">
            <FacilityMegastructure />
          </section>

          <aside className="ccc-sidebar flex min-w-0 w-full shrink-0 flex-col gap-2 overflow-x-hidden md:gap-3 lg:w-[min(100%,18rem)]">
            <OperationalTopologyPanel />
            <ContinuityEventRail />
            <LocalSignalsPanel />
          </aside>
        </main>
      </div>
    </FacilityResidueProvider>
  );
}
