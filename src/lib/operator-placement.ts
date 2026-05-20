import type { InhabitantBehavior } from "@/data/inhabitant-types";
import type { OperationalSnapshot } from "@/data/operational-types";
import type { CCCData, Operator } from "@/data/types";
import type { ChamberId } from "@/data/ecology";
import { domainForChamber } from "@/lib/facility/ecology-resolve";
import {
  resolveOperatorPlacement,
  resolvePhysicalSector,
} from "@/lib/facility/ecology-resolve";
import { computeInhabitantBehavior } from "@/lib/inhabitant-behavior";

export interface ChamberOccupant {
  operator: Operator;
  behavior: InhabitantBehavior;
  placement: ReturnType<typeof resolveOperatorPlacement>;
}

/** @deprecated use ChamberOccupant */
export type SectorOccupant = ChamberOccupant;

/** One physical chamber location per operator */
export function buildFacilityOccupants(
  data: CCCData,
  operational: OperationalSnapshot | null,
): Partial<Record<ChamberId, ChamberOccupant[]>> {
  const grouped = new Map<ChamberId, Operator[]>();

  for (const op of data.operators) {
    const placement = resolveOperatorPlacement(op, operational);
    const list = grouped.get(placement.currentChamberId) ?? [];
    list.push(op);
    grouped.set(placement.currentChamberId, list);
  }

  const result: Partial<Record<ChamberId, ChamberOccupant[]>> = {};

  for (const [chamberId, ops] of grouped) {
    result[chamberId] = ops.map((operator, slotIndex) => {
      const placement = resolveOperatorPlacement(operator, operational);
      return {
        operator,
        placement,
        behavior: computeInhabitantBehavior({
          operator,
          chamberId,
          primaryDomain: placement.primaryDomain,
          placement,
          slotIndex,
          slotTotal: ops.length,
          data,
          operational,
        }),
      };
    });
  }

  return result;
}

export function getOperatorsInChamber(
  chamberId: ChamberId,
  data: CCCData,
  operational: OperationalSnapshot | null = null,
): Operator[] {
  const occupants = buildFacilityOccupants(data, operational);
  return occupants[chamberId]?.map((o) => o.operator) ?? [];
}

/** @deprecated use getOperatorsInChamber — id is chamber id */
export function getOperatorsForSector(
  sectorId: import("@/data/types").SectorId,
  data: CCCData,
  operational: OperationalSnapshot | null = null,
): Operator[] {
  const chamber = data.chambers.find((c) => c.primaryDomain === sectorId);
  if (!chamber) return [];
  return getOperatorsInChamber(chamber.id, data, operational);
}

export { resolveOperatorPlacement, resolvePhysicalSector, domainForChamber };
