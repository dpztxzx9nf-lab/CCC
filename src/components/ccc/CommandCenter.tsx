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
  const { operational, continuityEvents, activePanel } = useCCC();
  const inspectingOperatorId =
    activePanel?.kind === "operator" ? activePanel.id : undefined;

  const facilityResidue = useMemo(() => {
    return computeFacilityResidue(continuityEvents, operational, []);
  }, [continuityEvents, operational]);

  return (
    <FacilityResidueProvider value={facilityResidue}>
      <div
        className="ccc-command-shell flex flex-col"
        data-operator-inspection={inspectingOperatorId}
      >
        <div className="ccc-ambience" aria-hidden>
          <div className="ccc-grid" />
        </div>

        <div className="ccc-command-shell__stage relative z-10">
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

          <ProjectsRail />
          <PanelRouter />
        </div>
      </div>
    </FacilityResidueProvider>
  );
}
