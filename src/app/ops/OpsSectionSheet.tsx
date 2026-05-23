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
} from "react";
import { createPortal } from "react-dom";
import {
  CONTROL_SURFACE_SPRING_IN,
  CONTROL_SURFACE_SPRING_SETTLE,
  CONTROL_SURFACE_SPRING_SNAP,
} from "@/lib/motion/controlSurfaceSprings";

export interface OpsSectionNavItem {
  id: string;
  label: string;
}

export function OpsSectionSheet({
  sections,
}: {
  sections: readonly OpsSectionNavItem[];
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const reduceMotion = useReducedMotion();
  const dragControls = useDragControls();
  const panelRef = useRef<HTMLDivElement>(null);
  const yMv = useMotionValue(0);
  const [axisSize, setAxisSize] = useState(0);
  const axisRef = useRef(0);

  useLayoutEffect(() => {
    if (!mounted) return;

    function measure() {
      const el = panelRef.current;
      if (!el) return;
      const h = el.offsetHeight;
      axisRef.current = h;
      setAxisSize(h);
    }

    measure();
    const el = panelRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, [mounted, open]);

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

  const backdropOpacity = useTransform(yMv, (v) => {
    const span = axisRef.current || axisSize || 380;
    const t = Math.min(1.1, Math.max(0, v / span));
    return 0.36 * Math.max(0, 1 - t * 0.88);
  });

  const finalizeDismiss = useCallback(async () => {
    const span = axisRef.current || axisSize || 400;
    const target = span + Math.min(28, span * 0.08);
    await animate(yMv, target, springSnap);
    setOpen(false);
    setMounted(false);
  }, [axisSize, springSnap, yMv]);

  /** Enter from dock */
  useLayoutEffect(() => {
    if (!open || !mounted || axisSize === 0) return;
    yMv.set(axisSize);
    void animate(yMv, 0, springIn);
  }, [open, mounted, axisSize, springIn, yMv]);

  useEffect(() => {
    if (!mounted) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        void finalizeDismiss();
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [mounted, finalizeDismiss]);

  const beginChromeDrag = useCallback(
    (e: ReactPointerEvent) => dragControls.start(e),
    [dragControls],
  );

  const onDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const span = axisRef.current || 1;
      const y = yMv.get();
      const vy = info.velocity.y;

      const peek = Math.min(span * 0.5, Math.max(112, span * 0.34));
      const dismiss = span + Math.min(28, span * 0.08);
      let target = y;

      if (vy > 680 && y > span * 0.05) {
        target = dismiss;
      } else if (vy < -360 && y < peek * 0.7) {
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

  const goToSection = useCallback(
    (id: string) => {
      void (async () => {
        await finalizeDismiss();
        requestAnimationFrame(() => {
          document.getElementById(id)?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
          try {
            history.replaceState(null, "", `#${id}`);
          } catch {
            /* noop */
          }
        });
      })();
    },
    [finalizeDismiss],
  );

  const sheet =
    mounted && typeof document !== "undefined"
      ? createPortal(
          <div className="ccc-ops-sheet-layer" aria-hidden={!open}>
            <motion.button
              type="button"
              aria-label="Dismiss sections"
              className="ccc-ops-sheet-backdrop"
              style={{ opacity: backdropOpacity }}
              initial={false}
              transition={{ duration: 0 }}
              onClick={() => void finalizeDismiss()}
            />
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="ops-sheet-label"
              className="ccc-ops-sheet-panel"
              style={{ y: yMv }}
              drag="y"
              dragControls={dragControls}
              dragListener={false}
              dragMomentum
              dragConstraints={{
                top: -32,
                bottom: Math.max(axisSize, 320) + 48,
              }}
              dragElastic={{ top: 0.06, bottom: 0.12 }}
              onDragEnd={onDragEnd}
            >
              <div
                className="ccc-ops-sheet-chrome"
                onPointerDown={beginChromeDrag}
              >
                <span className="ccc-ops-sheet-handle" aria-hidden />
                <p className="ccc-ops-sheet-title" id="ops-sheet-label">
                  Sections
                </p>
              </div>
              <nav
                className="ccc-ops-sheet-nav ccc-scroll"
                aria-label="Jump to ops section"
              >
                <ul>
                  {sections.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        className="ccc-ops-sheet-link"
                        onClick={() => goToSection(s.id)}
                      >
                        {s.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>
              <button
                type="button"
                className="sr-only"
                onClick={() => void finalizeDismiss()}
              >
                Close sections
              </button>
            </motion.div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="md:hidden">
      <button
        type="button"
        className="ccc-ops-sheet-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setMounted(true);
          setOpen(true);
        }}
      >
        Sections
      </button>
      {sheet}
    </div>
  );
}
