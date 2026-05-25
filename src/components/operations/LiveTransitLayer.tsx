"use client";

import { useMemo } from "react";
import { useCCC } from "@/context/CCCContext";
import { deriveHistoryEnvironmentalProjection } from "@/lib/continuity/history";
import { buildFacilityOccupants } from "@/lib/operator-placement";
import { deriveLiveTransitRoutes } from "@/lib/signal-routes";
import { LiveTransitRoute } from "./LiveTransitRoute";

/**
 * Yellow path beads — only during short transitMotion windows (placement / event onset / sync).
 * Steady-state occupancy in transit does not keep beads moving.
 */
export function LiveTransitLayer() {
  const { data, operational, discreteBurst, facilityNow } = useCCC();

  const historyProjection = useMemo(
    () =>
      deriveHistoryEnvironmentalProjection(operational?.historyEvents, facilityNow),
    [operational?.historyEvents, facilityNow],
  );

  const routes = useMemo(() => {
    const liveRoutes = discreteBurst.transitMotionActive
      ? deriveLiveTransitRoutes(buildFacilityOccupants(data, operational))
      : [];
    return [...liveRoutes, ...historyProjection.transitRoutes];
  }, [
    data,
    operational,
    discreteBurst.transitMotionActive,
    historyProjection.transitRoutes,
  ]);

  if (routes.length === 0) return null;

  const motionRemainingMs = Math.max(
    discreteBurst.transitMotionRemainingMs,
    historyProjection.motionRemainingMs,
  );

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
          motionRemainingMs={motionRemainingMs}
        />
      ))}
    </svg>
  );
}
