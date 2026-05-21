"use client";

import {
  useSyncExternalStore,
  useMemo,
  useRef,
  useCallback,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { InhabitantBehavior } from "@/data/inhabitant-types";
import type { Operator } from "@/data/types";
import type { OperatorPlacement } from "@/data/ecology";
import { useCCC } from "@/context/CCCContext";
import { deriveOperatorPacket } from "@/lib/operator-display";
import { buildOperatorHoverAwareness } from "@/lib/operator-hover-awareness";
import { OperatorHoverCard } from "@/components/operators/OperatorHoverCard";
import { OperatorNameplate } from "@/components/operators/OperatorNameplate";
import { OperationalPacket } from "@/components/operations/OperationalPacket";
import { OperatorEntity } from "./OperatorEntity";

const LONG_PRESS_MS = 450;
const DRAG_EXPAND_PX = 44;

function subscribeHoverCapability(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia("(hover: hover)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function readHoverCapability() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover: hover)").matches;
}

function usePrimaryInputSupportsHover() {
  return useSyncExternalStore(
    subscribeHoverCapability,
    readHoverCapability,
    () => false,
  );
}

interface OperatorInhabitantProps {
  operator: Operator;
  behavior: InhabitantBehavior;
  placement: OperatorPlacement;
}

export function OperatorInhabitant({
  operator,
  behavior,
  placement,
}: OperatorInhabitantProps) {
  const {
    openOperator,
    activePanel,
    operational,
    facilityNow,
    discreteBurst,
    continuityEvents,
  } = useCCC();
  const [hovered, setHovered] = useState(false);
  const supportsHoverUi = usePrimaryInputSupportsHover();

  const previewId = `ccc-op-quick-${operator.id}`;

  const longPressTimerRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);
  const longPressConsumedRef = useRef(false);
  const dragExpandArmedRef = useRef(false);
  const pointerDownYRef = useRef(0);
  const pendingPointerRef = useRef<number | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current != null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const packetCtx = useMemo(
    () => ({ facilityNow, discreteBurst, continuityEvents }),
    [facilityNow, discreteBurst, continuityEvents],
  );

  const hoverAwareness = useMemo(
    () =>
      buildOperatorHoverAwareness(
        operator,
        behavior,
        placement,
        operational,
        facilityNow,
      ),
    [operator, behavior, placement, operational, facilityNow],
  );

  const packet = useMemo(
    () =>
      deriveOperatorPacket(
        operator,
        behavior,
        placement.currentChamberId,
        operational,
        packetCtx,
      ),
    [operator, behavior, placement, operational, packetCtx],
  );

  const showTransitEmbodiment =
    placement.isTransit && discreteBurst.transitMotionActive;

  const isUnderInspection =
    activePanel?.kind === "operator" && activePanel.id === operator.id;

  const onPointerDownChrome = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>) => {
      clearLongPressTimer();
      pendingPointerRef.current = e.pointerId;
      pointerDownYRef.current = e.clientY;
      longPressConsumedRef.current = false;
      dragExpandArmedRef.current = false;

      if (e.pointerType === "mouse") return;

      longPressTimerRef.current = window.setTimeout(() => {
        longPressTimerRef.current = null;
        longPressConsumedRef.current = true;
        dragExpandArmedRef.current = true;
        suppressClickRef.current = true;
        setHovered(true);

        try {
          const id = pendingPointerRef.current;
          if (id != null && buttonRef.current?.setPointerCapture) {
            buttonRef.current.setPointerCapture(id);
          }
        } catch {
          /* capture unsupported or invalid */
        }
      }, LONG_PRESS_MS);
    },
    [clearLongPressTimer],
  );

  const onPointerMoveChrome = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>) => {
      if (e.pointerType === "mouse" || !dragExpandArmedRef.current) return;

      const dy = pointerDownYRef.current - e.clientY;
      if (dy < DRAG_EXPAND_PX) return;

      dragExpandArmedRef.current = false;
      longPressConsumedRef.current = false;
      suppressClickRef.current = true;
      clearLongPressTimer();
      setHovered(false);
      openOperator(operator.id);

      try {
        if (
          pendingPointerRef.current != null &&
          buttonRef.current?.releasePointerCapture
        ) {
          buttonRef.current.releasePointerCapture(pendingPointerRef.current);
        }
      } catch {
        /* noop */
      }
    },
    [clearLongPressTimer, openOperator, operator.id],
  );

  const onPointerEndChrome = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>) => {
      clearLongPressTimer();

      try {
        if (
          pendingPointerRef.current !== null &&
          pendingPointerRef.current === e.pointerId &&
          buttonRef.current?.releasePointerCapture
        ) {
          buttonRef.current.releasePointerCapture(e.pointerId);
        }
      } catch {
        /* noop */
      }

      if (e.pointerType !== "mouse" && longPressConsumedRef.current) {
        longPressConsumedRef.current = false;
        dragExpandArmedRef.current = false;
        pendingPointerRef.current = null;
        setHovered(false);
        return;
      }

      pendingPointerRef.current = null;
      dragExpandArmedRef.current = false;
    },
    [clearLongPressTimer],
  );

  return (
    <div
      className="ccc-inhabitant ccc-inhabitant--gesture group absolute z-[5]"
      data-operator-id={operator.id}
      data-inspected={isUnderInspection ? "true" : undefined}
      data-intensity={behavior.intensity}
      data-posture={behavior.posture}
      data-transit={showTransitEmbodiment ? "true" : undefined}
      style={{
        left: `${behavior.position.x}%`,
        bottom: "14%",
      }}
    >
      {showTransitEmbodiment && (
        <span className="ccc-inhabitant__transit-beam" aria-hidden />
      )}

      <OperatorNameplate
        callsign={operator.callsign}
        intensity={behavior.intensity}
        isTransit={showTransitEmbodiment}
      />

      {packet && (
        <OperationalPacket
          text={packet}
          packetKey={`${operator.id}-${packet}`}
          className="ccc-inhabitant__packet ccc-op-packet--live"
        />
      )}

      <button
        ref={buttonRef}
        type="button"
        onMouseEnter={() => {
          if (supportsHoverUi) setHovered(true);
        }}
        onMouseLeave={() => {
          if (supportsHoverUi) setHovered(false);
        }}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        onPointerDown={onPointerDownChrome}
        onPointerMove={onPointerMoveChrome}
        onPointerUp={onPointerEndChrome}
        onPointerCancel={onPointerEndChrome}
        draggable={false}
        onDragStart={(e) => {
          e.preventDefault();
        }}
        onContextMenu={(e) => {
          e.preventDefault();
        }}
        onSelect={(e) => {
          e.preventDefault();
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (suppressClickRef.current) {
            suppressClickRef.current = false;
            return;
          }
          openOperator(operator.id);
        }}
        className="ccc-agent-hit relative flex min-h-[3rem] min-w-[3rem] -translate-x-1/2 flex-col items-center justify-end border-0 bg-transparent p-0 outline-none touch-manipulation"
        aria-label={`${operator.callsign}, ${hoverAwareness.stateLabel}, ${hoverAwareness.activity}`}
        aria-describedby={hovered ? previewId : undefined}
      >
        <OperatorEntity operator={operator} behavior={behavior} />
      </button>

      <OperatorHoverCard
        id={previewId}
        awareness={hoverAwareness}
        visible={hovered}
        anchorRef={buttonRef}
      />
    </div>
  );
}
