"use client";

import type { Operator } from "@/data/types";
import { useCCC } from "@/context/CCCContext";
import { StatusBadge } from "./StatusBadge";

interface OperatorChipProps {
  operator: Operator;
}

export function OperatorChip({ operator }: OperatorChipProps) {
  const { openOperator } = useCCC();

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={() => openOperator(operator.id)}
        className="ccc-tap-target flex w-full min-w-0 flex-col rounded-lg border border-ccc-border bg-ccc-surface-raised px-3 py-3 text-left transition-colors hover:border-ccc-accent/50 hover:bg-ccc-surface-raised/90 active:bg-ccc-accent/5 md:min-w-[12rem]"
        aria-label={`${operator.callsign}: ${operator.currentActivity}`}
      >
        <div className="flex items-start justify-between gap-2">
          <span className="font-mono text-sm font-bold tracking-wide text-ccc-accent">
            {operator.callsign}
          </span>
          <StatusBadge status={operator.status} />
        </div>
        <span className="mt-0.5 text-sm text-ccc-muted">{operator.designation}</span>
        <span className="mt-2 line-clamp-2 text-sm leading-snug text-ccc-text">
          {operator.currentActivity}
        </span>
      </button>
      <div
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-max max-w-[16rem] -translate-x-1/2 rounded border border-ccc-border bg-ccc-surface px-3 py-2 text-sm shadow-lg md:group-hover:block"
      >
        <p className="font-mono font-semibold text-ccc-accent">{operator.callsign}</p>
        <p className="text-ccc-muted">{operator.currentActivity}</p>
      </div>
    </div>
  );
}
