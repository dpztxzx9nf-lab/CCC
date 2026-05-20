"use client";

import { useCCC } from "@/context/CCCContext";
import { eventsForOperator, formatEventTime, kindLabel } from "@/lib/continuity/events/influence";
import type { Operator } from "@/data/types";

interface OperatorContinuityEventsProps {
  operator: Operator;
}

export function OperatorContinuityEvents({ operator }: OperatorContinuityEventsProps) {
  const { continuityEvents, setEventHighlight } = useCCC();
  const attributed = eventsForOperator(operator.id, continuityEvents, 6);

  if (attributed.length === 0) return null;

  return (
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-widest text-ccc-muted">
        Continuity events
      </h3>
      <ul className="mt-2 space-y-2 border-t border-ccc-border/40 pt-3">
        {attributed.map((ev) => (
          <li
            key={ev.id}
            className="ccc-event-dossier-row"
            onMouseEnter={() => setEventHighlight(ev)}
            onMouseLeave={() => setEventHighlight(null)}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm text-ccc-text">{ev.title}</span>
              <span className="shrink-0 font-mono text-[10px] text-ccc-muted">
                {formatEventTime(ev.occurredAt)}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-ccc-muted">{ev.summary}</p>
            <span className="mt-1 inline-block font-mono text-[10px] text-ccc-accent-dim">
              {kindLabel(ev.kind)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
