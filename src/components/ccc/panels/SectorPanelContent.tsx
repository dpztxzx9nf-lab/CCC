"use client";

import type { Sector } from "@/data/types";
import { useCCC } from "@/context/CCCContext";
import { OperatorChip } from "../OperatorChip";
import { StatusBadge } from "../StatusBadge";

interface SectorPanelContentProps {
  sector: Sector;
}

export function SectorPanelContent({ sector }: SectorPanelContentProps) {
  const { data, openProject } = useCCC();

  const operators =
    data?.operators.filter((o) => o.sectorId === sector.id) ?? [];
  const stations =
    data?.stations.filter((s) => s.sectorId === sector.id) ?? [];
  const linkedProjects =
    data?.projects.filter((p) => p.sectorIds.includes(sector.id)) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <StatusBadge status={sector.status} />
        <p className="mt-3 text-sm leading-relaxed text-ccc-text">{sector.description}</p>
      </div>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-ccc-muted">
          Operators
        </h3>
        <div className="mt-3 flex flex-col gap-3">
          {operators.length === 0 ? (
            <p className="text-sm text-ccc-muted">No operators assigned.</p>
          ) : (
            operators.map((op) => <OperatorChip key={op.id} operator={op} />)
          )}
        </div>
      </section>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-ccc-muted">
          Stations
        </h3>
        <ul className="mt-3 space-y-2">
          {stations.map((st) => (
            <li
              key={st.id}
              className="rounded-lg border border-ccc-border bg-ccc-surface-raised/60 px-3 py-2"
            >
              <p className="text-sm font-medium text-ccc-text">{st.name}</p>
              <p className="text-sm text-ccc-muted">{st.description}</p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-ccc-muted">
          Linked projects
        </h3>
        <ul className="mt-3 space-y-2">
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
    </div>
  );
}
