"use client";

import type { SignalRouteSpec } from "@/lib/signal-routes";
import { CHAMBER_ANCHOR } from "@/lib/signal-routes";

interface LiveTransitRouteProps {
  route: SignalRouteSpec;
  motionRemainingMs: number;
}

function routeGeometry(from: { x: number; y: number }, to: { x: number; y: number }) {
  const midX = (from.x + to.x) / 2;
  const midY = Math.min(from.y, to.y) - 8;
  const d = `M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`;
  return { d };
}

export function LiveTransitRoute({ route, motionRemainingMs }: LiveTransitRouteProps) {
  const from = CHAMBER_ANCHOR[route.from];
  const to = CHAMBER_ANCHOR[route.to];
  if (!from || !to) return null;

  const { d } = routeGeometry(from, to);
  const durMs = route.intensity === "high" ? 1600 : 2400;
  const repeatCount = Math.max(1, Math.ceil(motionRemainingMs / durMs));
  const packetCount = route.intensity === "high" ? 2 : 1;

  return (
    <g
      className={`ccc-live-transit ccc-live-transit--motion ccc-live-transit--${route.intensity}`}
      aria-hidden
    >
      <path className="ccc-live-transit__path" d={d} fill="none" vectorEffect="non-scaling-stroke" />
      <path className="ccc-live-transit__path-glow" d={d} fill="none" vectorEffect="non-scaling-stroke" />
      {Array.from({ length: packetCount }, (_, i) => (
        <circle key={i} className="ccc-live-transit__packet" r="0.65">
          <animateMotion
            dur={`${durMs}ms`}
            repeatCount={repeatCount}
            path={d}
            begin={`${i * 550}ms`}
            fill="freeze"
          />
        </circle>
      ))}
    </g>
  );
}
