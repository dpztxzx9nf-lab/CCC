"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {
  DEFAULT_CCC_SURFACE,
  surfaceAfterSwipeLeft,
  surfaceAfterSwipeRight,
  surfaceOnArrowLeft,
  surfaceOnArrowRight,
  type CccSurface,
} from "@/lib/navigation/surfaces";
import { SurfaceNavigationProvider } from "@/context/SurfaceNavigationContext";
import { PanelRouter } from "./PanelRouter";

const EDGE_ZONE_PX = 30;
const EDGE_DRAG_THRESHOLD_PX = 56;
const EDGE_DRAG_DOMINANCE_RATIO = 1.35;

type EdgeOrigin = "left" | "right";

interface GestureNavigationShellProps {
  projects: ReactNode;
  facility: ReactNode;
  opsPortal: ReactNode;
  initialSurface?: CccSurface;
}

function edgeAtPointerStart(clientX: number): EdgeOrigin | null {
  if (clientX <= EDGE_ZONE_PX) return "left";
  if (clientX >= window.innerWidth - EDGE_ZONE_PX) return "right";
  return null;
}

export function GestureNavigationShell({
  projects,
  facility,
  opsPortal,
  initialSurface = DEFAULT_CCC_SURFACE,
}: GestureNavigationShellProps) {
  const [surface, setSurface] = useState<CccSurface>(initialSurface);
  const pointerStartRef = useRef<{
    x: number;
    y: number;
    edge: EdgeOrigin;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const viewportRef = useRef<HTMLDivElement>(null);

  const tryEdgeDrag = useCallback(
    (edge: EdgeOrigin, dx: number, dy: number) => {
      if (Math.abs(dx) < EDGE_DRAG_THRESHOLD_PX) return;
      if (Math.abs(dx) < Math.abs(dy) * EDGE_DRAG_DOMINANCE_RATIO) return;

      let next: CccSurface | null = null;
      if (edge === "left") {
        if (dx <= 0) return;
        next = surfaceAfterSwipeRight(surface);
      } else {
        if (dx >= 0) return;
        next = surfaceAfterSwipeLeft(surface);
      }

      if (next) {
        suppressClickRef.current = true;
        setSurface(next);
      }
    },
    [surface],
  );

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const edge = edgeAtPointerStart(e.clientX);
    if (!edge) {
      pointerStartRef.current = null;
      return;
    }
    pointerStartRef.current = { x: e.clientX, y: e.clientY, edge };
    suppressClickRef.current = false;
  }, []);

  const onPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const start = pointerStartRef.current;
      pointerStartRef.current = null;
      if (!start) return;

      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      tryEdgeDrag(start.edge, dx, dy);
    },
    [tryEdgeDrag],
  );

  const onPointerCancel = useCallback(() => {
    pointerStartRef.current = null;
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      ) {
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        setSurface("facility");
        return;
      }

      if (e.key === "ArrowRight") {
        const next = surfaceOnArrowRight(surface);
        if (next) {
          e.preventDefault();
          setSurface(next);
        }
        return;
      }

      if (e.key === "ArrowLeft") {
        const next = surfaceOnArrowLeft(surface);
        if (next) {
          e.preventDefault();
          setSurface(next);
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [surface]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    el.setAttribute("data-active-surface", surface);
  }, [surface]);

  return (
    <SurfaceNavigationProvider surface={surface} setSurface={setSurface}>
      <div
        className="ccc-command-shell ccc-surface-shell flex flex-col"
        data-active-surface={surface}
      >
        <div className="ccc-ambience" aria-hidden>
          <div className="ccc-grid" />
        </div>

        <div className="ccc-command-shell__stage relative z-10 flex min-h-0 flex-1 flex-col">
          <div
            ref={viewportRef}
            className="ccc-surface-viewport min-h-0 flex-1 touch-pan-y"
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            onClickCapture={(e) => {
              if (suppressClickRef.current) {
                suppressClickRef.current = false;
                e.preventDefault();
                e.stopPropagation();
              }
            }}
          >
            <div className="ccc-surface-track" data-surface={surface}>
              <div
                className="ccc-surface-panel ccc-surface-panel--projects"
                aria-hidden={surface !== "projects"}
                inert={surface !== "projects"}
              >
                {projects}
              </div>
              <div
                className="ccc-surface-panel ccc-surface-panel--facility"
                aria-hidden={surface !== "facility"}
                inert={surface !== "facility"}
              >
                {facility}
              </div>
              <div
                className="ccc-surface-panel ccc-surface-panel--ops"
                aria-hidden={surface !== "ops"}
                inert={surface !== "ops"}
              >
                {opsPortal}
              </div>
            </div>
          </div>

          <PanelRouter />
        </div>
      </div>
    </SurfaceNavigationProvider>
  );
}
