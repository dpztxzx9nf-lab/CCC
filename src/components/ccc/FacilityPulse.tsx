"use client";

import { useCCC } from "@/context/CCCContext";
import { getFacilityPulse } from "@/lib/chamber-atmosphere";

const SECTOR_LABEL: Record<string, string> = {
  core: "Core",
  archive: "Archive",
  forge: "Forge",
  observatory: "Observatory",
  relay: "Relay",
  runtime: "Runtime",
};

export function FacilityPulse() {
  const { operational, data } = useCCC();
  const heat = operational?.sectorHeat ?? [];
  const pulse = getFacilityPulse(heat);
  const activeProjects =
    operational?.projects.filter((p) => p.activityScore > 0).length ??
    data.projects.filter((p) => p.status === "active").length;

  if (!operational?.enabled && heat.length === 0) return null;

  return (
    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ccc-muted">
      <span>
        <span className="text-ccc-accent">{activeProjects}</span> active project
        {activeProjects !== 1 ? "s" : ""}
      </span>
      {pulse.focusSector && (
        <span>
          Focus:{" "}
          <span className="font-medium text-ccc-text">
            {SECTOR_LABEL[pulse.focusSector] ?? pulse.focusSector}
          </span>
        </span>
      )}
      {pulse.hotSectors.length > 0 && (
        <span>
          Pressure:{" "}
          <span className="text-ccc-warn">
            {pulse.hotSectors.map((id) => SECTOR_LABEL[id] ?? id).join(", ")}
          </span>
        </span>
      )}
      {pulse.calmCount > 0 && (
        <span className="opacity-80">{pulse.calmCount} sectors calm</span>
      )}
    </p>
  );
}
