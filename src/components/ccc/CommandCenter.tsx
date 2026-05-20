"use client";

import { useCCC } from "@/context/CCCContext";
import { OperatorChip } from "./OperatorChip";
import { PanelRouter } from "./PanelRouter";
import { ProjectsRail } from "./ProjectsRail";
import { SectorCard } from "./SectorCard";
import { TelemetryBar } from "./TelemetryBar";

export function CommandCenter() {
  const { data, loading } = useCCC();

  return (
    <div className="relative flex min-h-dvh flex-col">
      <div className="ccc-ambience" aria-hidden>
        <div className="ccc-grid" />
      </div>

      <div className="relative z-10 flex min-h-dvh flex-col">
        <TelemetryBar />

        <main className="flex flex-1 flex-col gap-4 px-3 py-4 md:gap-6 md:px-4 md:py-6 lg:flex-row">
          <div className="flex flex-1 flex-col gap-4 lg:max-w-[65%]">
            <section>
              <header className="mb-3">
                <h1 className="text-lg font-semibold text-ccc-text md:text-xl">
                  Facility sectors
                </h1>
                <p className="text-sm text-ccc-muted">
                  Unified operational megastructure — tap a sector for detail
                </p>
              </header>

              {loading ? (
                <p className="text-sm text-ccc-muted">Refreshing sectors…</p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {data.sectors.map((sector) => {
                    const operatorCount = data.operators.filter(
                      (o) => o.sectorId === sector.id,
                    ).length;
                    return (
                      <SectorCard
                        key={sector.id}
                        sector={sector}
                        operatorCount={operatorCount}
                      />
                    );
                  })}
                </div>
              )}
            </section>

            <section className="rounded-xl border border-ccc-border bg-ccc-surface/60 p-4">
              <header className="mb-3">
                <h2 className="text-base font-semibold text-ccc-text">Operators</h2>
                <p className="text-sm text-ccc-muted">
                  Workflow roles — tap for operational dossier
                </p>
              </header>
              {loading ? (
                <p className="text-sm text-ccc-muted">Refreshing operators…</p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {data.operators.map((op) => (
                    <OperatorChip key={op.id} operator={op} />
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
                architecture docs. This shell uses mock data — future imports from
                JSON and Markdown without API or filesystem exposure.
              </p>
              <p className="mt-3 font-mono text-xs text-ccc-accent">
                ccc.thinkcore.io
              </p>
            </section>

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
