"use client";

import { useCallback, useState } from "react";
import type { ContinuityEventView } from "@/lib/continuity/events/types";
import { formatEventTime, kindLabel } from "@/lib/continuity/events/influence";
import { useCCC } from "@/context/CCCContext";
import type { SectorId } from "@/data/types";

const SECTOR_DOT: Record<SectorId, string> = {
  core: "core",
  archive: "archive",
  forge: "forge",
  observatory: "observatory",
  relay: "relay",
  runtime: "runtime",
};

function EventRow({
  event,
  onHighlight,
}: {
  event: ContinuityEventView;
  onHighlight: (ev: ContinuityEventView | null) => void;
}) {
  const { openOperator } = useCCC();
  const primaryOp = event.operators[0];

  return (
    <li
      className="ccc-event-row"
      onMouseEnter={() => onHighlight(event)}
      onMouseLeave={() => onHighlight(null)}
      onFocus={() => onHighlight(event)}
      onBlur={() => onHighlight(null)}
    >
      <span className="ccc-event-row__time" title={event.occurredAt}>
        {formatEventTime(event.occurredAt)}
      </span>
      <span
        className={`ccc-event-row__importance ccc-event-row__importance--${event.importance}`}
        aria-hidden
      />
      <div className="ccc-event-row__body">
        <span className="ccc-event-row__title">{event.title}</span>
        <span className="ccc-event-row__meta">
          <span className="ccc-event-row__kind">{kindLabel(event.kind)}</span>
          {event.sectors.map((s) => (
            <span
              key={s}
              className={`ccc-event-dot ccc-event-dot--${SECTOR_DOT[s]}`}
              title={s}
            />
          ))}
          {primaryOp && (
            <button
              type="button"
              className="ccc-event-row__op"
              onClick={(e) => {
                e.stopPropagation();
                openOperator(primaryOp);
              }}
            >
              {primaryOp}
            </button>
          )}
        </span>
      </div>
    </li>
  );
}

export function ContinuityEventRail() {
  const { continuityEvents, setEventHighlight, operationalLoading } = useCCC();
  const [open, setOpen] = useState(true);

  const events = continuityEvents;
  const handleHighlight = useCallback(
    (ev: ContinuityEventView | null) => setEventHighlight(ev),
    [setEventHighlight],
  );

  if (operationalLoading) return null;

  return (
    <section className="ccc-sidebar-panel ccc-event-rail">
      <details open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
        <summary className="ccc-event-rail__summary">
          <span className="text-sm font-semibold text-ccc-text">Continuity log</span>
          <span className="text-[10px] font-medium uppercase tracking-wide text-ccc-muted">
            {events.length > 0 ? `${events.length} events` : "no events"}
          </span>
        </summary>

        {events.length === 0 ? (
          <p className="ccc-event-rail__empty">
            No persisted events yet. ARCHIVIST records activity to{" "}
            <code className="font-mono text-[10px]">continuity-events.json</code>.
          </p>
        ) : (
          <ul className="ccc-event-rail__list" aria-label="Recent continuity events">
            {events.slice(0, 16).map((ev) => (
              <EventRow key={ev.id} event={ev} onHighlight={handleHighlight} />
            ))}
          </ul>
        )}
      </details>
    </section>
  );
}
