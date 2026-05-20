import type { ContinuityEventView } from "@/lib/continuity/events/types";
import type { ChamberId, OperationalDomainId } from "@/data/ecology";
import { DOMAIN_TO_HOME_CHAMBER } from "@/data/ecology";
import type { SignalRouteSpec } from "@/lib/signal-routes";
import { decayedIntensity, toResidueTier, clamp01 } from "./decay";
import type { TransitRouteMemory } from "./types";

import { ECOLOGY_BY_OPERATOR } from "@/data/ecology";

const OPERATOR_HOME_CHAMBER: Record<string, ChamberId> = Object.fromEntries(
  Object.values(ECOLOGY_BY_OPERATOR).map((e) => [e.operatorId, e.homeChamberId]),
);

function chamberForDomain(domain: OperationalDomainId): ChamberId {
  return DOMAIN_TO_HOME_CHAMBER[domain];
}

function routeKey(from: ChamberId, to: ChamberId): string {
  return from <= to ? `${from}|${to}` : `${to}|${from}`;
}

function addWear(
  map: Map<string, { from: ChamberId; to: ChamberId; wear: number }>,
  from: ChamberId,
  to: ChamberId,
  amount: number,
): void {
  if (from === to || amount <= 0) return;
  const key = routeKey(from, to);
  const cur = map.get(key) ?? { from, to, wear: 0 };
  cur.wear = clamp01(cur.wear + amount);
  map.set(key, cur);
}

function domainPairs(sectors: OperationalDomainId[]): [OperationalDomainId, OperationalDomainId][] {
  const pairs: [OperationalDomainId, OperationalDomainId][] = [];
  for (let i = 0; i < sectors.length; i++) {
    for (let j = i + 1; j < sectors.length; j++) {
      pairs.push([sectors[i]!, sectors[j]!]);
    }
  }
  return pairs;
}

export function buildTransitMemory(
  events: ContinuityEventView[],
  liveRoutes: SignalRouteSpec[],
): TransitRouteMemory[] {
  const map = new Map<string, { from: ChamberId; to: ChamberId; wear: number }>();

  for (const ev of events) {
    const amount = decayedIntensity(ev.occurredAt, ev.importance, 0.85);
    if (amount < 0.04) continue;

    for (const [a, b] of domainPairs(ev.sectors as OperationalDomainId[])) {
      addWear(map, chamberForDomain(a), chamberForDomain(b), amount * 0.45);
    }

    for (const op of ev.operators) {
      const homeChamber = OPERATOR_HOME_CHAMBER[op];
      if (!homeChamber) continue;
      for (const s of ev.sectors) {
        const targetChamber = chamberForDomain(s);
        if (targetChamber !== homeChamber) {
          addWear(map, homeChamber, targetChamber, amount * 0.35);
        }
      }
    }

    if (ev.sectors.includes("core")) {
      const coreChamber = chamberForDomain("core");
      for (const s of ev.sectors) {
        if (s !== "core") addWear(map, coreChamber, chamberForDomain(s), amount * 0.25);
      }
    }
  }

  for (const route of liveRoutes) {
    const key = routeKey(route.from, route.to);
    const boost =
      route.intensity === "high" ? 0.22 : route.intensity === "medium" ? 0.14 : 0.08;
    const cur = map.get(key) ?? { from: route.from, to: route.to, wear: 0 };
    cur.wear = clamp01(cur.wear + boost);
    map.set(key, cur);
  }

  return [...map.values()]
    .map((r) => ({
      id: `${r.from}-${r.to}`,
      from: r.from,
      to: r.to,
      wear: r.wear,
      wearTier: toResidueTier(r.wear),
    }))
    .filter((r) => r.wear > 0.06)
    .sort((a, b) => b.wear - a.wear)
    .slice(0, 12);
}
