import type { SectorId } from "@/data/types";

/** How a sector reads on the continuity timeline */
export type SectorActivityClass =
  | "dormant"
  | "transient_active"
  | "sustained_load"
  | "structurally_active";

export interface SectorTemporalState {
  sectorId: SectorId;
  activityClass: SectorActivityClass;
  /** Recent window — spikes, not yet accumulated */
  transientPressure: number;
  /** Rolling window with decay — ongoing operational gravity */
  sustainedPressure: number;
  /** Decay-weighted integral of all retained signals */
  historicalPressure: number;
  /** Rolling momentum (recent vs prior window) */
  momentum: number;
  /** Scan-derived structural presence (projects, corpus) */
  structuralBaseline: number;
  /** Blended pressure for environmental projection */
  environmentalPressure: number;
}

export interface TemporalContinuityModel {
  referenceTime: string;
  sectors: Record<SectorId, SectorTemporalState>;
  environmentalPressure: Record<SectorId, number>;
  historicalPressure: Record<SectorId, number>;
  sectorMomentum: Record<SectorId, number>;
  sectorActivityClass: Record<SectorId, SectorActivityClass>;
  dormantSectors: SectorId[];
  structurallyActiveSectors: SectorId[];
}
