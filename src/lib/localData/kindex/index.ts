export {
  deriveKindexOperationalSignals,
  KINDEX_SIGNAL_SOURCE,
} from "./signals";
export { evaluateKindexSemanticRules } from "./semantic";
export { resolveKindexScope } from "./resolve";
export { observeKindexFilesystem, aggregateKindexScope } from "./observe";
export type { KindexScope, KindexObservation, KindexAggregate } from "./types";
