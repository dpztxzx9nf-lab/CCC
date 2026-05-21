"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState, type RefObject } from "react";
import type { OperatorHoverAwareness } from "@/lib/operator-interaction";
import { useOperatorHoverPlacement } from "./useOperatorHoverPlacement";

interface OperatorHoverCardProps {
  id: string;
  awareness: OperatorHoverAwareness;
  visible: boolean;
  anchorRef: RefObject<HTMLElement | null>;
}

/** Situational operational awareness — not a profile or dossier. */
export function OperatorHoverCard({
  id,
  awareness,
  visible,
  anchorRef,
}: OperatorHoverCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [portalReady, setPortalReady] = useState(false);
  const position = useOperatorHoverPlacement(visible, anchorRef, cardRef);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  if (!portalReady || !visible || typeof document === "undefined") {
    return null;
  }

  const positioned = position != null;
  const style = positioned
    ? {
        top: position.top,
        left: position.left,
        ["--ccc-hover-stem-x" as string]: `${position.stemX}px`,
      }
    : { top: -9999, left: -9999, visibility: "hidden" as const };

  const card = (
    <div
      ref={cardRef}
      id={id}
      className={`ccc-operator-hover ccc-operator-hover--awareness ccc-operator-hover--portal${positioned ? " ccc-operator-hover--visible" : ""}${awareness.hasLiveSignal ? " ccc-operator-hover--live" : ""}`}
      data-sector={awareness.sectorTone}
      data-placement={position?.placement ?? "above"}
      style={style}
      role="tooltip"
      aria-hidden={!positioned}
    >
      <span className="ccc-operator-hover__stem" aria-hidden />

      <p className="ccc-operator-hover__state">{awareness.stateLabel}</p>
      <span className="ccc-operator-hover__rule" aria-hidden />

      <p className="ccc-operator-hover__task" title={awareness.activity}>
        {awareness.activity}
      </p>

      {awareness.cause ? (
        <p className="ccc-operator-hover__cause" title={awareness.cause}>
          {awareness.cause}
        </p>
      ) : null}

      <p className="ccc-operator-hover__metrics">{awareness.metrics}</p>
    </div>
  );

  return createPortal(card, document.body);
}
