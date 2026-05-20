import type { OperationalSignal, OperationalSignalSeverity } from "../types";
import { decayAtAge, ageHoursFromTimestamp } from "./decay";
import {
  SIGNAL_DECAY_HALF_LIFE_HOURS,
  TRANSIENT_WINDOW_HOURS,
  SUSTAINED_WINDOW_HOURS,
} from "./constants";

function severityBase(s: OperationalSignalSeverity): number {
  if (s === "high") return 3;
  if (s === "medium") return 1.5;
  if (s === "low") return 0.45;
  return 0.25;
}

/** Instantaneous weight at reference time (decayed, not step-function) */
export function weightedSignalContribution(
  signal: OperationalSignal,
  referenceMs: number,
  halfLifeHours: number = SIGNAL_DECAY_HALF_LIFE_HOURS,
): number {
  const age = ageHoursFromTimestamp(signal.timestamp, referenceMs);
  return severityBase(signal.severity) * decayAtAge(age, halfLifeHours);
}

/** Pressure inside a time window with decay applied per signal */
export function windowPressure(
  contributions: { ageHours: number; base: number }[],
  windowHours: number,
  halfLifeHours: number = SIGNAL_DECAY_HALF_LIFE_HOURS,
): number {
  let sum = 0;
  for (const { ageHours, base } of contributions) {
    if (ageHours > windowHours) continue;
    sum += base * decayAtAge(ageHours, halfLifeHours);
  }
  return sum;
}

export function signalBaseWeight(
  signal: OperationalSignal,
  referenceMs: number,
): number {
  return severityBase(signal.severity) * decayAtAge(
    ageHoursFromTimestamp(signal.timestamp, referenceMs),
    SIGNAL_DECAY_HALF_LIFE_HOURS,
  );
}

export function isInTransientWindow(
  signal: OperationalSignal,
  referenceMs: number,
): boolean {
  return (
    ageHoursFromTimestamp(signal.timestamp, referenceMs) <= TRANSIENT_WINDOW_HOURS
  );
}

export function isInSustainedWindow(
  signal: OperationalSignal,
  referenceMs: number,
): boolean {
  return (
    ageHoursFromTimestamp(signal.timestamp, referenceMs) <= SUSTAINED_WINDOW_HOURS
  );
}
