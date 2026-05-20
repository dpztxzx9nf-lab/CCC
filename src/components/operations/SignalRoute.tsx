"use client";

import { useFacilityResidue } from "@/context/FacilityResidueContext";
import type { SignalRouteSpec } from "@/lib/signal-routes";
import { SECTOR_ANCHOR } from "@/lib/signal-routes";

interface SignalRouteProps {
  route: SignalRouteSpec;
}

export function SignalRoute({ route }: SignalRouteProps) {
  const { transitRoutes } = useFacilityResidue();
  const from = SECTOR_ANCHOR[route.from];
  const to = SECTOR_ANCHOR[route.to];
  if (!from || !to) return null;

  const historic = transitRoutes.find(
    (r) =>
      (r.from === route.from && r.to === route.to) ||
      (r.from === route.to && r.to === route.from),
  );
  const worn = historic && historic.wearTier >= 2;

  const midX = (from.x + to.x) / 2;
  const midY = Math.min(from.y, to.y) - 8;

  return (
    <g
      className={`ccc-signal-route ccc-signal-route--${route.intensity}${worn ? " ccc-signal-route--worn" : ""}`}
      aria-hidden
      style={historic ? { opacity: 0.65 + historic.wear * 0.35 } : undefined}
    >
      <path
        className="ccc-signal-route__path"
        d={`M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`}
        fill="none"
        vectorEffect="non-scaling-stroke"
      />
      <circle className="ccc-signal-route__pulse" cx={to.x} cy={to.y} r="1.2" />
    </g>
  );
}
