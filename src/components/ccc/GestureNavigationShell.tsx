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
import { SurfaceIndicator } from "./SurfaceIndicator";

const EDGE_ZONE_PX = 30;
const DRAG_SLOP_PX = 8;
const AXIS_LOCK_RATIO = 1.35;
const COMMIT_DISTANCE_RATIO = 0.28;
const COMMIT_VELOCITY_PX_MS = 0.35;
const SNAP_TRANSITION_MS = 260;

type EdgeOrigin = "left" | "right";

interface EdgePanSession {
  edge: EdgeOrigin;
  peek: CccSurface;
  pointerId: number;
  startX: number;
  startY: number;
  lockTime: number;
  locked: boolean;
}

interface PanVisual {
  edge: EdgeOrigin;
  peek: CccSurface;
  translatePx: number;
  snapping: boolean;
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

function peekSurfaceForEdge(
  edge: EdgeOrigin,
  surface: CccSurface,
): CccSurface | null {
  return edge === "left"
    ? surfaceAfterSwipeRight(surface)
    : surfaceAfterSwipeLeft(surface);
}

function baseTranslateForEdge(edge: EdgeOrigin, viewportWidth: number): number {
  return edge === "left" ? -viewportWidth : 0;
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

function dragTranslate(
  edge: EdgeOrigin,
  offsetPx: number,
  viewportWidth: number,
): number {
  return baseTranslateForEdge(edge, viewportWidth) + offsetPx;
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
  const [panVisual, setPanVisual] = useState<PanVisual | null>(null);
  const [edgeSessionActive, setEdgeSessionActive] = useState(false);

  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<EdgePanSession | null>(null);
  const surfaceRef = useRef(surface);
  const panVisualRef = useRef(panVisual);
  const suppressClickRef = useRef(false);
  const prefersReducedMotionRef = useRef(false);
  const snapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  surfaceRef.current = surface;
  panVisualRef.current = panVisual;

  const getViewportWidth = useCallback(() => {
    return viewportRef.current?.clientWidth ?? window.innerWidth;
  }, []);

  const clearTrackInlineStyles = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    track.style.removeProperty("transform");
    track.style.removeProperty("transition");
  }, []);

  const resetPanState = useCallback(() => {
    if (snapTimerRef.current) {
      clearTimeout(snapTimerRef.current);
      snapTimerRef.current = null;
    }
    sessionRef.current = null;
    setEdgeSessionActive(false);
    setPanVisual(null);
    clearTrackInlineStyles();
  }, [clearTrackInlineStyles]);

  const navigateToSurface = useCallback(
    (target: CccSurface) => {
      resetPanState();
      setSurface(target);
    },
    [resetPanState],
  );

  const renderSurface = useCallback(
    (id: CccSurface) => {
      if (id === "projects") return projects;
      if (id === "facility") return facility;
      return opsPortal;
    },
    [projects, facility, opsPortal],
  );

  const finishSnapBack = useCallback(
    (edge: EdgeOrigin) => {
      if (!panVisualRef.current) {
        resetPanState();
        return;
      }

      const width = getViewportWidth();
      const resting = baseTranslateForEdge(edge, width);

      if (prefersReducedMotionRef.current) {
        resetPanState();
        return;
      }

      setPanVisual((prev) => {
        if (!prev) return null;
        return { ...prev, translatePx: resting, snapping: true };
      });

      if (snapTimerRef.current) clearTimeout(snapTimerRef.current);
      snapTimerRef.current = setTimeout(() => {
        snapTimerRef.current = null;
        resetPanState();
      }, SNAP_TRANSITION_MS);
    },
    [getViewportWidth, resetPanState],
  );

  useEffect(() => {
    prefersReducedMotionRef.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    return () => {
      if (snapTimerRef.current) clearTimeout(snapTimerRef.current);
    };
  }, []);

  const onTrackTransitionEnd = useCallback(
    (e: React.TransitionEvent<HTMLDivElement>) => {
      if (e.target !== trackRef.current || e.propertyName !== "transform") return;
      if (!panVisualRef.current?.snapping) return;
      if (snapTimerRef.current) {
        clearTimeout(snapTimerRef.current);
        snapTimerRef.current = null;
      }
      resetPanState();
    },
    [resetPanState],
  );

