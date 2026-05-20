import {
  MOMENTUM_PRIOR_HOURS,
  MOMENTUM_RECENT_HOURS,
} from "./constants";

export interface TimedContribution {
  ageHours: number;
  base: number;
}

/**
 * Rolling momentum: recent-window pressure vs prior-window baseline.
 * Returns 0 when no prior activity (no fake spike).
 */
export function rollingSectorMomentum(
  contributions: TimedContribution[],
  halfLifeHours: number,
): number {
  let recent = 0;
  let prior = 0;

  for (const { ageHours, base } of contributions) {
    const decay =
      ageHours >= 0
        ? Math.exp((-Math.LN2 * ageHours) / halfLifeHours)
        : 0;
    const w = base * decay;
    if (ageHours <= MOMENTUM_RECENT_HOURS) {
      recent += w;
    } else if (
      ageHours > MOMENTUM_RECENT_HOURS &&
      ageHours <= MOMENTUM_RECENT_HOURS + MOMENTUM_PRIOR_HOURS
    ) {
      prior += w;
    }
  }

  if (recent <= 0) return 0;
  const baseline = Math.max(prior, 0.08);
  return recent / baseline;
}
