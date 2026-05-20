import type { InhabitantBehavior } from "@/data/inhabitant-types";
import type { OperationalSnapshot } from "@/data/operational-types";
import type { Operator, SectorId } from "@/data/types";

const SECTOR_LABEL: Record<SectorId, string> = {
  core: "Core",
  archive: "Archive",
  forge: "Forge",
  observatory: "Observatory",
  relay: "Relay",
  runtime: "Runtime",
};

export interface OperatorDisplayInfo {
  callsign: string;
  sectorId: SectorId;
  sectorLabel: string;
  homeSectorId: SectorId;
  task: string;
  activitySource: string;
}

/** Short operational packet text (facility comms, not chat). */
export function deriveOperatorPacket(
  operator: Operator,
  behavior: InhabitantBehavior,
  placementSector: SectorId,
  operational: OperationalSnapshot | null,
): string | null {
  const derived = operational?.operators.find((o) => o.operatorId === operator.id);

  if (derived?.lastSignal) {
    return `${operator.callsign} → ${truncatePacket(derived.lastSignal)}`;
  }

  if (behavior.transitFrom && behavior.intensity !== "calm") {
    const from = SECTOR_LABEL[behavior.transitFrom];
    const to = SECTOR_LABEL[placementSector];
    return `${operator.callsign} → Transit ${from} → ${to}`;
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
  placementSector: SectorId,
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

  return {
    callsign: operator.callsign,
    sectorId: placementSector,
    sectorLabel: SECTOR_LABEL[placementSector],
    homeSectorId: operator.sectorId,
    task: derived?.currentActivity ?? behavior.stateLabel,
    activitySource: derived?.activeProjectName
      ? `${activitySource} · ${derived.activeProjectName}`
      : activitySource,
  };
}

function truncatePacket(text: string, max = 42): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}
