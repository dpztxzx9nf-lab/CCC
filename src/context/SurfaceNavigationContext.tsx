"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import {
  DEFAULT_CCC_SURFACE,
  type CccSurface,
} from "@/lib/navigation/surfaces";

interface SurfaceNavigationContextValue {
  surface: CccSurface;
  setSurface: (surface: CccSurface) => void;
  goToOperations: () => void;
  goToFacility: () => void;
  goToProjects: () => void;
  goToOps: () => void;
}

const SurfaceNavigationContext =
  createContext<SurfaceNavigationContextValue | null>(null);

export function SurfaceNavigationProvider({
  surface,
  setSurface,
  children,
}: {
  surface: CccSurface;
  setSurface: (surface: CccSurface) => void;
  children: ReactNode;
}) {
  const goToOperations = useCallback(() => setSurface("operations"), [setSurface]);
  const goToFacility = useCallback(() => setSurface("facility"), [setSurface]);
  const goToProjects = useCallback(() => setSurface("projects"), [setSurface]);
  const goToOps = useCallback(() => setSurface("ops"), [setSurface]);

  const value = useMemo(
    () => ({
      surface,
      setSurface,
      goToOperations,
      goToFacility,
      goToProjects,
      goToOps,
    }),
    [surface, setSurface, goToOperations, goToFacility, goToProjects, goToOps],
  );

  return (
    <SurfaceNavigationContext.Provider value={value}>
      {children}
    </SurfaceNavigationContext.Provider>
  );
}

export function useSurfaceNavigation(): SurfaceNavigationContextValue {
  const ctx = useContext(SurfaceNavigationContext);
  if (!ctx) {
    return {
      surface: DEFAULT_CCC_SURFACE,
      setSurface: () => {},
      goToOperations: () => {},
      goToFacility: () => {},
      goToProjects: () => {},
      goToOps: () => {},
    };
  }
  return ctx;
}
