import type { SectorHeatView } from "@/data/operational-types";

export type ChamberActivity = "idle" | "low" | "medium" | "high";

export function getChamberActivity(heat?: SectorHeatView): ChamberActivity {
  if (!heat || heat.activityScore <= 4) return "idle";
  if (heat.activityLevel === "high" || heat.activityScore >= 52) return "high";
  if (heat.activityLevel === "medium" || heat.activityScore >= 20) return "medium";
  return "low";
}

export function getFacilityPulse(heatList: SectorHeatView[]): {
  hotSectors: string[];
  calmCount: number;
  focusSector: string | null;
} {
  if (heatList.length === 0) {
    return { hotSectors: [], calmCount: 0, focusSector: null };
  }

  const sorted = [...heatList].sort((a, b) => b.activityScore - a.activityScore);
  const hotSectors = sorted
    .filter((h) => h.activityLevel === "high" || h.activityScore >= 40)
    .map((h) => h.sectorId);
  const calmCount = heatList.filter((h) => getChamberActivity(h) === "idle").length;
  const focus = sorted[0];
  const focusSector =
    focus && focus.activityScore > 8 ? focus.sectorId : null;

  return { hotSectors, calmCount, focusSector };
}
