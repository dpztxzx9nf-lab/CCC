"use client";

import { useMemo } from "react";
import { useCCC } from "@/context/CCCContext";
import { buildFacilityOccupants } from "@/lib/operator-placement";
import { deriveLiveTransitRoutes } from "@/lib/signal-routes";
import { LiveTransitRoute } from "./LiveTransitRoute";

export function LiveTransitLayer() {
  const { data, operational } = useCCC();

  const routes = useMemo(() => {
    const occupants = buildFacilityOccupants(data, operational);
    return deriveLiveTransitRoutes(occupants);
  }, [data, operational]);

  if (routes.length === 0) return null;

  return (
    <svg
      className="ccc-live-transit-layer"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden
    >
      {routes.map((route) => (
        <LiveTransitRoute key={route.id} route={route} />
      ))}
    </svg>
  );
}
