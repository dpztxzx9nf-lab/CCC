"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {
  DEFAULT_CCC_SURFACE,
  SURFACE_INDEX,
  surfaceAfterSwipeLeft,
  surfaceAfterSwipeRight,
  surfaceOnArrowLeft,
  surfaceOnArrowRight,
  type CccSurface,
} from "@/lib/navigation/surfaces";
import { SurfaceNavigationProvider } from "@/context/SurfaceNavigationContext";
import { PanelRouter } from "./PanelRouter";

const EDGE_ZONE_PX = 30;
const DRAG_SLOP_PX = 4;
const AXIS_LOCK_RATIO = 1.35;
const COMMIT_DISTANCE_RATIO = 0.28;
const COMMIT_VELOCITY_PX_MS = 0.35;

type EdgeOrigin = "left" | "right";

interface EdgePanSession {
  edge: EdgeOrigin;
  pointerId: number;
  startX: number;
  startY: number;
  lastX: number;
  lastTime: number;
  lockTime: number;
  locked: boolean;
}

interface GestureNavigationShellProps {
  projects: ReactNode;
  facility: ReactNode;
  opsPortal: ReactNode;
  initialSurface?: CccSurface;
}

function edgeAtPointerStart(clientX: number, viewportWidth: number): EdgeOrigin | null {
  if (clientX <= EDGE_ZONE_PX) return "left";
  if (clientX >= viewportWidth - EDGE_ZONE_PX) return "right";
  return null;
}

function peekSurfaceDuringDrag(
  edge: EdgeOrigin,
  surface: CccSurface,
): CccSurface | null {
  return edge === "left"
    ? surfaceAfterSwipeRight(surface)
    : surfaceAfterSwipeLeft(surface);
}

function baseTranslateForSurface(surface: CccSurface, viewportWidth: number): number {
  return -SURFACE_INDEX[surface] * viewportWidth;
}

function clampDragOffset(
  edge: EdgeOrigin,
  dx: number,
  viewportWidth: number,
  surface: CccSurface,
): number {
  if (edge === "right") {
    if (!surfaceAfterSwipeLeft(surface)) return 0;
    return Math.min(0, Math.max(-viewportWidth, dx));
  }
  if (!surfaceAfterSwipeRight(surface)) return 0;
  return Math.max(0, Math.min(viewportWidth, dx));
}

function targetSurfaceOnCommit(
  edge: EdgeOrigin,
  offsetPx: number,
  velocityPxMs: number,
  viewportWidth: number,
  surface: CccSurface,
): CccSurface | null {
  const distance = Math.abs(offsetPx);
  const speed = Math.abs(velocityPxMs);
  const shouldCommit =
    distance >= viewportWidth * COMMIT_DISTANCE_RATIO ||
    speed >= COMMIT_VELOCITY_PX_MS;

  if (!shouldCommit) return null;

  if (edge === "right" && offsetPx < 0) {
    return surfaceAfterSwipeLeft(surface);
  }
  if (edge === "left" && offsetPx > 0) {
    return surfaceAfterSwipeRight(surface);
  }
  return null;
}

