"use client";

import { useMemo } from "react";
import { useCCC } from "@/context/CCCContext";
import { FacilityResidueProvider } from "@/context/FacilityResidueContext";
import { computeFacilityResidue } from "@/lib/continuity/residue";
import { ContinuityEventRail } from "@/components/continuity/ContinuityEventRail";
import { FacilityMegastructure } from "./FacilityMegastructure";
import { PanelRouter } from "./PanelRouter";
import { ProjectsRail } from "./ProjectsRail";
import { LocalSignalsPanel } from "./LocalSignalsPanel";
import { OperationalTopologyPanel } from "./OperationalTopologyPanel";
import { TelemetryBar } from "./TelemetryBar";

export function CommandCenter() {
  const { operational, continuityEvents } = useCCC();

  const facilityResidue = useMemo(() => {
    return computeFacilityResidue(continuityEvents, operational, []);
  }, [continuityEvents, operational]);

  return (
    <FacilityResidueProvider value={facilityResidue}>
      <div className="relative flex min-h-dvh flex-col">
        <div className="ccc-ambience" aria-hidden>
          <div className="ccc-grid" />
        </div>

        <div className="relative z-10 flex min-h-dvh flex-col">
          <TelemetryBar />

          <main className="flex flex-1 flex-col gap-3 px-2 py-3 md:gap-4 md:px-4 md:py-5 lg:flex-row lg:gap-5">
            <section className="min-w-0 flex-1 overflow-visible">
              <FacilityMegastructure />
            </section>

            <aside className="ccc-sidebar flex flex-col gap-2 md:gap-3 lg:w-[min(100%,18rem)] lg:shrink-0">
              <OperationalTopologyPanel />
              <ContinuityEventRail />
              <LocalSignalsPanel />
            </aside>
          </main>

          <ProjectsRail />
          <PanelRouter />
        </div>
      </div>
    </FacilityResidueProvider>
  );
}
