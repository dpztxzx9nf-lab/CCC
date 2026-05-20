import type { InhabitantBehavior } from "@/data/inhabitant-types";
import type { OperationalSnapshot } from "@/data/operational-types";
import type { ActivityKind } from "@/lib/operations/taxonomy";
import { PROJECT_PROFILES } from "@/lib/operations/projectProfiles";
import type { CCCData, Operator, SectorId } from "@/data/types";
import { computeInhabitantBehavior } from "@/lib/inhabitant-behavior";

export interface SectorOccupant {
  operator: Operator;
  behavior: InhabitantBehavior;
}

function ownedProjectIds(operatorId: string): string[] {
  return PROJECT_PROFILES.filter((p) => p.operatorIds.includes(operatorId as never)).map(
    (p) => p.id,
  );
}

function topActivityKind(
  operatorId: string,
  operational: OperationalSnapshot | null,
): ActivityKind | null {
  if (!operational?.enabled) return null;
  const projects = ownedProjectIds(operatorId);
  const kindWeight: Partial<Record<ActivityKind, number>> = {};

  for (const sig of operational.signals) {
    if (!projects.includes(sig.projectId)) continue;
    kindWeight[sig.kind] = (kindWeight[sig.kind] ?? 0) + 1;
  }

  const entries = Object.entries(kindWeight);
  if (entries.length === 0) return null;
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0] as ActivityKind;
}

function operatorWorkload(
  operatorId: string,
  operational: OperationalSnapshot | null,
): number {
  return operational?.operators.find((o) => o.operatorId === operatorId)?.workload ?? 0;
}

function sectorScore(
  operational: OperationalSnapshot | null,
  sectorId: SectorId,
): number {
  return operational?.sectorHeat.find((h) => h.sectorId === sectorId)?.activityScore ?? 0;
}

/** One physical location per operator — collaboration = transit, not duplication. */
export function resolvePhysicalSector(
  operator: Operator,
  data: CCCData,
  operational: OperationalSnapshot | null,
): SectorId {
  const home = operator.sectorId;
  const workload = operatorWorkload(operator.id, operational);
  const top = topActivityKind(operator.id, operational);

  switch (operator.id) {
    case "fab-0": {
      const runtimeScore = sectorScore(operational, "runtime");
      const forgeScore = sectorScore(operational, "forge");
      if (
        workload >= 38 ||
        top === "deployment" ||
        runtimeScore >= 42 ||
        (runtimeScore > forgeScore + 12 && workload >= 18)
      ) {
        return "runtime";
      }
      return "forge";
    }
    case "bcast-1": {
      const coreScore = sectorScore(operational, "core");
      if (workload >= 28 && coreScore >= 35) return "core";
      return "relay";
    }
    case "scout-6": {
      const obsScore = sectorScore(operational, "observatory");
      if (workload >= 14 || obsScore >= 30 || top === "observability") return "observatory";
      return home;
    }
    case "nexus-7":
      return "core";
    case "deep-1":
      return "archive";
    default:
      return home;
  }
}

export function buildFacilityOccupants(
  data: CCCData,
  operational: OperationalSnapshot | null,
): Partial<Record<SectorId, SectorOccupant[]>> {
  const grouped = new Map<SectorId, Operator[]>();

  for (const op of data.operators) {
    const sectorId = resolvePhysicalSector(op, data, operational);
    const list = grouped.get(sectorId) ?? [];
    list.push(op);
    grouped.set(sectorId, list);
  }

  const result: Partial<Record<SectorId, SectorOccupant[]>> = {};

  for (const [sectorId, ops] of grouped) {
    result[sectorId] = ops.map((operator, slotIndex) => ({
      operator,
      behavior: computeInhabitantBehavior({
        operator,
        sectorId,
        slotIndex,
        slotTotal: ops.length,
        data,
        operational,
      }),
    }));
  }

  return result;
}

export function getOperatorsForSector(
  sectorId: SectorId,
  data: CCCData,
  operational: OperationalSnapshot | null = null,
): Operator[] {
  const occupants = buildFacilityOccupants(data, operational);
  return occupants[sectorId]?.map((o) => o.operator) ?? [];
}