export function GestureNavigationShell({
  projects,
  facility,
  opsPortal,
  initialSurface = DEFAULT_CCC_SURFACE,
}: GestureNavigationShellProps) {
  const [surface, setSurface] = useState<CccSurface>(initialSurface);
  const [translatePx, setTranslatePx] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [edgeSessionActive, setEdgeSessionActive] = useState(false);
  const [dragPeekSurface, setDragPeekSurface] = useState<CccSurface | null>(
    null,
  );
  const [pendingSurface, setPendingSurface] = useState<CccSurface | null>(
    null,
  );

  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<EdgePanSession | null>(null);
  const surfaceRef = useRef(surface);
  const suppressClickRef = useRef(false);
  const prefersReducedMotionRef = useRef(false);

  surfaceRef.current = surface;

  const applyTrackTranslate = useCallback((px: number, syncState: boolean) => {
    const track = trackRef.current;
    if (track) {
      track.style.transform = `translate3d(${px}px, 0, 0)`;
    }
    if (syncState) {
      setTranslatePx(px);
    }
  }, []);

  const getViewportWidth = useCallback(() => {
    return viewportRef.current?.clientWidth ?? window.innerWidth;
  }, []);

  const snapToSurface = useCallback(
    (target: CccSurface, animate: boolean) => {
      const width = getViewportWidth();
      const nextTranslate = baseTranslateForSurface(target, width);

      setPendingSurface(null);

      if (!animate || prefersReducedMotionRef.current) {
        setIsAnimating(false);
        setIsDragging(false);
        setDragPeekSurface(null);
        setSurface(target);
        applyTrackTranslate(nextTranslate, true);
        return;
      }

      setPendingSurface(target);
      setIsAnimating(true);
      applyTrackTranslate(nextTranslate, true);
    },
    [applyTrackTranslate, getViewportWidth],
  );

  useLayoutEffect(() => {
    prefersReducedMotionRef.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    applyTrackTranslate(
      baseTranslateForSurface(initialSurface, getViewportWidth()),
      true,
    );
  }, [applyTrackTranslate, getViewportWidth, initialSurface]);

  useEffect(() => {
    if (isDragging || isAnimating) return;
    applyTrackTranslate(
      baseTranslateForSurface(surface, getViewportWidth()),
      true,
    );
  }, [surface, isDragging, isAnimating, getViewportWidth, applyTrackTranslate]);

  useEffect(() => {
    function onResize() {
      if (sessionRef.current || isDragging || isAnimating) return;
      applyTrackTranslate(
        baseTranslateForSurface(surfaceRef.current, getViewportWidth()),
        true,
      );
    }

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [isDragging, isAnimating, getViewportWidth, applyTrackTranslate]);

  const endSession = useCallback(() => {
    sessionRef.current = null;
    setEdgeSessionActive(false);
    setIsDragging(false);
    setDragPeekSurface(null);
  }, []);

  const onTrackTransitionEnd = useCallback(
    (e: React.TransitionEvent<HTMLDivElement>) => {
      if (e.target !== trackRef.current || e.propertyName !== "transform") return;
      setIsAnimating(false);
      const resolved = pendingSurface ?? surfaceRef.current;
      if (pendingSurface) {
        setPendingSurface(null);
        setSurface(pendingSurface);
      }
      applyTrackTranslate(
        baseTranslateForSurface(resolved, getViewportWidth()),
        true,
      );
    },
    [applyTrackTranslate, getViewportWidth, pendingSurface],
  );

  const finishPan = useCallback(
    (edge: EdgeOrigin, offsetPx: number, velocityPxMs: number) => {
      const current = surfaceRef.current;
      const width = getViewportWidth();
      const base = baseTranslateForSurface(current, width);
      const committed = targetSurfaceOnCommit(
        edge,
        offsetPx,
        velocityPxMs,
        width,
        current,
      );

      if (committed) {
        suppressClickRef.current = true;
        snapToSurface(committed, true);
        return;
      }

      setIsAnimating(true);
      applyTrackTranslate(base, true);
    },
    [applyTrackTranslate, getViewportWidth, snapToSurface],
  );

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || isAnimating) return;

    const viewportWidth = getViewportWidth();
    const edge = edgeAtPointerStart(e.clientX, viewportWidth);
    if (!edge) {
      sessionRef.current = null;
      setEdgeSessionActive(false);
      return;
    }

    if (edge === "right" && !surfaceAfterSwipeLeft(surfaceRef.current)) return;
    if (edge === "left" && !surfaceAfterSwipeRight(surfaceRef.current)) return;

    setEdgeSessionActive(true);
    sessionRef.current = {
      edge,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastTime: performance.now(),
      lockTime: 0,
      locked: false,
    };
    suppressClickRef.current = false;
  }, [getViewportWidth, isAnimating]);

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const session = sessionRef.current;
      if (!session || e.pointerId !== session.pointerId) return;

      const dx = e.clientX - session.startX;
      const dy = e.clientY - session.startY;

      if (!session.locked) {
        if (Math.abs(dx) < DRAG_SLOP_PX && Math.abs(dy) < DRAG_SLOP_PX) return;

        if (Math.abs(dy) > Math.abs(dx) * AXIS_LOCK_RATIO) {
          endSession();
          return;
        }

        const now = performance.now();
        session.locked = true;
        session.lockTime = now;
        session.lastTime = now;
        e.currentTarget.setPointerCapture(e.pointerId);
        setIsDragging(true);
        setDragPeekSurface(
          peekSurfaceDuringDrag(session.edge, surfaceRef.current),
        );
      }

      if (!session.locked) return;

      const width = getViewportWidth();
      const offset = clampDragOffset(session.edge, dx, width, surfaceRef.current);
      const base = baseTranslateForSurface(surfaceRef.current, width);
      applyTrackTranslate(base + offset, false);

      session.lastX = e.clientX;
      session.lastTime = performance.now();
    },
    [applyTrackTranslate, endSession, getViewportWidth],
  );

  const onPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const session = sessionRef.current;
      if (!session || e.pointerId !== session.pointerId) {
        endSession();
        return;
      }

      if (session.locked) {
        e.currentTarget.releasePointerCapture(e.pointerId);
        const now = performance.now();
        const dx = e.clientX - session.startX;
        const lockDuration = Math.max(now - session.lockTime, 1);
        const velocityPxMs = dx / lockDuration;
        const offset = clampDragOffset(
          session.edge,
          dx,
          getViewportWidth(),
          surfaceRef.current,
        );
        finishPan(session.edge, offset, velocityPxMs);
      }

      endSession();
    },
    [endSession, finishPan, getViewportWidth],
  );

  const onPointerCancel = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const session = sessionRef.current;
      if (!session || e.pointerId !== session.pointerId) return;

      if (session.locked) {
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          /* already released */
        }
        const base = baseTranslateForSurface(
          surfaceRef.current,
          getViewportWidth(),
        );
        setIsAnimating(true);
        applyTrackTranslate(base, true);
      }

      endSession();
    },
    [applyTrackTranslate, endSession, getViewportWidth],
  );

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
        snapToSurface("facility", !prefersReducedMotionRef.current);
        return;
      }

      if (e.key === "ArrowRight") {
        const next = surfaceOnArrowRight(surfaceRef.current);
        if (next) {
          e.preventDefault();
          snapToSurface(next, !prefersReducedMotionRef.current);
        }
        return;
      }

      if (e.key === "ArrowLeft") {
        const next = surfaceOnArrowLeft(surfaceRef.current);
        if (next) {
          e.preventDefault();
          snapToSurface(next, !prefersReducedMotionRef.current);
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [snapToSurface]);

  const panelIsActive = (panel: CccSurface) =>
    surface === panel ||
    dragPeekSurface === panel ||
    pendingSurface === panel;

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
            className={`ccc-surface-viewport min-h-0 flex-1 ${
              edgeSessionActive || isDragging ? "touch-none" : "touch-pan-y"
            }`}
            data-edge-pan-active={
              edgeSessionActive || isDragging ? "true" : undefined
            }
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
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
            <div
              ref={trackRef}
              className="ccc-surface-track"
              data-surface={surface}
              data-measured={translatePx != null ? "true" : undefined}
              data-dragging={isDragging ? "true" : undefined}
              data-animating={isAnimating ? "true" : undefined}
              onTransitionEnd={onTrackTransitionEnd}
            >
              <div
                className="ccc-surface-panel ccc-surface-panel--projects"
                aria-hidden={!panelIsActive("projects")}
                inert={!panelIsActive("projects")}
              >
                {projects}
              </div>
              <div
                className="ccc-surface-panel ccc-surface-panel--facility"
                aria-hidden={!panelIsActive("facility")}
                inert={!panelIsActive("facility")}
              >
                {facility}
              </div>
              <div
                className="ccc-surface-panel ccc-surface-panel--ops"
                aria-hidden={!panelIsActive("ops")}
                inert={!panelIsActive("ops")}
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
