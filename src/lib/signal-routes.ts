import type { InhabitantBehavior } from "@/data/inhabitant-types";
import type { OperationalSnapshot } from "@/data/operational-types";
import type { Operator, SectorId } from "@/data/types";
import { getFacilityPulse } from "@/lib/chamber-atmosphere";
import type { SectorOccupant } from "@/lib/operator-placement";

export type SignalIntensity = "low" | "medium" | "high";

export interface SignalRouteSpec {
  id: string;
  from: SectorId;
  to: SectorId;
  intensity: SignalIntensity;
}

/** Normalized anchor (0–100) within megastructure grid for route SVG. */
export const SECTOR_ANCHOR: Record<SectorId, { x: number; y: number }> = {
  relay: { x: 11, y: 36 },
  core: { x: 42, y: 20 },
  observatory: { x: 89, y: 20 },
  forge: { x: 42, y: 44 },
  archive: { x: 22, y: 80 },
  runtime: { x: 74, y: 80 },
};

export function deriveSignalRoutes(
  occupantsBySector: Partial<Record<SectorId, SectorOccupant[]>>,
  operational: OperationalSnapshot | null,
): SignalRouteSpec[] {
  const routes: SignalRouteSpec[] = [];
  const seen = new Set<string>();

  const add = (from: SectorId, to: SectorId, intensity: SignalIntensity) => {
    if (from === to) return;
    const id = `${from}-${to}`;
    if (seen.has(id)) return;
    seen.add(id);
    routes.push({ id, from, to, intensity });
  };

  for (const [sectorId, occupants] of Object.entries(occupantsBySector) as [
    SectorId,
    SectorOccupant[],
  ][]) {
    for (const { behavior } of occupants ?? []) {
      if (behavior.transitFrom) {
        add(
          behavior.transitFrom,
          sectorId,
          behavior.intensity === "elevated" ? "high" : "medium",
        );
      }
    }
  }

  const heat = operational?.sectorHeat ?? [];
  const pulse = getFacilityPulse(heat);

  if (pulse.focusSector) {
    for (const hot of pulse.hotSectors) {
      if (hot !== pulse.focusSector) {
        add("core", hot as SectorId, "medium");
      }
    }
    if (pulse.focusSector !== "core" && pulse.hotSectors.length > 0) {
      add("core", pulse.focusSector as SectorId, "high");
    }
  }

  const archiveHeat = heat.find((h) => h.sectorId === "archive")?.activityScore ?? 0;
  const forgeHeat = heat.find((h) => h.sectorId === "forge")?.activityScore ?? 0;
  if (archiveHeat >= 28 && forgeHeat >= 18) {
    add("archive", "forge", "low");
  }

  const relayHeat = heat.find((h) => h.sectorId === "relay")?.activityScore ?? 0;
  if (relayHeat >= 24) {
    add("relay", "core", "low");
  }

  return routes.slice(0, 6);
}

export function collectActivePackets(
  occupantsBySector: Partial<Record<SectorId, SectorOccupant[]>>,
  operational: OperationalSnapshot | null,
  derivePacket: (
    operator: Operator,
    behavior: InhabitantBehavior,
    sectorId: SectorId,
  ) => string | null,
): { sectorId: SectorId; operatorId: string; text: string }[] {
  const packets: { sectorId: SectorId; operatorId: string; text: string }[] = [];

  for (const [sectorId, occupants] of Object.entries(occupantsBySector) as [
    SectorId,
    SectorOccupant[],
  ][]) {
    for (const { operator, behavior } of occupants ?? []) {
      const text = derivePacket(operator, behavior, sectorId);
      if (text) {
        packets.push({ sectorId, operatorId: operator.id, text });
      }
    }
  }

  return packets.slice(0, 5);
}
