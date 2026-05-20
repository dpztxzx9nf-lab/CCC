"use client";

import { useState } from "react";
import type { InhabitantBehavior } from "@/data/inhabitant-types";
import type { Operator } from "@/data/types";
import { useCCC } from "@/context/CCCContext";
import { OperatorEntity } from "./OperatorEntity";

interface OperatorInhabitantProps {
  operator: Operator;
  behavior: InhabitantBehavior;
}

export function OperatorInhabitant({ operator, behavior }: OperatorInhabitantProps) {
  const { openOperator } = useCCC();
  const [tooltipOpen, setTooltipOpen] = useState(false);

  return (
    <div
      className="ccc-inhabitant group absolute z-[5]"
      data-intensity={behavior.intensity}
      data-posture={behavior.posture}
      style={{
        left: `${behavior.position.x}%`,
        bottom: "14%",
      }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          openOperator(operator.id);
        }}
        onFocus={() => setTooltipOpen(true)}
        onBlur={() => setTooltipOpen(false)}
        className="ccc-agent-hit relative flex min-h-[3rem] min-w-[3rem] -translate-x-1/2 flex-col items-center justify-end border-0 bg-transparent p-0 outline-none"
        aria-label={`${operator.callsign}: ${behavior.stateLabel}. ${behavior.purpose}`}
      >
        <OperatorEntity operator={operator} behavior={behavior} />
      </button>

      <div
        role="tooltip"
        className={`pointer-events-none absolute bottom-full left-1/2 z-[60] mb-3 w-max max-w-[15rem] -translate-x-1/2 rounded-lg border border-ccc-border bg-ccc-surface px-3 py-2 text-left text-sm shadow-2xl ${
          tooltipOpen ? "block" : "hidden group-hover:block group-focus-within:block"
        }`}
      >
        <p className="font-mono text-sm font-semibold text-ccc-accent">{operator.callsign}</p>
        <p className="text-xs font-medium text-ccc-text">{behavior.stateLabel}</p>
        <p className="mt-1 text-xs leading-snug text-ccc-muted">{operator.currentActivity}</p>
        {behavior.stationName && (
          <p className="mt-1 text-[10px] text-ccc-accent-dim">@ {behavior.stationName}</p>
        )}
        {behavior.crossSectorHint && (
          <p className="mt-1 text-[10px] text-ccc-warn">{behavior.crossSectorHint}</p>
        )}
      </div>
    </div>
  );
}
