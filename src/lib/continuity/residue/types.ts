import type { ContinuityEventKind } from "@/lib/continuity/events/types";
import type { SectorId } from "@/data/types";

/** Quantized 0–4 for CSS data attributes (faint → pronounced) */
export type ResidueTier = 0 | 1 | 2 | 3 | 4;

export interface SectorResidueMemory {
  sectorId: SectorId;
  /** Scar / afterglow from important events */
  glow: ResidueTier;
  /** Layered atmosphere (archive strata, observatory depth) */
  density: ResidueTier;
  /** Sustained operational load */
  pressure: ResidueTier;
  /** Saturation / tint shift from repeated activity */
  saturation: ResidueTier;
  /** Forge deploy warmth */
  warmth: ResidueTier;
  /** Runtime instability flicker */
  flicker: ResidueTier;
  /** Inactive cooling — sector darkens when quiet */
  coolness: ResidueTier;
  /** Pulse rhythm modifier tier */
  pulseCadence: ResidueTier;
  dominantKind: ContinuityEventKind | null;
  /** Raw 0–1 values for inline CSS variables where needed */
  raw: {
    glow: number;
    density: number;
    pressure: number;
    saturation: number;
    warmth: number;
    flicker: number;
    coolness: number;
    pulseCadence: number;
  };
}

export interface TransitRouteMemory {
  id: string;
  from: SectorId;
  to: SectorId;
  /** 0–1 worn-path persistence */
  wear: number;
  wearTier: ResidueTier;
}

export interface FacilityResidue {
  sectors: Record<SectorId, SectorResidueMemory>;
  transitRoutes: TransitRouteMemory[];
}
