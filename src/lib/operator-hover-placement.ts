export type HoverCardPlacement = "above" | "below";

export interface HoverCardPosition {
  top: number;
  left: number;
  placement: HoverCardPlacement;
  /** Stem anchor X in px from card left edge */
  stemX: number;
}

const VIEWPORT_MARGIN = 8;
const ANCHOR_GAP = 12;
const STEM_HEIGHT = 10;

export function computeHoverCardPosition(
  anchor: DOMRect,
  card: { width: number; height: number },
  viewport: { width: number; height: number } = {
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
  },
): HoverCardPosition {
  const cw = card.width;
  const ch = card.height;
  const anchorCx = anchor.left + anchor.width / 2;
  const offset = ANCHOR_GAP + STEM_HEIGHT;

  let placement: HoverCardPlacement = "above";
  let top = anchor.top - ch - offset;

  if (top < VIEWPORT_MARGIN) {
    placement = "below";
    top = anchor.bottom + offset;
  }

  if (placement === "below" && top + ch > viewport.height - VIEWPORT_MARGIN) {
    top = Math.max(VIEWPORT_MARGIN, viewport.height - VIEWPORT_MARGIN - ch);
  }
  if (placement === "above" && top < VIEWPORT_MARGIN) {
    top = VIEWPORT_MARGIN;
  }

  let left = anchorCx - cw / 2;
  left = Math.max(
    VIEWPORT_MARGIN,
    Math.min(left, viewport.width - VIEWPORT_MARGIN - cw),
  );

  const stemX = Math.max(12, Math.min(anchorCx - left, cw - 12));

  return { top, left, placement, stemX };
}
