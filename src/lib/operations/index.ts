export { classifyProjectActivity, projectActivityScore } from "./classification";
export { createSignal } from "./signals/createSignal";
export {
  deriveGitOperationalSignals,
  deriveGitSignalsForRepo,
} from "./signals/gitSignals";
export {
  deriveTemporalContinuity,
  decayAtAge,
  type TemporalContinuityModel,
  type SectorActivityClass,
} from "./temporal";
export type {
  Sector,
  OperationalSignal,
  OperationalSignalSeverity,
  OperationalSignalType,
  GitOperationalSignalType,
} from "./types";
export type { ClassifiedSignal } from "./classification";
export { buildOperationalSnapshot } from "./operationalState";
export { mergeOperationalIntoCCCData } from "./merge";
export { PROJECT_PROFILES, getProjectProfile, getProfileByLocalSlug } from "./projectProfiles";
export type { ProjectProfile } from "./projectProfiles";
