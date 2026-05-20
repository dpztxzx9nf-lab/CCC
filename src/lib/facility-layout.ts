import type { ChamberId } from "@/data/ecology";
import { CHAMBER_GRID_AREA, CHAMBER_ORDER } from "@/data/ecology";

/** Asymmetric megastructure grid — keyed by physical chamber */
export const CHAMBER_GRID_AREA_EXPORT = CHAMBER_GRID_AREA;
export { CHAMBER_GRID_AREA, CHAMBER_ORDER };

/** @deprecated use CHAMBER_GRID_AREA */
export const SECTOR_GRID_AREA = CHAMBER_GRID_AREA as Record<string, string>;

/** @deprecated use CHAMBER_ORDER */
export const SECTOR_ORDER = CHAMBER_ORDER as unknown as import("@/data/types").SectorId[];

export type { ChamberId };
