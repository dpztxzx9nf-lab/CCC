/** Exponential half-life for signal decay (hours) — gravity fades, not instant cut-off */
export const SIGNAL_DECAY_HALF_LIFE_HOURS = 72;

/** Ignore signals older than this for accumulation */
export const HISTORICAL_RETENTION_HOURS = 720;

/** Rolling windows (hours) */
export const TRANSIENT_WINDOW_HOURS = 24;
export const MOMENTUM_RECENT_HOURS = 24;
export const MOMENTUM_PRIOR_HOURS = 72;
export const SUSTAINED_WINDOW_HOURS = 168;

/** Sustained load: decay-weighted pressure over 7d must exceed this */
export const SUSTAINED_PRESSURE_THRESHOLD = 1.15;

/** Transient spike: recent window pressure dominates sustained */
export const TRANSIENT_DOMINANCE_RATIO = 0.75;

/** Structural baseline from scan (activity score scale) */
export const STRUCTURAL_BASELINE_THRESHOLD = 14;

/** Dormant: all pressures below these */
export const DORMANT_PRESSURE_MAX = 0.35;
export const DORMANT_TRANSIENT_MAX = 0.22;
export const DORMANT_STRUCTURAL_MAX = 10;

/** Environmental blend weights */
export const BLEND_HISTORICAL = 0.42;
export const BLEND_SUSTAINED = 0.34;
export const BLEND_TRANSIENT = 0.24;

/** Operator sector preference: favor sustained gravity over newest spike */
export const OP_WEIGHT_SUSTAINED = 1.45;
export const OP_WEIGHT_MOMENTUM = 0.95;
export const OP_WEIGHT_HISTORICAL = 0.55;
export const OP_WEIGHT_TRANSIENT = 0.32;
