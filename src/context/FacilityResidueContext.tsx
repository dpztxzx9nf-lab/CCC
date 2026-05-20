"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { FacilityResidue } from "@/lib/continuity/residue";
import type { SectorId } from "@/data/types";
import { ALL_SECTOR_IDS } from "@/lib/operations/taxonomy";
import type { SectorResidueMemory } from "@/lib/continuity/residue";

const EMPTY_SECTOR: SectorResidueMemory = {
  sectorId: "core",
  glow: 0,
  density: 0,
  pressure: 0,
  saturation: 0,
  warmth: 0,
  flicker: 0,
  coolness: 0,
  pulseCadence: 0,
  dominantKind: null,
  raw: {
    glow: 0,
    density: 0,
    pressure: 0,
    saturation: 0,
    warmth: 0,
    flicker: 0,
    coolness: 0,
    pulseCadence: 0,
  },
};

const EMPTY: FacilityResidue = {
  sectors: Object.fromEntries(
    ALL_SECTOR_IDS.map((id) => [id, { ...EMPTY_SECTOR, sectorId: id }]),
  ) as FacilityResidue["sectors"],
  transitRoutes: [],
};

const FacilityResidueContext = createContext<FacilityResidue>(EMPTY);

export function FacilityResidueProvider({
  value,
  children,
}: {
  value: FacilityResidue;
  children: ReactNode;
}) {
  return (
    <FacilityResidueContext.Provider value={value}>
      {children}
    </FacilityResidueContext.Provider>
  );
}

export function useFacilityResidue(): FacilityResidue {
  return useContext(FacilityResidueContext);
}

export function useSectorResidue(sectorId: SectorId): SectorResidueMemory {
  const residue = useFacilityResidue();
  return residue.sectors[sectorId] ?? { ...EMPTY_SECTOR, sectorId };
}
