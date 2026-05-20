"use client";

import type { InhabitantBehavior } from "@/data/inhabitant-types";
import type { Operator } from "@/data/types";
import { useCCC } from "@/context/CCCContext";

interface OperatorInhabitantProps {
  operator: Operator;
  behavior: InhabitantBehavior;
}

const intensityBorder: Record<InhabitantBehavior["intensity"], string> = {
  calm: "border-ccc-border",
  steady: "border-ccc-accent/55",
  elevated: "border-ccc-warn/70 shadow-[0_0_12px_rgba(232,184,74,0.15)]",
};

const postureLabel: Record<InhabitantBehavior["posture"], string> = {
  anchored: "○",
  focused: "◉",
  coordinating: "◎",
  building: "▣",
  monitoring: "◈",
  archiving: "▤",
  reviewing: "▥",
  relaying: "◇",
  scouting: "△",
};

export function OperatorInhabitant({ operator, behavior }: OperatorInhabitantProps) {
  const { openOperator } = useCCC();

  return (
    <div
      className="ccc-inhabitant group absolute z-[3] -translate-x-1/2 -translate-y-1/2"
      style={{
        left: `${behavior.position.x}%`,
        top: `${behavior.position.y}%`,
      }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          openOperator(operator.id);
        }}
        className={`ccc-tap-target flex min-h-[3.5rem] min-w-[4.5rem] max-w-[6.5rem] flex-col items-center rounded-xl border-2 bg-ccc-surface-raised px-2 py-2 text-center shadow-lg transition-[border-color,box-shadow,transform] duration-700 ease-out hover:border-ccc-accent active:scale-[0.98] ${intensityBorder[behavior.intensity]}`}
        aria-label={`${operator.callsign}: ${behavior.stateLabel}. ${behavior.purpose}`}
      >
        <span className="text-[10px] leading-none text-ccc-muted" aria-hidden>
          {postureLabel[behavior.posture]}
        </span>
        <span className="mt-0.5 max-w-full truncate font-mono text-xs font-bold text-ccc-accent">
          {operator.callsign}
        </span>
        <span className="mt-0.5 line-clamp-2 text-[10px] leading-tight text-ccc-text">
          {behavior.stateLabel}
        </span>
        {behavior.stationName && (
          <span className="mt-0.5 max-w-full truncate text-[9px] text-ccc-accent-dim">
            @ {behavior.stationName}
          </span>
        )}
      </button>

      <div
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-max max-w-[15rem] -translate-x-1/2 rounded-lg border border-ccc-border bg-ccc-surface px-3 py-2 text-left text-sm shadow-xl group-hover:block group-focus-within:block"
      >
        <p className="font-mono font-semibold text-ccc-accent">{operator.callsign}</p>
        <p className="text-xs font-medium text-ccc-text">{behavior.stateLabel}</p>
        <p className="mt-1 text-xs text-ccc-muted">{behavior.purpose}</p>
        <p className="mt-1 text-xs text-ccc-muted">{operator.currentActivity}</p>
        {behavior.crossSectorHint && (
          <p className="mt-1 text-xs text-ccc-warn">{behavior.crossSectorHint}</p>
        )}
      </div>

      {behavior.crossSectorHint && (
        <span className="pointer-events-none absolute -bottom-5 left-1/2 max-w-[7rem] -translate-x-1/2 truncate text-center text-[9px] text-ccc-warn">
          cross-sector
        </span>
      )}
    </div>
  );
}
