"use client";

import { useMemo } from "react";
import { useCCC } from "@/context/CCCContext";
import { buildFacilityOccupants } from "@/lib/operator-placement";
import { deriveLiveTransitRoutes } from "@/lib/signal-routes";
import { LiveTransitRoute } from "./LiveTransitRoute";

/**
 * Yellow path beads — only during short transitMotion windows (placement / event onset / sync).
 * Steady-state occupancy in transit does not keep beads moving.
 */
export function LiveTransitLayer() {
  const { data, operational, discreteBurst } = useCCC();

  const routes = useMemo(() => {
    if (!discreteBurst.transitMotionActive) return [];
    const occupants = buildFacilityOccupants(data, operational);
    return deriveLiveTransitRoutes(occupants);
  }, [data, operational, discreteBurst.transitMotionActive]);

  if (routes.length === 0) return null;

  return (
    <svg
      className="ccc-live-transit-layer"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden
    >
      {routes.map((route) => (
        <LiveTransitRoute
          key={route.id}
          route={route}
          motionRemainingMs={discreteBurst.transitMotionRemainingMs}
        />
      ))}
    </svg>
  );
}
