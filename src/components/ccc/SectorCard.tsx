"use client";

import { useMemo } from "react";
import type { Operator, PhysicalChamber } from "@/data/types";
import { useCCC } from "@/context/CCCContext";
import { resolveOperatorPlacement } from "@/lib/facility/ecology-resolve";
import { computeInhabitantBehavior } from "@/lib/inhabitant-behavior";
import { SectorRoom } from "./SectorRoom";
import { StatusBadge } from "./StatusBadge";

interface SectorCardProps {
  chamber: PhysicalChamber;
  operators: Operator[];
}

function heatBarClass(level: string): string {
  switch (level) {
    case "high":
      return "bg-ccc-accent";
    case "medium":
      return "bg-ccc-accent/60";
    case "low":
      return "bg-ccc-warn/50";
    default:
      return "bg-ccc-border";
  }
}

export function SectorCard({ chamber, operators }: SectorCardProps) {
  const { openChamber, getDomainHeat, data, operational } = useCCC();
  const heat = getDomainHeat(chamber.primaryDomain);

  const occupants = useMemo(
    () =>
      operators.map((operator, slotIndex) => {
        const placement = resolveOperatorPlacement(operator, operational);
        return {
          operator,
          placement,
          behavior: computeInhabitantBehavior({
            operator,
            chamberId: chamber.id,
            primaryDomain: chamber.primaryDomain,
            placement,
            slotIndex,
            slotTotal: operators.length,
            data,
            operational,
          }),
        };
      }),
    [operators, chamber, data, operational],
  );

  return (
    <article className="relative z-[1] flex flex-col overflow-visible rounded-lg border border-ccc-border bg-ccc-surface/90 shadow-sm">
      <button
        type="button"
        onClick={() => openChamber(chamber.id)}
        className="ccc-tap-target flex flex-col p-4 text-left transition-colors hover:bg-ccc-surface-raised/80 active:bg-ccc-accent/5"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-ccc-text">{chamber.name}</h3>
            <p className="font-mono text-xs tracking-wide text-ccc-accent-dim">
              {chamber.codename}
            </p>
          </div>
          <StatusBadge status={chamber.status} />
        </div>

        {heat && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs text-ccc-muted">
              <span>Domain heat</span>
              <span className="tabular-nums">{heat.activityScore}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ccc-border">
              <div
                className={`h-full rounded-full transition-all ${heatBarClass(heat.activityLevel)}`}
                style={{ width: `${Math.max(heat.activityScore, 4)}%` }}
              />
            </div>
          </div>
        )}

        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ccc-muted">
          {chamber.description}
        </p>
      </button>

      <div className="relative z-[2] overflow-visible border-t border-ccc-border/80 bg-ccc-surface-raised/40 px-3 py-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-ccc-muted">
          Operational floor
        </p>
        <SectorRoom chamber={chamber} occupants={occupants} />
        <p className="mt-2 text-xs text-ccc-muted">
          {operators.length} operator{operators.length !== 1 ? "s" : ""} ·{" "}
          {chamber.stationIds.length} station{chamber.stationIds.length !== 1 ? "s" : ""}
        </p>
      </div>
    </article>
  );
}
