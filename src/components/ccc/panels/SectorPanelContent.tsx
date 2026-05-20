"use client";

import type { Sector } from "@/data/types";
import { useCCC } from "@/context/CCCContext";
import { eventsForSector, formatEventTime, kindLabel } from "@/lib/continuity/events/influence";
import { OperatorChip } from "../OperatorChip";

interface SectorPanelContentProps {
  sector: Sector;
}

export function SectorPanelContent({ sector }: SectorPanelContentProps) {
  const { data, openProject, getOperatorsForSector, continuityEvents, setEventHighlight } =
    useCCC();

  const operators = getOperatorsForSector(sector.id);
  const stations = data?.stations.filter((s) => s.sectorId === sector.id) ?? [];
  const linkedProjects =
    data?.projects.filter((p) => p.sectorIds.includes(sector.id)) ?? [];
  const sectorEvents = eventsForSector(sector.id, continuityEvents, 4);

  return (
    <div className="space-y-6">
      <p className="text-sm leading-relaxed text-ccc-text">{sector.description}</p>

      {sectorEvents.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-ccc-muted">
            Recent continuity
          </h3>
          <ul className="mt-2 space-y-1.5 border-t border-ccc-border/40 pt-3">
            {sectorEvents.map((ev) => (
              <li
                key={ev.id}
                className="text-xs text-ccc-muted"
                onMouseEnter={() => setEventHighlight(ev)}
                onMouseLeave={() => setEventHighlight(null)}
              >
                <span className="font-mono text-[10px] text-ccc-accent-dim">
                  {formatEventTime(ev.occurredAt)}
                </span>
                <span className="mx-1 opacity-40">·</span>
                <span className="text-ccc-text">{ev.title}</span>
                <span className="ml-1 font-mono text-[10px] opacity-60">
                  {kindLabel(ev.kind)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {operators.length > 0 && (
        <section>
          <h3 className="sr-only">Operators in sector</h3>
          <div className="flex flex-col gap-3">
            {operators.map((op) => (
              <OperatorChip key={op.id} operator={op} />
            ))}
          </div>
        </section>
      )}

      {stations.length > 0 && (
        <section>
          <h3 className="sr-only">Stations</h3>
          <ul className="space-y-2 border-t border-ccc-border/40 pt-4">
            {stations.map((st) => (
              <li key={st.id} className="text-sm text-ccc-muted">
                <span className="font-medium text-ccc-text">{st.name}</span>
                <span className="mt-0.5 block text-xs">{st.description}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {linkedProjects.length > 0 && (
        <section>
          <h3 className="sr-only">Linked projects</h3>
          <ul className="flex flex-wrap gap-2 border-t border-ccc-border/40 pt-4">
            {linkedProjects.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => openProject(p.id)}
                  className="ccc-tap-target text-sm font-medium text-ccc-accent hover:underline"
                >
                  {p.name}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
