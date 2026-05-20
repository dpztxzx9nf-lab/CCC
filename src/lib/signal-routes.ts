import type { InhabitantBehavior } from "@/data/inhabitant-types";
import type { OperationalSnapshot } from "@/data/operational-types";
import type { Operator, OperationalDomainId } from "@/data/types";
import type { ChamberId } from "@/data/ecology";
import { CHAMBER_TO_DOMAIN, DOMAIN_TO_HOME_CHAMBER } from "@/data/ecology";
import { getFacilityPulse } from "@/lib/chamber-atmosphere";
import type { ChamberOccupant } from "@/lib/operator-placement";

export type SignalIntensity = "low" | "medium" | "high";

export interface SignalRouteSpec {
  id: string;
  from: ChamberId;
  to: ChamberId;
  intensity: SignalIntensity;
}

/** Normalized anchor (0–100) within megastructure grid */
export const CHAMBER_ANCHOR: Record<ChamberId, { x: number; y: number }> = {
  "signal-bridge": { x: 11, y: 36 },
  "nexus-prime": { x: 42, y: 20 },
  "observation-deck": { x: 89, y: 20 },
  foundry: { x: 42, y: 44 },
  "deep-stack": { x: 22, y: 80 },
  "live-grid": { x: 74, y: 80 },
};

/** Domain anchor via each domain's home chamber (legacy domain-keyed visuals) */
export const DOMAIN_ANCHOR = Object.fromEntries(
  (Object.entries(DOMAIN_TO_HOME_CHAMBER) as [OperationalDomainId, ChamberId][]).map(
    ([domain, chamber]) => [domain, CHAMBER_ANCHOR[chamber]],
  ),
) as Record<OperationalDomainId, { x: number; y: number }>;

/** @deprecated use DOMAIN_ANCHOR or CHAMBER_ANCHOR */
export const SECTOR_ANCHOR = DOMAIN_ANCHOR;

function domainForRouteChamber(chamberId: ChamberId): OperationalDomainId {
  return CHAMBER_TO_DOMAIN[chamberId];
}

/** Active operator movement between chambers (happening now). */
export function deriveLiveTransitRoutes(
  occupantsByChamber: Partial<Record<ChamberId, ChamberOccupant[]>>,
): SignalRouteSpec[] {
  const routes: SignalRouteSpec[] = [];
  const seen = new Set<string>();

  for (const [chamberId, occupants] of Object.entries(occupantsByChamber) as [
    ChamberId,
    ChamberOccupant[],
  ][]) {
    for (const { behavior, placement } of occupants ?? []) {
      if (!placement.transitFromChamberId) continue;
      const from = placement.transitFromChamberId;
      const to = chamberId;
      if (from === to) continue;
      const id = `${from}-${to}`;
      if (seen.has(id)) continue;
      seen.add(id);
      routes.push({
        id,
        from,
        to,
        intensity: behavior.intensity === "elevated" ? "high" : "medium",
      });
    }
  }

  return routes;
}

/** Comms / sync traffic between facility nodes (not physical operator movement). */
export function deriveSignalRoutes(
  _occupantsByChamber: Partial<Record<ChamberId, ChamberOccupant[]>>,
  operational: OperationalSnapshot | null,
): SignalRouteSpec[] {
  const routes: SignalRouteSpec[] = [];
  const seen = new Set<string>();

  const add = (from: ChamberId, to: ChamberId, intensity: SignalIntensity) => {
    if (from === to) return;
    const id = `${from}-${to}`;
    if (seen.has(id)) return;
    seen.add(id);
    routes.push({ id, from, to, intensity });
  };

  const heat = operational?.sectorHeat ?? [];
  const pulse = getFacilityPulse(heat);

  if (pulse.focusSector) {
    const focusChamber = chamberForDomain(pulse.focusSector as OperationalDomainId);
    for (const hot of pulse.hotSectors) {
      const hotChamber = chamberForDomain(hot as OperationalDomainId);
      if (hotChamber !== focusChamber) {
        add(chamberForDomain("core"), hotChamber, "medium");
      }
    }
    if (pulse.focusSector !== "core" && pulse.hotSectors.length > 0) {
      add(chamberForDomain("core"), focusChamber, "high");
    }
  }

  const archiveHeat = heat.find((h) => h.sectorId === "archive")?.activityScore ?? 0;
  const forgeHeat = heat.find((h) => h.sectorId === "forge")?.activityScore ?? 0;
  if (archiveHeat >= 28 && forgeHeat >= 18) {
    add("deep-stack", "foundry", "low");
  }

  const relayHeat = heat.find((h) => h.sectorId === "relay")?.activityScore ?? 0;
  if (relayHeat >= 24) {
    add("signal-bridge", "nexus-prime", "low");
  }

  return routes.slice(0, 6);
}

function chamberForDomain(domain: OperationalDomainId): ChamberId {
  const map: Record<OperationalDomainId, ChamberId> = {
    core: "nexus-prime",
    archive: "deep-stack",
    forge: "foundry",
    observatory: "observation-deck",
    relay: "signal-bridge",
    runtime: "live-grid",
  };
  return map[domain];
}

export function collectActivePackets(
  occupantsByChamber: Partial<Record<ChamberId, ChamberOccupant[]>>,
  operational: OperationalSnapshot | null,
  derivePacket: (
    operator: Operator,
    behavior: InhabitantBehavior,
    chamberId: ChamberId,
  ) => string | null,
): { chamberId: ChamberId; operatorId: string; text: string }[] {
  const packets: { chamberId: ChamberId; operatorId: string; text: string }[] = [];

  for (const [chamberId, occupants] of Object.entries(occupantsByChamber) as [
    ChamberId,
    ChamberOccupant[],
  ][]) {
    for (const { operator, behavior } of occupants ?? []) {
      const text = derivePacket(operator, behavior, chamberId);
      if (text) {
        packets.push({ chamberId, operatorId: operator.id, text });
      }
    }
  }

  return packets.slice(0, 5);
}
