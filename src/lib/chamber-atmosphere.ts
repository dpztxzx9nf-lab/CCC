import type { SectorHeatView } from "@/data/operational-types";

export type ChamberActivity = "idle" | "low" | "medium" | "high";

export function getChamberActivity(heat?: SectorHeatView): ChamberActivity {
  if (!heat || heat.activityScore <= 4) return "idle";
  if (heat.activityLevel === "high" || heat.activityScore >= 52) return "high";
  if (heat.activityLevel === "medium" || heat.activityScore >= 20) return "medium";
  return "low";
}
