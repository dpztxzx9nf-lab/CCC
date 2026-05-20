import type { ContinuityEventView } from "@/lib/continuity/events/types";
import type { SectorId } from "@/data/types";
import type { SignalRouteSpec } from "@/lib/signal-routes";
import { decayedIntensity, toResidueTier, clamp01 } from "./decay";
import type { TransitRouteMemory } from "./types";

const OPERATOR_HOME: Record<string, SectorId> = {
  "nexus-7": "core",
  "deep-1": "archive",
  "fab-0": "forge",
  "bcast-1": "relay",
  "scout-6": "observatory",
};

function routeKey(from: SectorId, to: SectorId): string {
  return from <= to ? `${from}|${to}` : `${to}|${from}`;
}

function addWear(
  map: Map<string, { from: SectorId; to: SectorId; wear: number }>,
  from: SectorId,
  to: SectorId,
  amount: number,
): void {
  if (from === to || amount <= 0) return;
  const key = routeKey(from, to);
  const cur = map.get(key) ?? { from, to, wear: 0 };
  cur.wear = clamp01(cur.wear + amount);
  map.set(key, cur);
}

function sectorPairs(sectors: SectorId[]): [SectorId, SectorId][] {
  const pairs: [SectorId, SectorId][] = [];
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
  const map = new Map<string, { from: SectorId; to: SectorId; wear: number }>();

  for (const ev of events) {
    const amount = decayedIntensity(ev.occurredAt, ev.importance, 0.85);
    if (amount < 0.04) continue;

    for (const [a, b] of sectorPairs(ev.sectors)) {
      addWear(map, a, b, amount * 0.45);
    }

    for (const op of ev.operators) {
      const home = OPERATOR_HOME[op];
      if (!home) continue;
      for (const s of ev.sectors) {
        if (s !== home) addWear(map, home, s, amount * 0.35);
      }
    }

    if (ev.sectors.includes("core")) {
      for (const s of ev.sectors) {
        if (s !== "core") addWear(map, "core", s, amount * 0.25);
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
