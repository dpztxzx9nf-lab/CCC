"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { usePanelLayout, type PanelLayout } from "@/lib/use-panel-layout";

interface DetailPanelProps {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}

const SHEET_MOTION = {
  initial: { y: "100%", x: 0 },
  animate: { y: 0, x: 0 },
  exit: { y: "100%", x: 0 },
};

const SIDE_MOTION = {
  initial: { x: "100%", y: 0 },
  animate: { x: 0, y: 0 },
  exit: { x: "100%", y: 0 },
};

function motionForLayout(layout: PanelLayout) {
  return layout === "sheet" ? SHEET_MOTION : SIDE_MOTION;
}

export function DetailPanel({
  open,
  title,
  subtitle,
  onClose,
  children,
}: DetailPanelProps) {
  const layout = usePanelLayout(open);
  const panelMotion = motionForLayout(layout);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement;
    return () => {
      if (prev instanceof HTMLElement) prev.focus();
    };
  }, [open]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <AnimatePresence mode="wait">
      <div key="ccc-panel-layer" className="ccc-panel-layer">
        <motion.button
          type="button"
          aria-label="Close panel"
          className="ccc-panel-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        />
        <motion.aside
          key={layout}
          role="dialog"
          aria-modal="true"
          aria-labelledby="panel-title"
          className={
            layout === "sheet"
              ? "ccc-detail-panel ccc-detail-panel--sheet"
              : "ccc-detail-panel ccc-detail-panel--side"
          }
          initial={panelMotion.initial}
          animate={panelMotion.animate}
          exit={panelMotion.exit}
          transition={{ type: "spring", damping: 32, stiffness: 380 }}
        >
          {layout === "sheet" && (
            <div className="ccc-detail-panel__handle-wrap">
              <span className="ccc-detail-panel__handle" aria-hidden />
            </div>
          )}
          <div className="ccc-detail-panel__header">
            <div className="min-w-0 flex-1">
              <h2 id="panel-title" className="text-lg font-semibold text-ccc-text">
                {title}
              </h2>
              {subtitle && (
                <p className="mt-0.5 text-sm text-ccc-muted">{subtitle}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="ccc-tap-target shrink-0 rounded-md px-3 py-2 text-sm text-ccc-muted hover:bg-ccc-surface-raised hover:text-ccc-text"
            >
              Close
            </button>
          </div>
          <div className="ccc-detail-panel__body ccc-scroll">{children}</div>
        </motion.aside>
      </div>
    </AnimatePresence>,
    document.body,
  );
}
