import type { InhabitantBehavior, InhabitantPosture, BehaviorIntensity } from "@/data/inhabitant-types";
import type { OperationalSnapshot } from "@/data/operational-types";
import type { ActivityKind } from "@/lib/operations/taxonomy";
import { PROJECT_PROFILES } from "@/lib/operations/projectProfiles";
import type { CCCData, Operator, SectorId, Station } from "@/data/types";
import { mockStations } from "@/data/mock/stations";

export const STATION_LAYOUT: Record<string, { x: number; y: number }> = {
  "continuity-desk": { x: 22, y: 68 },
  "governance-console": { x: 72, y: 28 },
  "vault-indexer": { x: 28, y: 62 },
  "memory-lattice": { x: 72, y: 62 },
  "build-forge": { x: 24, y: 58 },
  "deploy-rail": { x: 76, y: 58 },
  "metrics-array": { x: 38, y: 55 },
  "cost-scanner": { x: 68, y: 55 },
  "broadcast-hub": { x: 32, y: 58 },
  "projection-deck": { x: 72, y: 58 },
  "runtime-monitor": { x: 28, y: 58 },
  "api-gateway": { x: 74, y: 58 },
};

const DEFAULT_ROOM = { x: 50, y: 50 };

function intensityFromWorkload(workload: number): BehaviorIntensity {
  if (workload >= 50) return "elevated";
  if (workload >= 18) return "steady";
  return "calm";
}

function ownedProjectIds(operatorId: string): string[] {
  return PROJECT_PROFILES.filter((p) => p.operatorIds.includes(operatorId as never)).map(
    (p) => p.id,
  );
}

function operatorSignals(
  operatorId: string,
  operational: OperationalSnapshot | null,
): { kind: ActivityKind; label: string; weight: number }[] {
  if (!operational?.enabled) return [];
  const projects = ownedProjectIds(operatorId);
  const kindWeight: Partial<Record<ActivityKind, number>> = {};

  for (const sig of operational.signals) {
    if (!projects.includes(sig.projectId)) continue;
    const w = kindWeight[sig.kind] ?? 0;
    kindWeight[sig.kind] = w + 1;
  }

  return Object.entries(kindWeight).map(([kind, weight]) => ({
    kind: kind as ActivityKind,
    label: kind,
    weight,
  }));
}

function topActivityKind(
  operatorId: string,
  operational: OperationalSnapshot | null,
): ActivityKind | null {
  const sigs = operatorSignals(operatorId, operational);
  if (sigs.length === 0) return null;
  sigs.sort((a, b) => b.weight - a.weight);
  return sigs[0].kind;
}

function stationForSector(sectorId: SectorId, data: CCCData): Station[] {
  return data.stations.filter((s) => s.sectorId === sectorId);
}

function pickStation(
  sectorId: SectorId,
  data: CCCData,
  preferredIds: string[],
): Station | null {
  const available = stationForSector(sectorId, data);
  for (const id of preferredIds) {
    const st = available.find((s) => s.id === id) ?? mockStations.find((s) => s.id === id);
    if (st && st.sectorId === sectorId) return st;
  }
  return available[0] ?? null;
}

export function getStationLayoutPosition(stationId: string): InhabitantBehavior["position"] {
  return STATION_LAYOUT[stationId] ?? DEFAULT_ROOM;
}

function positionAtStation(
  stationId: string | null,
  slotIndex: number,
  slotTotal: number,
): InhabitantBehavior["position"] {
  const base = stationId ? (STATION_LAYOUT[stationId] ?? DEFAULT_ROOM) : DEFAULT_ROOM;
  const spread = slotTotal > 1 ? (slotIndex - (slotTotal - 1) / 2) * 14 : 0;
  return {
    x: Math.min(88, Math.max(12, base.x + spread)),
    y: base.y,
  };
}

function transitFromSector(
  operator: Operator,
  placementSectorId: SectorId,
): SectorId | null {
  return operator.sectorId !== placementSectorId ? operator.sectorId : null;
}

interface BehaviorInput {
  operator: Operator;
  sectorId: SectorId;
  slotIndex: number;
  slotTotal: number;
  data: CCCData;
  operational: OperationalSnapshot | null;
}

