"use client";

import { useLayoutEffect, useState } from "react";

export type PanelLayout = "sheet" | "side";

/** Portrait/narrow viewports use bottom sheet; md+ uses right rail. */
export function getPanelLayout(): PanelLayout {
  if (typeof window === "undefined") return "side";
  return window.matchMedia("(max-width: 767px)").matches ? "sheet" : "side";
}

/**
 * Layout mode for the detail panel. When a panel is open, the value is locked
 * for that session so rotation does not leave a stale transform axis mid-flight.
 */
export function usePanelLayout(panelOpen: boolean): PanelLayout {
  const [layout, setLayout] = useState<PanelLayout>(() => getPanelLayout());

  useLayoutEffect(() => {
    if (!panelOpen) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setLayout(getPanelLayout());
    });
    return () => {
      cancelled = true;
    };
  }, [panelOpen]);

  return layout;
}
