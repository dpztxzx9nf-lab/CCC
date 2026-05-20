"use client";

import { FacilityMegastructure } from "./FacilityMegastructure";
import { FacilityPulse } from "./FacilityPulse";
import { PanelRouter } from "./PanelRouter";
import { ProjectsRail } from "./ProjectsRail";
import { LocalSignalsPanel } from "./LocalSignalsPanel";
import { OperationalTopologyPanel } from "./OperationalTopologyPanel";
import { TelemetryBar } from "./TelemetryBar";

export function CommandCenter() {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <div className="ccc-ambience" aria-hidden>
        <div className="ccc-grid" />
      </div>

      <div className="relative z-10 flex min-h-dvh flex-col">
        <TelemetryBar />

        <main className="flex flex-1 flex-col gap-3 px-2 py-3 md:gap-4 md:px-4 md:py-5 lg:flex-row lg:gap-5">
          <section className="min-w-0 flex-1 overflow-visible">
            <header className="mb-2 px-1 md:mb-3">
              <h1 className="text-lg font-semibold tracking-tight text-ccc-text md:text-xl">
                Continuity Megastructure
              </h1>
              <FacilityPulse />
            </header>
            <FacilityMegastructure />
          </section>

          <aside className="ccc-sidebar flex flex-col gap-2 md:gap-3 lg:w-[min(100%,18rem)] lg:shrink-0">
            <OperationalTopologyPanel />
            <LocalSignalsPanel />
          </aside>
        </main>

        <ProjectsRail />
        <PanelRouter />
      </div>
    </div>
  );
}
