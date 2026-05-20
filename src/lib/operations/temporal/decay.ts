import { HISTORICAL_RETENTION_HOURS, SIGNAL_DECAY_HALF_LIFE_HOURS } from "./constants";

/**
 * Exponential decay curve — contribution at ageHours given half-life.
 * At t=0 → 1; at t=halfLife → 0.5; never hard-zero until retention cap.
 */
export function decayAtAge(
  ageHours: number,
  halfLifeHours: number = SIGNAL_DECAY_HALF_LIFE_HOURS,
): number {
  if (ageHours < 0 || !Number.isFinite(ageHours)) return 0;
  if (halfLifeHours <= 0) return 0;
  if (ageHours > HISTORICAL_RETENTION_HOURS) return 0;
  return Math.exp((-Math.LN2 * ageHours) / halfLifeHours);
}

export function ageHoursFromTimestamp(
  timestamp: string,
  referenceMs: number,
): number {
  const t = Date.parse(timestamp);
  if (Number.isNaN(t)) return HISTORICAL_RETENTION_HOURS + 1;
  return Math.max(0, (referenceMs - t) / (1000 * 60 * 60));
}