function resolveFab0(input: BehaviorInput): Omit<InhabitantBehavior, "operatorId" | "position" | "transitFrom"> {
  const { sectorId, operational } = input;
  const derived = operational?.operators.find((o) => o.operatorId === "fab-0");
  const workload = derived?.workload ?? 0;
  const top = topActivityKind("fab-0", operational);

  if (sectorId === "runtime") {
    const station = pickStation("runtime", input.data, ["runtime-monitor", "api-gateway"]);
    return {
      posture: workload >= 40 ? "monitoring" : "focused",
      stateLabel: workload >= 40 ? "Runtime diagnostics" : "Runtime watch",
      purpose: "Responding to live runtime load and deployment health",
      stationId: station?.id ?? null,
      stationName: station?.name ?? null,
      intensity: intensityFromWorkload(workload),
    };
  }

  if (top === "deployment" || top === "forge") {
    const station = pickStation("forge", input.data, ["deploy-rail", "build-forge"]);
    return {
      posture: top === "deployment" ? "building" : "building",
      stateLabel: top === "deployment" ? "Deployment rail" : "Build forge",
      purpose: "Code, build, and deployment activity on owned projects",
      stationId: station?.id ?? null,
      stationName: station?.name ?? null,
      intensity: intensityFromWorkload(workload),
    };
  }

  const station = pickStation("forge", input.data, ["build-forge", "deploy-rail"]);
  return {
    posture: workload > 10 ? "building" : "anchored",
    stateLabel: workload > 10 ? "Implementation focus" : "Forge standby",
    purpose: "Forge lead — materializing designs into running systems",
    stationId: station?.id ?? null,
    stationName: station?.name ?? null,
    intensity: intensityFromWorkload(workload),
  };
}

function resolveDeep1(input: BehaviorInput): Omit<InhabitantBehavior, "operatorId" | "position" | "transitFrom"> {
  const derived = input.operational?.operators.find((o) => o.operatorId === "deep-1");
  const workload = derived?.workload ?? 0;
  const top = topActivityKind("deep-1", input.operational);
  const heat = input.operational?.sectorHeat.find((h) => h.sectorId === "archive");

  if (top === "continuity" || top === "archive" || (heat?.activityScore ?? 0) >= 40) {
    const station = pickStation("archive", input.data, ["memory-lattice", "vault-indexer"]);
    return {
      posture: (heat?.activityScore ?? 0) >= 50 ? "reviewing" : "archiving",
      stateLabel: (heat?.activityScore ?? 0) >= 50 ? "Continuity review" : "Vault sync",
      purpose: "Markdown and archive continuity activity",
      stationId: station?.id ?? null,
      stationName: station?.name ?? null,
      intensity: intensityFromWorkload(workload),
    };
  }

  const station = pickStation("archive", input.data, ["vault-indexer", "memory-lattice"]);
  return {
    posture: "anchored",
    stateLabel: "Archive anchor",
    purpose: "Stewarding long-horizon memory — calm continuity watch",
    stationId: station?.id ?? null,
    stationName: station?.name ?? null,
    intensity: intensityFromWorkload(workload),
  };
}

function resolveBcast1(input: BehaviorInput): Omit<InhabitantBehavior, "operatorId" | "position" | "transitFrom"> {
  const derived = input.operational?.operators.find((o) => o.operatorId === "bcast-1");
  const workload = derived?.workload ?? 0;
  const top = topActivityKind("bcast-1", input.operational);

  if (input.sectorId === "core") {
    const station = pickStation("core", input.data, ["continuity-desk", "governance-console"]);
    return {
      posture: "relaying",
      stateLabel: "Projection brief",
      purpose: "Coordinating outward narrative from command core",
      stationId: station?.id ?? null,
      stationName: station?.name ?? null,
      intensity: intensityFromWorkload(workload),
    };
  }

  const station = pickStation("relay", input.data, ["broadcast-hub", "projection-deck"]);
  const commsActive = top === "communications" || top === "documentation";
  return {
    posture: commsActive ? "relaying" : workload > 8 ? "focused" : "anchored",
    stateLabel: commsActive ? "Broadcast hub" : "Relay standby",
    purpose: "Communications and projection for active initiatives",
    stationId: station?.id ?? null,
    stationName: station?.name ?? null,
    intensity: intensityFromWorkload(workload),
  };
}

