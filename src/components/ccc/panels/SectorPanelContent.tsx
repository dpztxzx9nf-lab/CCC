"use client";

import type { Sector } from "@/data/types";
import { useCCC } from "@/context/CCCContext";
import { OperatorChip } from "../OperatorChip";

interface SectorPanelContentProps {
  sector: Sector;
}

export function SectorPanelContent({ sector }: SectorPanelContentProps) {
  const { data, openProject, getOperatorsForSector } = useCCC();

  const operators = getOperatorsForSector(sector.id);
  const stations = data?.stations.filter((s) => s.sectorId === sector.id) ?? [];
  const linkedProjects =
    data?.projects.filter((p) => p.sectorIds.includes(sector.id)) ?? [];

  return (
    <div className="space-y-6">
      <p className="text-sm leading-relaxed text-ccc-text">{sector.description}</p>

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
