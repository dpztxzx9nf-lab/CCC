"use client";

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

  return (
    <div
      className="ccc-inhabitant group absolute z-[5]"
      data-intensity={behavior.intensity}
      data-posture={behavior.posture}
      data-transit={behavior.transitFrom ? "true" : undefined}
      style={{
        left: `${behavior.position.x}%`,
        bottom: "14%",
      }}
    >
      {behavior.transitFrom && (
        <span className="ccc-inhabitant__transit-beam" aria-hidden />
      )}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          openOperator(operator.id);
        }}
        className="ccc-agent-hit relative flex min-h-[3rem] min-w-[3rem] -translate-x-1/2 flex-col items-center justify-end border-0 bg-transparent p-0 outline-none"
        aria-label={`${operator.callsign}, ${behavior.stateLabel}. ${behavior.purpose}`}
      >
        <OperatorEntity operator={operator} behavior={behavior} />
        <span className="ccc-inhabitant__callsign" aria-hidden>
          {operator.callsign}
        </span>
      </button>
    </div>
  );
}
