"use client";

import type { Operator } from "@/data/types";
import { useCCC } from "@/context/CCCContext";

interface OperatorChipProps {
  operator: Operator;
}

export function OperatorChip({ operator }: OperatorChipProps) {
  const { openOperator } = useCCC();

  return (
    <button
      type="button"
      onClick={() => openOperator(operator.id)}
      className="ccc-tap-target flex w-full items-center gap-2 border-t border-ccc-border/40 py-2 text-left"
      aria-label={`${operator.callsign}, ${operator.designation}`}
    >
      <span className="font-mono text-sm font-bold tracking-wide text-ccc-accent">
        {operator.callsign}
      </span>
      <span className="text-sm text-ccc-muted">{operator.designation}</span>
    </button>
  );
}
