"use client";

import {
  animate,
  motion,
  useDragControls,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type PanInfo,
} from "framer-motion";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  CONTROL_SURFACE_SPRING_IN,
  CONTROL_SURFACE_SPRING_SETTLE,
  CONTROL_SURFACE_SPRING_SNAP,
} from "@/lib/motion/controlSurfaceSprings";
import { usePanelLayout } from "@/lib/use-panel-layout";

interface DetailPanelProps {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}

function backdropOpacityForOffset(latest: number, extent: number): number {
  if (extent <= 0) return 0.62;
  const t = Math.min(1.15, Math.max(0, latest / extent));
  return 0.62 * Math.max(0, 1 - t * 0.92);
}

export function DetailPanel({
  open,
  title,
  subtitle,
  onClose,
  children,
}: DetailPanelProps) {
  const layout = usePanelLayout(open);
  const reduceMotion = useReducedMotion();
  const dragControls = useDragControls();
  const panelRef = useRef<HTMLElement>(null);

  const [mounted, setMounted] = useState(open);
  const enteredRef = useRef(false);

  const axisSizeRef = useRef(0);
  const [axisSize, setAxisSize] = useState(0);

  const yMv = useMotionValue(0);
  const xMv = useMotionValue(0);

  useLayoutEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  useLayoutEffect(() => {
    if (!mounted || typeof window === "undefined") return;

    function measure() {
      const el = panelRef.current;
      if (!el) return;
      const next = layout === "sheet" ? el.offsetHeight : el.offsetWidth;
      axisSizeRef.current = next;
      setAxisSize(next);
    }

    measure();

    const el = panelRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [mounted, layout, open]);

  const backdropOpacitySheet = useTransform(yMv, (v) =>
    backdropOpacityForOffset(v, axisSizeRef.current || axisSize || 480),
  );
  const backdropOpacitySide = useTransform(xMv, (v) =>
    backdropOpacityForOffset(v, axisSizeRef.current || axisSize || 360),
  );
  const backdropOpacity =
    layout === "sheet" ? backdropOpacitySheet : backdropOpacitySide;

  const springIn = useMemo(
    () =>
      reduceMotion
        ? { duration: 0.14, ease: "easeOut" as const }
        : CONTROL_SURFACE_SPRING_IN,
    [reduceMotion],
  );
  const springSnap = useMemo(
    () =>
      reduceMotion
        ? { duration: 0.16, ease: "easeOut" as const }
        : CONTROL_SURFACE_SPRING_SNAP,
    [reduceMotion],
  );
  const springSettle = useMemo(
    () =>
      reduceMotion
        ? { duration: 0.16, ease: "easeOut" as const }
        : CONTROL_SURFACE_SPRING_SETTLE,
    [reduceMotion],
  );

  const finalizeDismiss = useCallback(async () => {
    const mv = layout === "sheet" ? yMv : xMv;
    const span = axisSizeRef.current || 0;
    const target = span > 0 ? span + Math.min(32, span * 0.08) : 420;
    await animate(mv, target, springSnap);
    onClose();
    setMounted(false);
    enteredRef.current = false;
  }, [layout, onClose, springSnap, xMv, yMv]);

  /** Entrance spring from infrastructural dock (off-stage). */
  useLayoutEffect(() => {
    if (!mounted || !open || axisSize === 0) return;
    if (enteredRef.current) return;

    enteredRef.current = true;
    const mv = layout === "sheet" ? yMv : xMv;
    mv.set(axisSize);
    void animate(mv, 0, springIn);
  }, [mounted, open, axisSize, layout, springIn, xMv, yMv]);

  useEffect(() => {
    if (!open) enteredRef.current = false;
  }, [open]);

  /** Escape — gestural dismissal, not modal chrome */
  useEffect(() => {
    if (!mounted) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      e.preventDefault();
      void finalizeDismiss();
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [mounted, finalizeDismiss]);

  /** Parent cleared `activePanel`; finish motion unless already dismissed */
  useEffect(() => {
    if (open || !mounted) return;
    const mv = layout === "sheet" ? yMv : xMv;
    const span = axisSizeRef.current;
    const atRest = span > 0 && mv.get() >= span * 0.94;
    if (atRest) {
      setMounted(false);
      return;
    }
    let cancelled = false;
    const target =
      span > 0 ? span + Math.min(32, span * 0.08) : layout === "sheet" ? 640 : 360;
    animate(mv, target, springSnap).then(() => {
      if (!cancelled) setMounted(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, mounted, layout, springSnap, xMv, yMv]);

  const onDragEndSheet = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const span = axisSizeRef.current || 1;
      const y = yMv.get();
      const vy = info.velocity.y;

      const peek = Math.min(span * 0.52, Math.max(136, span * 0.36));
      const dismiss = span + Math.min(32, span * 0.08);
      let target = y;

      if (vy > 720 && y > span * 0.06) {
        target = dismiss;
      } else if (vy < -420 && y < peek * 0.65) {
        target = 0;
      } else {
        const snaps = [0, peek, dismiss];
        target = snaps.reduce((best, cand) =>
          Math.abs(cand - y) < Math.abs(best - y) ? cand : best,
        );
      }

      if (target >= dismiss - 2) {
        void finalizeDismiss();
        return;
      }
      void animate(yMv, target, springSettle);
    },
    [finalizeDismiss, springSettle, yMv],
  );

  const onDragEndSide = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const span = axisSizeRef.current || 1;
      const x = xMv.get();
      const vx = info.velocity.x;

      const peek = Math.min(span * 0.5, Math.max(120, span * 0.32));
      const dismiss = span + Math.min(32, span * 0.08);
      let target = x;

      if (vx > 720 && x > span * 0.07) {
        target = dismiss;
      } else if (vx < -420 && x < peek * 0.65) {
        target = 0;
      } else {
        const snaps = [0, peek, dismiss];
        target = snaps.reduce((best, cand) =>
          Math.abs(cand - x) < Math.abs(best - x) ? cand : best,
        );
      }

      if (target >= dismiss - 2) {
        void finalizeDismiss();
        return;
      }
      void animate(xMv, target, springSettle);
    },
    [finalizeDismiss, springSettle, xMv],
  );

  const beginChromeDrag = useCallback(
    (e: ReactPointerEvent) => dragControls.start(e),
    [dragControls],
  );

  /** Focus stewardship */
  useEffect(() => {
    if (!mounted) return;
    const prev = document.activeElement;
    return () => {
      if (prev instanceof HTMLElement) prev.focus({ preventScroll: true });
    };
  }, [mounted]);

  if (!mounted || typeof document === "undefined") {
    return null;
  }

  const chrome =
    layout === "sheet"
      ? "ccc-detail-panel__chrome ccc-detail-panel__chrome--sheet"
      : "ccc-detail-panel__chrome ccc-detail-panel__chrome--rail";

  return createPortal(
    <div key="ccc-panel-root" className="ccc-panel-layer">
      <motion.button
        type="button"
        aria-label="Dismiss panel"
        className="ccc-panel-backdrop touch-manipulation border-0 p-0"
        style={{
          opacity: backdropOpacity,
        }}
        initial={false}
        transition={{ duration: 0 }}
        onClick={() => void finalizeDismiss()}
      />
      <motion.aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="panel-title"
        className={
          layout === "sheet"
            ? "ccc-detail-panel ccc-detail-panel--sheet touch-manipulation"
            : "ccc-detail-panel ccc-detail-panel--side touch-manipulation"
        }
        style={layout === "sheet" ? { y: yMv } : { x: xMv }}
        drag={layout === "sheet" ? "y" : "x"}
        dragControls={dragControls}
        dragListener={false}
        dragMomentum
        dragConstraints={
          layout === "sheet"
            ? {
                top: -40,
                bottom: Math.max(axisSize, 280) + 56,
              }
            : {
                left: -28,
                right: Math.max(axisSize, 320) + 40,
              }
        }
        dragElastic={
          layout === "sheet"
            ? { top: 0.07, bottom: 0.11 }
            : { left: 0.06, right: 0.1 }
        }
        onDragEnd={layout === "sheet" ? onDragEndSheet : onDragEndSide}
      >
        {layout === "side" ? (
          <div
            className="ccc-detail-panel__rail-edge"
            aria-hidden
            onPointerDown={beginChromeDrag}
          />
        ) : null}
        <div
          className={chrome}
          onPointerDown={beginChromeDrag}
          data-drag-surface={layout === "sheet" ? "sheet" : "rail"}
        >
          {layout === "sheet" ? (
            <div className="ccc-detail-panel__handle-wrap">
              <span className="ccc-detail-panel__handle" aria-hidden />
            </div>
          ) : null}
          <div className="ccc-detail-panel__header">
            <div className="min-w-0 flex-1">
              <h2 id="panel-title" className="text-lg font-semibold text-ccc-text">
                {title}
              </h2>
              {subtitle ? (
                <p className="mt-0.5 text-sm text-ccc-muted">{subtitle}</p>
              ) : null}
            </div>
            <button
              type="button"
              className="sr-only"
              onClick={() => void finalizeDismiss()}
            >
              Close panel
            </button>
          </div>
        </div>
        <div className="ccc-detail-panel__body ccc-scroll">{children}</div>
      </motion.aside>
    </div>,
    document.body,
  );
}
