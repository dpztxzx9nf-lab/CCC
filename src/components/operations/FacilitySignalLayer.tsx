"use client";

import { useMemo } from "react";
import { useCCC } from "@/context/CCCContext";
import { deriveOperatorPacket } from "@/lib/operator-display";
import { buildFacilityOccupants } from "@/lib/operator-placement";
import { activeEventPulseKinds } from "@/lib/continuity/events/influence";
import {
  collectActivePackets,
  deriveSignalRoutes,
  CHAMBER_ANCHOR,
} from "@/lib/signal-routes";
import { OperationalPacket } from "./OperationalPacket";
import { SignalRoute } from "./SignalRoute";

export function FacilitySignalLayer() {
  const { data, operational, continuityEvents } = useCCC();

  const occupantsByChamber = useMemo(
    () => buildFacilityOccupants(data, operational),
    [data, operational],
  );

  const routes = useMemo(
    () => deriveSignalRoutes(occupantsByChamber, operational),
    [occupantsByChamber, operational],
  );

  const chamberPackets = useMemo(() => {
    const raw = collectActivePackets(occupantsByChamber, operational, (op, beh, cid) =>
      deriveOperatorPacket(op, beh, cid, operational),
    );
    return raw.map((p) => ({
      ...p,
      anchor: CHAMBER_ANCHOR[p.chamberId],
    }));
  }, [occupantsByChamber, operational]);

  const eventPulses = activeEventPulseKinds(continuityEvents);

  if (routes.length === 0 && chamberPackets.length === 0 && eventPulses.length === 0) {
    return null;
  }

  return (
    <div className="ccc-signal-layer" aria-hidden>
      {eventPulses.length > 0 && (
        <div className="ccc-signal-layer__event-pulse" key={eventPulses.join("-")} />
      )}
      <svg
        className="ccc-signal-layer__svg"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {routes.map((route) => (
          <SignalRoute key={route.id} route={route} />
        ))}
      </svg>
      {chamberPackets.map((p) => (
        <div
          key={`${p.operatorId}-${p.text}`}
          className="ccc-signal-layer__packet-anchor"
          style={{
            left: `${p.anchor.x}%`,
            top: `${Math.max(4, p.anchor.y - 8)}%`,
          }}
        >
          <OperationalPacket
            packetKey={`${p.operatorId}-${p.text}`}
            text={p.text}
          />
        </div>
      ))}
    </div>
  );
}
