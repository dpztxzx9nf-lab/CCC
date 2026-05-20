import type { InhabitantBehavior } from "@/data/inhabitant-types";
import type { OperationalSnapshot } from "@/data/operational-types";
import type { Operator } from "@/data/types";
import type { ChamberId, OperationalDomainId } from "@/data/ecology";
import { CHAMBER_BY_ID, DOMAIN_BY_ID } from "@/data/ecology";
import type { OperatorPlacement } from "@/data/ecology";
import type { ContinuityEventView } from "@/lib/continuity/events/types";
import {
  discreteEventBurstEndMs,
  operatorDiscreteEligible,
  type DiscreteBurstState,
} from "@/lib/operations/discrete-burst";
import type { OperatorId } from "@/lib/operations/taxonomy";

export interface OperatorDisplayInfo {
  callsign: string;
  /** Current physical chamber */
  chamberId: ChamberId;
  chamberLabel: string;
  /** Primary operational domain */
  primaryDomain: OperationalDomainId;
  domainLabel: string;
  homeChamberId: ChamberId;
  homeChamberLabel: string;
  task: string;
  activitySource: string;
  isTransit: boolean;
}

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
    ctx.discreteBurst.placementPulseActive &&
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

export function buildOperatorDisplayInfo(
  operator: Operator,
  behavior: InhabitantBehavior,
  placement: OperatorPlacement,
  operational: OperationalSnapshot | null,
): OperatorDisplayInfo {
  const derived = operational?.operators.find((o) => o.operatorId === operator.id);
  let activitySource = "Profile baseline";
  if (operational?.snapshotMeta) {
    activitySource = `${operational.snapshotMeta.agent} snapshot`;
  } else if (operational?.enabled) {
    activitySource =
      operational.source === "local"
        ? "Local continuity"
        : operational.source === "archivist"
          ? "ARCHIVIST snapshot"
          : "Operational map";
  }

  const chamber = CHAMBER_BY_ID[placement.currentChamberId];
  const home = CHAMBER_BY_ID[placement.homeChamberId];
  const domain = DOMAIN_BY_ID[placement.primaryDomain];

  return {
    callsign: operator.callsign,
    chamberId: placement.currentChamberId,
    chamberLabel: chamber?.codename ?? placement.currentChamberId,
    primaryDomain: placement.primaryDomain,
    domainLabel: domain?.name ?? placement.primaryDomain,
    homeChamberId: placement.homeChamberId,
    homeChamberLabel: home?.codename ?? placement.homeChamberId,
    task: derived?.currentActivity ?? behavior.stateLabel,
    activitySource: derived?.activeProjectName
      ? `${activitySource} · ${derived.activeProjectName}`
      : activitySource,
    isTransit: placement.isTransit,
  };
}

function truncatePacket(text: string, max = 42): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}
