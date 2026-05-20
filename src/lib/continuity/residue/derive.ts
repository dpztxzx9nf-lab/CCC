import type { ContinuityEventView } from "@/lib/continuity/events/types";
import type { OperationalSnapshot } from "@/data/operational-types";
import type { SectorId } from "@/data/types";
import { ALL_SECTOR_IDS } from "@/lib/operations/taxonomy";
import type { SignalRouteSpec } from "@/lib/signal-routes";
import { buildSectorMemory } from "./sector-memory";
import { buildTransitMemory } from "./transit-memory";
import type { FacilityResidue, SectorResidueMemory } from "./types";

function emptySectorResidue(sectorId: SectorId): SectorResidueMemory {
  return {
    sectorId,
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
}

export function computeFacilityResidue(
  events: ContinuityEventView[],
  operational: OperationalSnapshot | null,
  liveRoutes: SignalRouteSpec[] = [],
): FacilityResidue {
  const heatBySector = new Map<SectorId, NonNullable<OperationalSnapshot>["sectorHeat"][number]>();
  for (const h of operational?.sectorHeat ?? []) {
    heatBySector.set(h.sectorId, h);
  }

  const sectors =
    events.length > 0 || operational?.enabled
      ? buildSectorMemory(events, heatBySector)
      : Object.fromEntries(
          ALL_SECTOR_IDS.map((id) => [id, emptySectorResidue(id)]),
        ) as Record<SectorId, SectorResidueMemory>;

  const transitRoutes = buildTransitMemory(events, liveRoutes);

  return { sectors, transitRoutes };
}
