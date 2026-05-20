import type { SectorId } from "@/data/types";
import type { OperatorId } from "@/lib/operations/taxonomy";
import { OPERATOR_IDS } from "@/lib/operations/taxonomy";

/** Primary sector ownership — mirrors snapshot operator mapping */
const SECTOR_OPERATOR_OWNERSHIP: Record<SectorId, OperatorId[]> = {
  core: ["nexus-7", "scout-6"],
  archive: ["deep-1"],
  forge: ["fab-0"],
  observatory: ["scout-6"],
  relay: ["bcast-1"],
  runtime: ["fab-0"],
};

export function operatorsForSector(sector: SectorId): OperatorId[] {
  return [...(SECTOR_OPERATOR_OWNERSHIP[sector] ?? [])];
}

export function operatorsForSectors(sectors: SectorId[]): OperatorId[] {
  const seen = new Set<OperatorId>();
  const out: OperatorId[] = [];
  for (const s of sectors) {
    for (const op of operatorsForSector(s)) {
      if (!seen.has(op)) {
        seen.add(op);
        out.push(op);
      }
    }
  }
  if (out.length === 0) {
    return ["deep-1"];
  }
  return out.filter((id) => OPERATOR_IDS.includes(id));
}

export function primaryOperatorForSector(sector: SectorId): OperatorId {
  return operatorsForSector(sector)[0] ?? "deep-1";
}
