import type { SectorId } from "@/data/types";
import type { ActivityKind, OperationalCategory } from "./taxonomy";

/** Base continuity weight per sector (importance in megastructure) */
export const SECTOR_CONTINUITY_WEIGHT: Record<SectorId, number> = {
  core: 1.0,
  archive: 0.85,
  forge: 0.9,
  observatory: 0.7,
  relay: 0.75,
  runtime: 0.95,
};

/** Category → primary sectors */
export const CATEGORY_SECTOR_BIAS: Record<OperationalCategory, SectorId[]> = {
  command: ["core", "observatory", "forge"],
  platform: ["core", "runtime", "forge", "relay"],
  intelligence: ["core", "relay", "observatory"],
  orientation: ["core", "archive", "observatory"],
  knowledge: ["archive", "core"],
  "game-runtime": ["runtime", "relay", "forge"],
  archive: ["archive", "core"],
};

/** Activity kind weights when aggregating sector heat */
export const ACTIVITY_HEAT_WEIGHT: Record<ActivityKind, number> = {
  documentation: 8,
  continuity: 12,
  architecture: 10,
  forge: 14,
  runtime: 12,
  deployment: 16,
  archive: 11,
  communications: 7,
  observability: 6,
};

export function priorityMultiplier(priority: number): number {
  return 0.6 + priority * 0.1;
}
