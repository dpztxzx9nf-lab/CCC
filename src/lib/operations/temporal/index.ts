export type {
  SectorActivityClass,
  SectorTemporalState,
  TemporalContinuityModel,
} from "./types";
export {
  SIGNAL_DECAY_HALF_LIFE_HOURS,
  HISTORICAL_RETENTION_HOURS,
  TRANSIENT_WINDOW_HOURS,
  SUSTAINED_WINDOW_HOURS,
} from "./constants";
export { decayAtAge, ageHoursFromTimestamp } from "./decay";
export {
  weightedSignalContribution,
  signalBaseWeight,
} from "./recency";
export { rollingSectorMomentum } from "./momentum";
export { classifySectorActivity } from "./classify";
export {
  accumulateSignalPressure,
  deriveTemporalContinuity,
} from "./accumulate";
