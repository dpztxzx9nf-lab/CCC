"use client";

import { useMemo } from "react";
import { useCCC } from "@/context/CCCContext";
import { activeEventPulseKinds } from "@/lib/continuity/events/influence";
import { deriveOperatorPacket } from "@/lib/operator-display";
import { deriveEventSignalRoutes } from "@/lib/operations/discrete-burst";
import { buildFacilityOccupants } from "@/lib/operator-placement";
import { collectActivePackets, CHAMBER_ANCHOR } from "@/lib/signal-routes";
import { OperationalPacket } from "./OperationalPacket";
import { SignalRoute } from "./SignalRoute";

export function FacilitySignalLayer() {
  const {
    data,
    operational,
    continuityEvents,
    facilityNow,
    discreteBurst,
  } = useCCC();

  const occupantsByChamber = useMemo(
    () => buildFacilityOccupants(data, operational),
    [data, operational],
  );

  const routes = useMemo(() => {
    if (!discreteBurst.discreteActive) return [];
    return deriveEventSignalRoutes(discreteBurst.anchorEvent, facilityNow);
  }, [discreteBurst.discreteActive, discreteBurst.anchorEvent, facilityNow]);

  const packetCtx = useMemo(
    () => ({ facilityNow, discreteBurst, continuityEvents }),
    [facilityNow, discreteBurst, continuityEvents],
  );

  const chamberPackets = useMemo(() => {
    if (!discreteBurst.discreteActive) return [];
    return collectActivePackets(occupantsByChamber, operational, (op, beh, cid) =>
      deriveOperatorPacket(op, beh, cid, operational, packetCtx),
    ).map((p) => ({
      ...p,
      anchor: CHAMBER_ANCHOR[p.chamberId],
    }));
  }, [
    occupantsByChamber,
    operational,
    discreteBurst.discreteActive,
    packetCtx,
  ]);

  const eventPulses = useMemo(
    () =>
      discreteBurst.discreteActive
        ? activeEventPulseKinds(continuityEvents, facilityNow)
        : [],
    [discreteBurst.discreteActive, continuityEvents, facilityNow],
  );

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
            className="ccc-op-packet--signal"
          />
        </div>
      ))}
    </div>
  );
}
