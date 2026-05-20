"use client";

import { CHAMBER_ANCHOR } from "@/lib/signal-routes";
import { CHAMBER_ORDER } from "@/lib/facility-layout";

interface InfrastructureAnchorLayerProps {
  wearTier?: number;
  pulseCadence?: number;
  eventPulse?: boolean;
}

export function InfrastructureAnchorLayer({
  wearTier = 0,
  pulseCadence = 0,
  eventPulse = false,
}: InfrastructureAnchorLayerProps) {
  const wearClass =
    wearTier >= 4 ? "ccc-infra-anchor--wear-high" : wearTier >= 2 ? "ccc-infra-anchor--wear-mid" : "";
  const cadenceClass =
    pulseCadence >= 4
      ? "ccc-infra-anchor--cadence-fast"
      : pulseCadence >= 2
        ? "ccc-infra-anchor--cadence-mid"
        : "";

  return (
    <div
      className={`ccc-infra-anchor ${wearClass} ${cadenceClass}${eventPulse ? " ccc-infra-anchor--event" : ""}`.trim()}
      aria-hidden
    >
      <div className="ccc-infra-anchor__spine ccc-infra-anchor__spine--elevator" />
      <div className="ccc-infra-anchor__spine ccc-infra-anchor__spine--horizontal" />
      <div className="ccc-infra-anchor__spine ccc-infra-anchor__spine--vertical" />
      {CHAMBER_ORDER.map((chamberId) => {
        const anchor = CHAMBER_ANCHOR[chamberId];
        if (!anchor) return null;
        return (
          <span
            key={chamberId}
            className="ccc-infra-anchor__node"
            style={{ left: `${anchor.x}%`, top: `${anchor.y}%` }}
          />
        );
      })}
    </div>
  );
}
