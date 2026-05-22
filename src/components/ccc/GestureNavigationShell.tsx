"use client";

import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {
  CCC_SURFACES,
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
/** Fallback if transitionend does not fire (Safari) */
const SNAP_TRANSITION_MS = 200;

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

function addCachedSurface(prev: Set<CccSurface>, id: CccSurface): Set<CccSurface> {
  if (prev.has(id)) return prev;
  const next = new Set(prev);
  next.add(id);
  return next;
}

export const GestureNavigationShell = memo(function GestureNavigationShell({
  projects,
  facility,
  opsPortal,
  initialSurface = DEFAULT_CCC_SURFACE,
}: GestureNavigationShellProps) {
  const [surface, setSurface] = useState<CccSurface>(initialSurface);
  const [cachedSurfaces, setCachedSurfaces] = useState<Set<CccSurface>>(
    () => new Set([initialSurface]),
  );
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
  const dragRafRef = useRef(0);
  const pendingTranslateRef = useRef(0);

  surfaceRef.current = surface;
  panVisualRef.current = panVisual;

  const surfaceNodes = useRef({
    projects,
    facility,
    ops: opsPortal,
  });
  surfaceNodes.current = { projects, facility, ops: opsPortal };

  const mountSurface = useCallback((id: CccSurface) => {
    setCachedSurfaces((prev) => addCachedSurface(prev, id));
  }, []);

  const getViewportWidth = useCallback(() => {
    return viewportRef.current?.clientWidth ?? window.innerWidth;
  }, []);

  const cancelDragRaf = useCallback(() => {
    if (dragRafRef.current) {
      cancelAnimationFrame(dragRafRef.current);
      dragRafRef.current = 0;
    }
  }, []);

  const applyPeekTranslate = useCallback((px: number) => {
    pendingTranslateRef.current = px;
    viewportRef.current?.style.setProperty(
      "--ccc-peek-translate",
      `${px}px`,
    );
  }, []);

  const schedulePeekTranslate = useCallback(
    (px: number) => {
      pendingTranslateRef.current = px;
      if (dragRafRef.current) return;
      dragRafRef.current = requestAnimationFrame(() => {
        dragRafRef.current = 0;
        viewportRef.current?.style.setProperty(
          "--ccc-peek-translate",
          `${pendingTranslateRef.current}px`,
        );
      });
    },
    [],
  );

  const clearPeekStyles = useCallback(() => {
    cancelDragRaf();
    const viewport = viewportRef.current;
    if (viewport) {
      viewport.style.removeProperty("--ccc-peek-translate");
    }
    trackRef.current?.style.removeProperty("transform");
  }, [cancelDragRaf]);

  const resetPanState = useCallback(() => {
    if (snapTimerRef.current) {
      clearTimeout(snapTimerRef.current);
      snapTimerRef.current = null;
    }
    cancelDragRaf();
    sessionRef.current = null;
    setEdgeSessionActive(false);
    setPanVisual(null);
    clearPeekStyles();
  }, [cancelDragRaf, clearPeekStyles]);

  const navigateToSurface = useCallback(
    (target: CccSurface) => {
      resetPanState();
      mountSurface(target);
      setSurface(target);
    },
    [mountSurface, resetPanState],
  );

  const renderSurfaceNode = useCallback((id: CccSurface) => {
    const nodes = surfaceNodes.current;
    if (id === "projects") return nodes.projects;
    if (id === "facility") return nodes.facility;
    return nodes.ops;
  }, []);

  const finishSnapBack = useCallback(
    (edge: EdgeOrigin) => {
      if (!panVisualRef.current) {
        resetPanState();
        return;
      }

      if (prefersReducedMotionRef.current) {
        resetPanState();
        return;
      }

      const resting = baseTranslateForEdge(edge, getViewportWidth());
      applyPeekTranslate(resting);
      setPanVisual((prev) =>
        prev ? { ...prev, snapping: true } : null,
      );

      if (snapTimerRef.current) clearTimeout(snapTimerRef.current);
      snapTimerRef.current = setTimeout(() => {
        snapTimerRef.current = null;
        resetPanState();
      }, SNAP_TRANSITION_MS);
    },
    [applyPeekTranslate, getViewportWidth, resetPanState],
  );

  useEffect(() => {
    prefersReducedMotionRef.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    return () => {
      if (snapTimerRef.current) clearTimeout(snapTimerRef.current);
      cancelDragRaf();
    };
  }, [cancelDragRaf]);

  useEffect(() => {
    mountSurface(surface);
  }, [surface, mountSurface]);

  // Preload adjacent surfaces after first paint (cheap revisit navigation).
  useEffect(() => {
    const left = surfaceAfterSwipeRight(surface);
    const right = surfaceAfterSwipeLeft(surface);
    const preload = () => {
      if (left) mountSurface(left);
      if (right) mountSurface(right);
    };
    if (typeof requestIdleCallback !== "undefined") {
      const id = requestIdleCallback(preload, { timeout: 1200 });
      return () => cancelIdleCallback(id);
    }
    const t = window.setTimeout(preload, 300);
    return () => clearTimeout(t);
  }, [surface, mountSurface]);

  useEffect(() => {
    if (!panVisual) clearPeekStyles();
  }, [panVisual, clearPeekStyles]);

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

      mountSurface(peek);
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
    [getViewportWidth, mountSurface],
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
        const resting = baseTranslateForEdge(session.edge, width);
        applyPeekTranslate(resting);
        setPanVisual({
          edge: session.edge,
          peek: session.peek,
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
      schedulePeekTranslate(dragTranslate(session.edge, offset, width));
    },
    [
      applyPeekTranslate,
      getViewportWidth,
      resetPanState,
      schedulePeekTranslate,
    ],
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
  const surfaceMode = showPeekTrack ? "peek" : "idle";

  const renderCachedLayer = (id: CccSurface, visible: boolean) => {
    if (!cachedSurfaces.has(id)) return null;
    return (
      <div
        key={id}
        className="ccc-surface-layer"
        data-surface={id}
        data-active={visible ? "true" : "false"}
        hidden={!visible}
        aria-hidden={!visible}
        inert={!visible}
      >
        {renderSurfaceNode(id)}
      </div>
    );
  };

  return (
    <SurfaceNavigationProvider surface={surface} setSurface={navigateToSurface}>
      <div
        className="ccc-command-shell ccc-surface-shell flex flex-col"
        data-active-surface={surface}
      >
        <div className="ccc-ambience" aria-hidden>
          <div className="ccc-grid" />
        </div>

        <div className="ccc-command-shell__stage relative z-10 flex min-h-0 flex-1 flex-col">
          <SurfaceIndicator />

          <div
            ref={viewportRef}
            className="ccc-surface-viewport min-h-0 flex-1"
            data-surface-mode={surfaceMode}
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
                onTransitionEnd={onTrackTransitionEnd}
              >
                {panVisual.edge === "left" ? (
                  <>
                    <div className="ccc-surface-panel ccc-surface-panel--peek">
                      {renderCachedLayer(panVisual.peek, true)}
                    </div>
                    <div className="ccc-surface-panel ccc-surface-panel--active">
                      {renderCachedLayer(surface, true)}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="ccc-surface-panel ccc-surface-panel--active">
                      {renderCachedLayer(surface, true)}
                    </div>
                    <div className="ccc-surface-panel ccc-surface-panel--peek">
                      {renderCachedLayer(panVisual.peek, true)}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="ccc-surface-active" data-surface={surface}>
                {CCC_SURFACES.map((id) => renderCachedLayer(id, id === surface))}
              </div>
            )}
          </div>

          <PanelRouter />
        </div>
      </div>
    </SurfaceNavigationProvider>
  );
});