function resolveNexus7(input: BehaviorInput): Omit<InhabitantBehavior, "operatorId" | "position" | "transitFrom"> {
  const derived = input.operational?.operators.find((o) => o.operatorId === "nexus-7");
  const workload = derived?.workload ?? 0;
  const heat = input.operational?.sectorHeat ?? [];
  const multiPressure = heat.filter((h) => h.operationalLoad >= 2).length >= 2;
  const coreHeat = heat.find((h) => h.sectorId === "core")?.activityScore ?? 0;

  const station = pickStation("core", input.data, [
    "governance-console",
    "continuity-desk",
  ]);

  if (multiPressure || coreHeat >= 45 || workload >= 45) {
    return {
      posture: "coordinating",
      stateLabel: "Command oversight",
      purpose: "Multi-project operational pressure — sector coordination",
      stationId: station?.id ?? null,
      stationName: station?.name ?? null,
      intensity: intensityFromWorkload(workload),
    };
  }

  if (workload > 12) {
    return {
      posture: "focused",
      stateLabel: "Continuity routing",
      purpose: "Architecture and governance across active threads",
      stationId: station?.id ?? null,
      stationName: station?.name ?? null,
      intensity: intensityFromWorkload(workload),
    };
  }

  return {
    posture: "anchored",
    stateLabel: "Governance watch",
    purpose: "Strategic alignment — facility in calm state",
    stationId: station?.id ?? null,
    stationName: station?.name ?? null,
    intensity: intensityFromWorkload(workload),
  };
}

function resolveScout6(input: BehaviorInput): Omit<InhabitantBehavior, "operatorId" | "position" | "transitFrom"> {
  const derived = input.operational?.operators.find((o) => o.operatorId === "scout-6");
  const workload = derived?.workload ?? 0;

  if (input.sectorId === "observatory") {
    const station = pickStation("observatory", input.data, [
      "metrics-array",
      "cost-scanner",
    ]);
    return {
      posture: "scouting",
      stateLabel: "Observatory scan",
      purpose: "Discovery, imports, and observatory analysis",
      stationId: station?.id ?? null,
      stationName: station?.name ?? null,
      intensity: intensityFromWorkload(workload),
    };
  }

  const station = pickStation("core", input.data, ["continuity-desk", "governance-console"]);
  return {
    posture: workload > 15 ? "scouting" : "anchored",
    stateLabel: workload > 15 ? "Field liaison" : "Scout standby",
    purpose: "Offline intelligence and field systems continuity",
    stationId: station?.id ?? null,
    stationName: station?.name ?? null,
    intensity: intensityFromWorkload(workload),
  };
}

function defaultBehavior(input: BehaviorInput): Omit<InhabitantBehavior, "operatorId" | "position" | "transitFrom"> {
  const derived = input.operational?.operators.find(
    (o) => o.operatorId === input.operator.id,
  );
  const workload = derived?.workload ?? 0;
  const stations = stationForSector(input.sectorId, input.data);
  const station = stations[0] ?? null;

  return {
    posture: workload > 20 ? "focused" : "anchored",
    stateLabel: workload > 20 ? "Active workflow" : "Standby",
    purpose: input.operator.currentActivity,
    stationId: station?.id ?? null,
    stationName: station?.name ?? null,
    intensity: intensityFromWorkload(workload),
  };
}

export function computeInhabitantBehavior(input: BehaviorInput): InhabitantBehavior {
  const { operator, sectorId, slotIndex, slotTotal, data, operational } = input;

  let core: Omit<InhabitantBehavior, "operatorId" | "position" | "transitFrom">;

  switch (operator.id) {
    case "fab-0":
      core = resolveFab0(input);
      break;
    case "deep-1":
      core = resolveDeep1(input);
      break;
    case "bcast-1":
      core = resolveBcast1(input);
      break;
    case "nexus-7":
      core = resolveNexus7(input);
      break;
    case "scout-6":
      core = resolveScout6(input);
      break;
    default:
      core = defaultBehavior(input);
  }

  const sectorHeat = operational?.sectorHeat.find((h) => h.sectorId === sectorId);
  if (sectorHeat?.activityLevel === "idle" && core.intensity !== "elevated") {
    core = {
      ...core,
      posture: core.posture === "focused" ? "anchored" : core.posture,
      intensity: "calm",
    };
  }

  const position = positionAtStation(core.stationId, slotIndex, slotTotal);

  return {
    operatorId: operator.id,
    ...core,
    position,
    transitFrom: transitFromSector(operator, sectorId),
  };
}
