"use client";

import {
  useCallback,
  useLayoutEffect,
  useState,
  type RefObject,
} from "react";
import {
  computeHoverCardPosition,
  type HoverCardPosition,
} from "@/lib/operator-hover-placement";

export function useOperatorHoverPlacement(
  visible: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  cardRef: RefObject<HTMLElement | null>,
): HoverCardPosition | null {
  const [position, setPosition] = useState<HoverCardPosition | null>(null);

  const update = useCallback(() => {
    const anchor = anchorRef.current;
    const card = cardRef.current;
    if (!anchor || !card) return;

    const anchorRect = anchor.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const width = cardRect.width || card.offsetWidth;
    const height = cardRect.height || card.offsetHeight;
    if (width <= 0 || height <= 0) return;

    setPosition(
      computeHoverCardPosition(anchorRect, { width, height }),
    );
  }, [anchorRef, cardRef]);

  useLayoutEffect(() => {
    if (!visible) {
      const id = requestAnimationFrame(() => setPosition(null));
      return () => cancelAnimationFrame(id);
    }

    update();

    const anchor = anchorRef.current;
    const card = cardRef.current;
    const observers: ResizeObserver[] = [];

    if (typeof ResizeObserver !== "undefined") {
      if (anchor) {
        const roAnchor = new ResizeObserver(update);
        roAnchor.observe(anchor);
        observers.push(roAnchor);
      }
      if (card) {
        const roCard = new ResizeObserver(update);
        roCard.observe(card);
        observers.push(roCard);
      }
    }

    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);

    return () => {
      observers.forEach((ro) => ro.disconnect());
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [visible, update, anchorRef, cardRef]);

  return position;
}