  const finishPan = useCallback(
    (edge: EdgeOrigin, offsetPx: number, velocityPxMs: number) => {
      const current = surfaceRef.current;
      const width = getViewportWidth();
      const committed = targetSurfaceOnCommit(
        edge,
        offsetPx,
        velocityPxMs,
        width,
        current,
      );

      if (committed) {
        suppressClickRef.current = true;
        navigateToSurface(committed);
        return;
      }

      finishSnapBack(edge);
    },
    [finishSnapBack, getViewportWidth, navigateToSurface],
  );

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.button !== 0 || panVisualRef.current) return;

      const viewportWidth = getViewportWidth();
      const edge = edgeAtPointerStart(e.clientX, viewportWidth);
      if (!edge) {
        sessionRef.current = null;
        setEdgeSessionActive(false);
        return;
      }

      const peek = peekSurfaceForEdge(edge, surfaceRef.current);
      if (!peek) return;

      setEdgeSessionActive(true);
      sessionRef.current = {
        edge,
        peek,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        lockTime: 0,
        locked: false,
      };
      suppressClickRef.current = false;
    },
    [getViewportWidth],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const session = sessionRef.current;
      if (!session || e.pointerId !== session.pointerId) return;

      const dx = e.clientX - session.startX;
      const dy = e.clientY - session.startY;

      if (!session.locked) {
        if (Math.abs(dx) < DRAG_SLOP_PX && Math.abs(dy) < DRAG_SLOP_PX) return;

        if (Math.abs(dy) > Math.abs(dx) * AXIS_LOCK_RATIO) {
          resetPanState();
          return;
        }

        session.locked = true;
        session.lockTime = performance.now();
        e.currentTarget.setPointerCapture(e.pointerId);

        const width = getViewportWidth();
        setPanVisual({
          edge: session.edge,
          peek: session.peek,
          translatePx: baseTranslateForEdge(session.edge, width),
          snapping: false,
        });
      }

      const width = getViewportWidth();
      const offset = clampDragOffset(
        session.edge,
        dx,
        width,
        surfaceRef.current,
      );
      const translatePx = dragTranslate(session.edge, offset, width);

      setPanVisual((prev) =>
        prev
          ? { ...prev, translatePx, snapping: false }
          : {
              edge: session.edge,
              peek: session.peek,
              translatePx,
              snapping: false,
            },
      );
    },
    [getViewportWidth, resetPanState],
  );

  const onPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const session = sessionRef.current;
      if (!session || e.pointerId !== session.pointerId) {
        resetPanState();
        return;
      }

      if (session.locked) {
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          /* already released */
        }
        const edge = session.edge;
        const now = performance.now();
        const dx = e.clientX - session.startX;
        const lockDuration = Math.max(now - session.lockTime, 1);
        const velocityPxMs = dx / lockDuration;
        const offset = clampDragOffset(
          edge,
          dx,
          getViewportWidth(),
          surfaceRef.current,
        );
        sessionRef.current = null;
        setEdgeSessionActive(false);
        finishPan(edge, offset, velocityPxMs);
      } else {
        resetPanState();
      }
    },
    [finishPan, getViewportWidth, resetPanState],
  );

  const onPointerCancel = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const session = sessionRef.current;
      if (!session || e.pointerId !== session.pointerId) return;

      if (session.locked) {
        const edge = session.edge;
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          /* already released */
        }
        sessionRef.current = null;
        setEdgeSessionActive(false);
        finishSnapBack(edge);
      } else {
        resetPanState();
      }
    },
    [finishSnapBack, resetPanState],
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
        navigateToSurface("facility");
        return;
      }

      if (e.key === "ArrowRight") {
        const next = surfaceOnArrowRight(surfaceRef.current);
        if (next) {
          e.preventDefault();
          navigateToSurface(next);
        }
        return;
      }

      if (e.key === "ArrowLeft") {
        const next = surfaceOnArrowLeft(surfaceRef.current);
        if (next) {
          e.preventDefault();
          navigateToSurface(next);
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigateToSurface]);

  const showPeekTrack = panVisual != null;
  const activeSurface = surface;

  return (
    <SurfaceNavigationProvider surface={surface} setSurface={navigateToSurface}>
      <div
        className="ccc-command-shell ccc-surface-shell flex flex-col"
        data-active-surface={activeSurface}
      >
        <div className="ccc-ambience" aria-hidden>
          <div className="ccc-grid" />
        </div>

        <div className="ccc-command-shell__stage relative z-10 flex min-h-0 flex-1 flex-col">
          <SurfaceIndicator />

          <div
            ref={viewportRef}
            className={`ccc-surface-viewport min-h-0 flex-1 ${
              edgeSessionActive || showPeekTrack ? "touch-none" : "touch-pan-y"
            }`}
            data-edge-pan-active={
              edgeSessionActive || showPeekTrack ? "true" : undefined
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
            {showPeekTrack && panVisual ? (
              <div
                ref={trackRef}
                className="ccc-surface-track ccc-surface-track--peek"
                data-edge={panVisual.edge}
                data-snapping={panVisual.snapping ? "true" : undefined}
                style={{
                  transform: `translate3d(${panVisual.translatePx}px, 0, 0)`,
                }}
                onTransitionEnd={onTrackTransitionEnd}
              >
                {panVisual.edge === "left" ? (
                  <>
                    <div
                      className="ccc-surface-panel ccc-surface-panel--peek"
                      aria-hidden
                    >
                      {renderSurface(panVisual.peek)}
                    </div>
                    <div className="ccc-surface-panel ccc-surface-panel--active">
                      {renderSurface(activeSurface)}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="ccc-surface-panel ccc-surface-panel--active">
                      {renderSurface(activeSurface)}
                    </div>
                    <div
                      className="ccc-surface-panel ccc-surface-panel--peek"
                      aria-hidden
                    >
                      {renderSurface(panVisual.peek)}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div
                className="ccc-surface-active"
                data-surface={activeSurface}
              >
                {renderSurface(activeSurface)}
              </div>
            )}
          </div>

          <PanelRouter />
        </div>
      </div>
    </SurfaceNavigationProvider>
  );
}
