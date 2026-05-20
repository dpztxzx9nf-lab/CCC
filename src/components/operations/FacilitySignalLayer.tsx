"use client";

import { useMemo } from "react";
import { useCCC } from "@/context/CCCContext";
import { deriveOperatorPacket } from "@/lib/operator-display";
import { buildFacilityOccupants } from "@/lib/operator-placement";
import {
  collectActivePackets,
  deriveSignalRoutes,
  SECTOR_ANCHOR,
} from "@/lib/signal-routes";
import { OperationalPacket } from "./OperationalPacket";
import { SignalRoute } from "./SignalRoute";

export function FacilitySignalLayer() {
  const { data, operational } = useCCC();

  const occupantsBySector = useMemo(
    () => buildFacilityOccupants(data, operational),
    [data, operational],
  );

  const routes = useMemo(
    () => deriveSignalRoutes(occupantsBySector, operational),
    [occupantsBySector, operational],
  );

  const sectorPackets = useMemo(() => {
    const raw = collectActivePackets(occupantsBySector, operational, (op, beh, sid) =>
      deriveOperatorPacket(op, beh, sid, operational),
    );
    return raw.map((p) => ({
      ...p,
      anchor: SECTOR_ANCHOR[p.sectorId],
    }));
  }, [occupantsBySector, operational]);

  if (routes.length === 0 && sectorPackets.length === 0) return null;

  return (
    <div className="ccc-signal-layer" aria-hidden>
      <svg
        className="ccc-signal-layer__svg"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {routes.map((route) => (
          <SignalRoute key={route.id} route={route} />
        ))}
      </svg>
      {sectorPackets.map((p) => (
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
