import type { CCCData, Operator, SectorId } from "@/data/types";

/** Operators stationed in a sector (current sector + sector assignment list) */
export function getOperatorsForSector(
  sectorId: SectorId,
  data: CCCData,
): Operator[] {
  const sector = data.sectors.find((s) => s.id === sectorId);
  const byId = new Map<string, Operator>();

  for (const op of data.operators) {
    const stationedHere =
      op.sectorId === sectorId ||
      (sector?.operatorIds.includes(op.id) ?? false);
    if (stationedHere) byId.set(op.id, op);
  }

  return Array.from(byId.values());
}
