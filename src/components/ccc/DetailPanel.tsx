"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, type ReactNode } from "react";
import { useIsMobile } from "@/lib/use-media-query";

interface DetailPanelProps {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}

export function DetailPanel({
  open,
  title,
  subtitle,
  onClose,
  children,
}: DetailPanelProps) {
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement;
    return () => {
      if (prev instanceof HTMLElement) prev.focus();
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Close panel"
            className="fixed inset-0 z-40 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="panel-title"
            className={
              isMobile
                ? "fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-xl border border-ccc-border bg-ccc-surface pb-[env(safe-area-inset-bottom)] shadow-2xl"
                : "fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-ccc-border bg-ccc-surface shadow-2xl md:max-w-lg"
            }
            initial={isMobile ? { y: "100%" } : { x: "100%" }}
            animate={isMobile ? { y: 0 } : { x: 0 }}
            exit={isMobile ? { y: "100%" } : { x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-ccc-border px-4 py-4">
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
                className="ccc-tap-target shrink-0 rounded-lg border border-ccc-border px-3 py-2 text-sm text-ccc-muted hover:text-ccc-text"
              >
                Close
              </button>
            </div>
            <div className="ccc-scroll flex-1 px-4 py-4">{children}</div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
