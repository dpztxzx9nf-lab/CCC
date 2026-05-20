"use client";

import type { SignalRouteSpec } from "@/lib/signal-routes";
import { CHAMBER_ANCHOR } from "@/lib/signal-routes";

interface SignalRouteProps {
  route: SignalRouteSpec;
}

export function SignalRoute({ route }: SignalRouteProps) {
  const from = CHAMBER_ANCHOR[route.from];
  const to = CHAMBER_ANCHOR[route.to];
  if (!from || !to) return null;

  const midX = (from.x + to.x) / 2;
  const midY = Math.min(from.y, to.y) - 8;

  return (
    <g className={`ccc-signal-route ccc-signal-route--${route.intensity}`} aria-hidden>
      <path
        className="ccc-signal-route__path"
        d={`M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`}
        fill="none"
        vectorEffect="non-scaling-stroke"
      />
      <rect
        className="ccc-signal-route__endpoint"
        x={to.x - 0.55}
        y={to.y - 0.55}
        width="1.1"
        height="1.1"
        transform={`rotate(45 ${to.x} ${to.y})`}
      />
    </g>
  );
}
