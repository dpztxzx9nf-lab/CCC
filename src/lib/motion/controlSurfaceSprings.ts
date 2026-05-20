/** Shared springs for CCC gesture surfaces (panels, ops sheets). */

export const CONTROL_SURFACE_SPRING_IN = {
  type: "spring" as const,
  stiffness: 380,
  damping: 38,
  mass: 0.88,
};

export const CONTROL_SURFACE_SPRING_SNAP = {
  type: "spring" as const,
  stiffness: 520,
  damping: 44,
  mass: 0.82,
};

export const CONTROL_SURFACE_SPRING_SETTLE = {
  type: "spring" as const,
  stiffness: 640,
  damping: 48,
  mass: 0.78,
};
