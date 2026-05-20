"use client";

import { useFacilityResidue } from "@/context/FacilityResidueContext";
import { CHAMBER_ANCHOR } from "@/lib/signal-routes";

export function HistoricTransitLayer() {
  const { transitRoutes } = useFacilityResidue();

  if (transitRoutes.length === 0) return null;

  return (
    <svg
      className="ccc-residue-transit"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden
    >
      {transitRoutes.map((route) => {
        const from = CHAMBER_ANCHOR[route.from];
        const to = CHAMBER_ANCHOR[route.to];
        if (!from || !to) return null;

        const midX = (from.x + to.x) / 2;
        const midY = Math.min(from.y, to.y) - 6;

        return (
          <path
            key={route.id}
            className="ccc-residue-transit__path"
            data-wear={route.wearTier}
            d={`M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`}
            fill="none"
            vectorEffect="non-scaling-stroke"
            style={{ opacity: 0.08 + route.wear * 0.28 }}
          />
        );
      })}
    </svg>
  );
}
