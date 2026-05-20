import type { OperationalDomainId } from "@/data/ecology";
import type { HumanOrientationId } from "./types";

export const HUMAN_ORIENTATIONS: { id: HumanOrientationId; label: string }[] = [
  { id: "idle", label: "Idle" },
  { id: "building", label: "Building" },
  { id: "researching", label: "Researching" },
  { id: "deploying", label: "Deploying" },
  { id: "writing", label: "Writing" },
  { id: "planning", label: "Planning" },
  { id: "maintenance", label: "Maintenance" },
  { id: "observing", label: "Observing" },
];

const ORIENTATION_DOMAIN_BIAS: Partial<
  Record<HumanOrientationId, Partial<Record<OperationalDomainId, number>>>
> = {
  idle: {},
  building: { forge: 3, runtime: 2 },
  researching: { archive: 2, observatory: 4 },
  deploying: { forge: 2, relay: 2, runtime: 3 },
  writing: { archive: 4 },
  planning: { core: 3 },
  maintenance: { forge: 2, observatory: 2 },
  observing: { observatory: 4, core: 1 },
};

/** Subtle additive emphasis on effective chamber activity (0–100 scale), not a replacement for continuity. */
export function orientationDomainScoreDelta(
  domainId: OperationalDomainId,
  orientationId: HumanOrientationId,
): number {
  return ORIENTATION_DOMAIN_BIAS[orientationId]?.[domainId] ?? 0;
}

export const HUMAN_ORIENTATION_STORAGE_KEY = "ccc-human-orientation-v1";
