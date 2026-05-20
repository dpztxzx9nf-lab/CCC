import type { SectorId } from "@/data/types";

/** Asymmetric megastructure grid placement — not a uniform card grid */
export const SECTOR_GRID_AREA: Record<SectorId, string> = {
  core: "core",
  relay: "relay",
  forge: "forge",
  observatory: "observatory",
  archive: "archive",
  runtime: "runtime",
};

export const SECTOR_ORDER: SectorId[] = [
  "core",
  "relay",
  "forge",
  "observatory",
  "archive",
  "runtime",
];
