import type { EventImportance } from "@/lib/continuity/events/types";
import { eventAgeHours } from "@/lib/continuity/events/influence";

/** Half-life in hours — major events linger longer */
const HALF_LIFE_HOURS: Record<EventImportance, number> = {
  low: 14,
  medium: 40,
  high: 96,
  critical: 168,
};

/** Exponential decay: 1 at t=0, ~0.5 at half-life */
export function decayedIntensity(
  occurredAt: string,
  importance: EventImportance,
  weight = 1,
): number {
  const age = eventAgeHours(occurredAt);
  if (!Number.isFinite(age) || age < 0) return 0;
  const halfLife = HALF_LIFE_HOURS[importance];
  const base = weight * Math.exp((-age * Math.LN2) / halfLife);
  return Math.max(0, Math.min(1, base));
}

export function toResidueTier(value: number): 0 | 1 | 2 | 3 | 4 {
  if (value <= 0.04) return 0;
  if (value <= 0.22) return 1;
  if (value <= 0.45) return 2;
  if (value <= 0.68) return 3;
  return 4;
}

export function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
