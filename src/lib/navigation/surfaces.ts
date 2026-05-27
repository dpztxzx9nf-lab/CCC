export const CCC_SURFACES = ["projects", "operations", "facility", "ops"] as const;

export type CccSurface = (typeof CCC_SURFACES)[number];

export const DEFAULT_CCC_SURFACE: CccSurface = "operations";

export const SURFACE_INDEX: Record<CccSurface, number> = {
  projects: 0,
  operations: 1,
  facility: 2,
  ops: 3,
};

export const SURFACE_LABELS: Record<CccSurface, string> = {
  projects: "Projects",
  operations: "Operations",
  facility: "Facility",
  ops: "Ops",
};

export function surfaceFromIndex(index: number): CccSurface {
  return (
    CCC_SURFACES[Math.max(0, Math.min(CCC_SURFACES.length - 1, index))] ??
    DEFAULT_CCC_SURFACE
  );
}

/** Drag inward from right edge (finger moves left) → reveal surface to the right */
export function surfaceAfterSwipeLeft(surface: CccSurface): CccSurface | null {
  if (surface === "projects") return "operations";
  if (surface === "operations") return "facility";
  if (surface === "facility") return "ops";
  return null;
}

/** Drag inward from left edge (finger moves right) → reveal surface to the left */
export function surfaceAfterSwipeRight(surface: CccSurface): CccSurface | null {
  if (surface === "ops") return "facility";
  if (surface === "facility") return "operations";
  if (surface === "operations") return "projects";
  return null;
}

/** Keyboard ArrowRight → move toward Ops */
export function surfaceOnArrowRight(surface: CccSurface): CccSurface | null {
  return surfaceAfterSwipeLeft(surface);
}

/** Keyboard ArrowLeft → move toward Projects */
export function surfaceOnArrowLeft(surface: CccSurface): CccSurface | null {
  return surfaceAfterSwipeRight(surface);
}

export function parseSurfaceParam(value: string | null | undefined): CccSurface | null {
  if (
    value === "projects" ||
    value === "operations" ||
    value === "facility" ||
    value === "ops"
  ) {
    return value;
  }
  return null;
}
