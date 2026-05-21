import type { InhabitantBehavior } from "@/data/inhabitant-types";
import type { OperationalSnapshot } from "@/data/operational-types";
import type { Operator } from "@/data/types";
import type { ChamberId } from "@/data/ecology";
import { CHAMBER_BY_ID } from "@/data/ecology";
import type { ContinuityEventView } from "@/lib/continuity/events/types";
import {
  discreteEventBurstEndMs,
  operatorDiscreteEligible,
  type DiscreteBurstState,
} from "@/lib/operations/discrete-burst";
import type { OperatorId } from "@/lib/operations/taxonomy";

export interface OperatorPacketContext {
  facilityNow: number;
  discreteBurst: DiscreteBurstState;
  continuityEvents: ContinuityEventView[];
}

/**
 * Transient operator “packet” labels — only inside discrete activity windows
 * (continuity events, snapshot sync, placement deltas, real lastSignal from scan).
 */
export function deriveOperatorPacket(
  operator: Operator,
  behavior: InhabitantBehavior,
  placementChamber: ChamberId,
  operational: OperationalSnapshot | null,
  ctx: OperatorPacketContext,
): string | null {
  if (!ctx.discreteBurst.discreteActive) return null;

  const derived = operational?.operators.find((o) => o.operatorId === operator.id);
  const chamber = CHAMBER_BY_ID[placementChamber];
  const chamberLabel = chamber?.codename ?? placementChamber;

  if (derived?.lastSignal?.trim()) {
    return `${operator.callsign} → ${truncatePacket(derived.lastSignal)}`;
  }

  if (
    ctx.discreteBurst.transitMotionActive &&
    behavior.transitFromChamberId
  ) {
    const from = CHAMBER_BY_ID[behavior.transitFromChamberId]?.codename ?? "?";
    return `${operator.callsign} → Transit ${from} → ${chamberLabel}`;
  }

  if (operatorDiscreteEligible(operator.id, ctx.facilityNow, ctx.continuityEvents)) {
    const ev = ctx.continuityEvents.find(
      (e) =>
        e.operators.includes(operator.id as OperatorId) &&
        ctx.facilityNow < discreteEventBurstEndMs(e),
    );
    if (ev) {
      return `${operator.callsign} → ${truncatePacket(ev.title)}`;
    }
  }

  return null;
}

function truncatePacket(text: string, max = 42): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}
