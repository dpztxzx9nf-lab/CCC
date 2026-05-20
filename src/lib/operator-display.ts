import type { InhabitantBehavior } from "@/data/inhabitant-types";
import type { OperationalSnapshot } from "@/data/operational-types";
import type { Operator } from "@/data/types";
import type { ChamberId, OperationalDomainId } from "@/data/ecology";
import { CHAMBER_BY_ID, DOMAIN_BY_ID } from "@/data/ecology";
import type { OperatorPlacement } from "@/data/ecology";

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

export function deriveOperatorPacket(
  operator: Operator,
  behavior: InhabitantBehavior,
  placementChamber: ChamberId,
  operational: OperationalSnapshot | null,
): string | null {
  const derived = operational?.operators.find((o) => o.operatorId === operator.id);
  const chamber = CHAMBER_BY_ID[placementChamber];
  const chamberLabel = chamber?.codename ?? placementChamber;

  if (derived?.lastSignal) {
    return `${operator.callsign} → ${truncatePacket(derived.lastSignal)}`;
  }

  if (behavior.transitFromChamberId && behavior.intensity !== "calm") {
    const from = CHAMBER_BY_ID[behavior.transitFromChamberId]?.codename ?? "?";
    return `${operator.callsign} → Transit ${from} → ${chamberLabel}`;
  }

  const packetByRole: Record<string, string | null> = {
    "deep-1":
      behavior.posture === "archiving" || behavior.posture === "reviewing"
        ? `${operator.callsign} → Vault sync active`
        : behavior.intensity !== "calm"
          ? `${operator.callsign} → Forge signal detected`
          : null,
    "fab-0":
      behavior.posture === "building"
        ? `${operator.callsign} → Build queue active`
        : behavior.posture === "monitoring"
          ? `${operator.callsign} → Runtime diagnostic`
          : behavior.intensity !== "calm"
            ? `${operator.callsign} → Deploy rail engaged`
            : null,
    "bcast-1":
      behavior.posture === "relaying"
        ? `${operator.callsign} → Uplink pulse`
        : behavior.intensity !== "calm"
          ? `${operator.callsign} → Projection routing`
          : null,
    "scout-6":
      behavior.posture === "scouting"
        ? `${operator.callsign} → Index sweep complete`
        : behavior.intensity !== "calm"
          ? `${operator.callsign} → Field scan active`
          : null,
    "nexus-7":
      behavior.posture === "coordinating"
        ? `${operator.callsign} → Global posture updated`
        : behavior.intensity !== "calm"
          ? `${operator.callsign} → Continuity routing`
          : null,
  };

  const rolePacket = packetByRole[operator.id];
  if (rolePacket) return rolePacket;

  if (behavior.intensity === "calm") return null;
  return `${operator.callsign} → ${behavior.stateLabel}`;
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
