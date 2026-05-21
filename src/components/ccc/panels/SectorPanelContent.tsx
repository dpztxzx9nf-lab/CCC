"use client";

import type { PhysicalChamber } from "@/data/types";
import { useCCC } from "@/context/CCCContext";
import { eventsForSector } from "@/lib/continuity/events/influence";
import { getOperatorsInChamber } from "@/lib/operator-placement";
import { OperatorChip } from "../OperatorChip";

interface SectorPanelContentProps {
  chamber: PhysicalChamber;
}

export function SectorPanelContent({ chamber }: SectorPanelContentProps) {
  const { data, continuityEvents, setEventHighlight, operational } = useCCC();

  const domainId = chamber.primaryDomain;
  const operators = getOperatorsInChamber(chamber.id, data, operational);
  const stations = data?.stations.filter((s) => s.chamberId === chamber.id) ?? [];
  const domainEvents = eventsForSector(domainId, continuityEvents, 4);

  return (
    <div className="space-y-6">
      <p className="text-sm leading-relaxed text-ccc-text">{chamber.description}</p>
      <p className="text-xs text-ccc-muted">
        Operational domain: <span className="text-ccc-accent-dim">{domainId}</span>
      </p>

      {domainEvents.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-ccc-muted">
            Recent continuity
          </h3>
          <ul className="mt-2 space-y-1.5 border-t border-ccc-border/40 pt-3">
            {domainEvents.map((ev) => (
              <li
                key={ev.id}
                className="text-xs text-ccc-muted"
                onMouseEnter={() => setEventHighlight(ev)}
                onMouseLeave={() => setEventHighlight(null)}
              >
                <span className="font-mono text-[10px] text-ccc-accent-dim">
                  {ev.title}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {operators.length > 0 && (
        <section>
          <h3 className="sr-only">Operators in chamber</h3>
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

    </div>
  );
}
