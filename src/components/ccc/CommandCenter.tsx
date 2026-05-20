"use client";

import { useCCC } from "@/context/CCCContext";
import { getOperatorsForSector } from "@/lib/operators-for-sector";
import { PanelRouter } from "./PanelRouter";
import { ProjectsRail } from "./ProjectsRail";
import { SectorCard } from "./SectorCard";
import { LocalSignalsPanel } from "./LocalSignalsPanel";
import { OperationalTopologyPanel } from "./OperationalTopologyPanel";
import { TelemetryBar } from "./TelemetryBar";

export function CommandCenter() {
  const { data, loading } = useCCC();

  const totalOperators = data.operators.length;

  return (
    <div className="relative flex min-h-dvh flex-col">
      <div className="ccc-ambience" aria-hidden>
        <div className="ccc-grid" />
      </div>

      <div className="relative z-10 flex min-h-dvh flex-col">
        <TelemetryBar />

        <main className="flex flex-1 flex-col gap-4 px-3 py-4 md:gap-6 md:px-4 md:py-6 lg:flex-row">
          <div className="flex flex-1 flex-col gap-4 overflow-visible lg:max-w-[65%]">
            <section className="overflow-visible">
              <header className="mb-3">
                <h1 className="text-lg font-semibold text-ccc-text md:text-xl">
                  Facility sectors
                </h1>
                <p className="text-sm text-ccc-muted">
                  Tap a sector for detail · tap an operator for dossier
                </p>
              </header>

              {loading ? (
                <p className="text-sm text-ccc-muted">Refreshing sectors…</p>
              ) : totalOperators === 0 ? (
                <p className="text-sm text-ccc-muted">
                  No operators available. Check command data source.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3 overflow-visible sm:grid-cols-2 xl:grid-cols-3">
                  {data.sectors.map((sector) => (
                    <SectorCard
                      key={sector.id}
                      sector={sector}
                      operators={getOperatorsForSector(sector.id, data)}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="flex flex-col gap-4 lg:w-[35%] lg:shrink-0">
            <section className="rounded-xl border border-ccc-border bg-ccc-surface/80 p-4">
              <h2 className="text-base font-semibold text-ccc-text">Command brief</h2>
              <p className="mt-2 text-sm leading-relaxed text-ccc-muted">
                CCC projects continuity across Obsidian, Git, Kanban, tasks, and
                architecture docs. Operators appear as inhabitants inside each sector.
              </p>
              <p className="mt-3 font-mono text-xs text-ccc-accent">
                ccc.thinkcore.io
              </p>
            </section>

            <OperationalTopologyPanel />
            <LocalSignalsPanel />

            <section className="rounded-xl border border-ccc-border bg-ccc-surface/60 p-4">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-ccc-muted">
                Substrate
              </h2>
              <ul className="mt-2 flex flex-wrap gap-2 text-sm text-ccc-text">
                {["Obsidian", "Git", "Kanban", "Tasks", "Templater", "Logs"].map(
                  (item) => (
                    <li
                      key={item}
                      className="rounded border border-ccc-border px-2 py-1 text-xs"
                    >
                      {item}
                    </li>
                  ),
                )}
              </ul>
            </section>
          </aside>
        </main>

        <ProjectsRail />
        <PanelRouter />
      </div>
    </div>
  );
}
