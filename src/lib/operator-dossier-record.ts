import type { InhabitantBehavior } from "@/data/inhabitant-types";
import type { OperationalSnapshot } from "@/data/operational-types";
import type { Operator } from "@/data/types";
import type { OperatorPlacement } from "@/data/ecology";
import { CHAMBER_BY_ID, DOMAIN_BY_ID } from "@/data/ecology";
import type { ContinuityEventView } from "@/lib/continuity/events/types";
import { eventsForOperator } from "@/lib/continuity/events/influence";
import type { OperatorOperationalView } from "@/data/operational-types";
import { scoreToActivityLevel } from "@/lib/operations/taxonomy";

export interface DossierSignalEntry {
  id: string;
  label: string;
  detail: string | null;
  at: string;
}

export interface OperatorDossierRecord {
  operatorId: string;
  callsign: string;
  designation: string;
  role: string;
  status: Operator["status"];
  homeChamber: string;
  currentChamber: string;
  primaryDomain: string;
  isTransit: boolean;
  currentAssignment: string | null;
  semanticSummary: string;
  lastSync: string;
  objectives: string[];
  linkedProjectNames: string[];
  signalHistory: DossierSignalEntry[];
  continuityEventCount: number;
  domainPressure: {
    activityLevel: string;
    operationalLoad: number;
    dominantActivity: string | null;
  } | null;
  movementNote: string;
  telemetryHints: string[];
}

export function buildOperatorDossierRecord(
  operator: Operator,
  placement: OperatorPlacement,
  behavior: InhabitantBehavior,
  operational: OperationalSnapshot | null,
  continuityEvents: ContinuityEventView[],
  linkedProjectNames: string[],
): OperatorDossierRecord {
  const derived = operational?.operators.find((o) => o.operatorId === operator.id);
  const home = CHAMBER_BY_ID[placement.homeChamberId];
  const current = CHAMBER_BY_ID[placement.currentChamberId];
  const domain = DOMAIN_BY_ID[placement.primaryDomain];
  const heat = operational?.sectorHeat.find((h) => h.sectorId === placement.primaryDomain);

  const signalHistory = buildSignalHistory(operator.id, derived, continuityEvents);

  const movementNote = placement.isTransit
    ? `In transit — present at ${current?.name ?? placement.currentChamberId}, home ${home?.name ?? placement.homeChamberId}`
    : placement.currentChamberId === placement.homeChamberId
      ? `Anchored at ${home?.name ?? placement.homeChamberId}`
      : `Assigned to ${current?.name ?? placement.currentChamberId} (home ${home?.name ?? placement.homeChamberId})`;

  const telemetryHints: string[] = [];
  if (operational?.telemetry?.length) {
    const related = operational.telemetry.filter(
      (t) =>
        t.hint?.toLowerCase().includes(operator.id) ||
        t.label.toLowerCase().includes(placement.primaryDomain),
    );
    telemetryHints.push(
      ...related.slice(0, 4).map((t) => `${t.label}: ${t.value}`),
    );
  }
  if (derived?.activeProjectName) {
    telemetryHints.push(`Active project signal: ${derived.activeProjectName}`);
  }

  return {
    operatorId: operator.id,
    callsign: operator.callsign,
    designation: operator.designation,
    role: operator.role,
    status: operator.status,
    homeChamber: home?.name ?? placement.homeChamberId,
    currentChamber: current?.name ?? placement.currentChamberId,
    primaryDomain: domain?.name ?? placement.primaryDomain,
    isTransit: placement.isTransit,
    currentAssignment:
      derived?.currentAssignment ?? behavior.purpose ?? operator.currentActivity,
    semanticSummary: operator.dossier.summary,
    lastSync: operator.dossier.lastSync,
    objectives: operator.dossier.objectives,
    linkedProjectNames,
    signalHistory,
    continuityEventCount: eventsForOperator(operator.id, continuityEvents, 50).length,
    domainPressure: heat
      ? {
          activityLevel: scoreToActivityLevel(heat.activityScore),
          operationalLoad: heat.operationalLoad,
          dominantActivity: heat.dominantActivity,
        }
      : null,
    movementNote,
    telemetryHints,
  };
}

function buildSignalHistory(
  operatorId: string,
  derived: OperatorOperationalView | undefined,
  continuityEvents: ContinuityEventView[],
): DossierSignalEntry[] {
  const entries: DossierSignalEntry[] = [];

  if (derived?.lastSignal?.trim()) {
    entries.push({
      id: "op-last-signal",
      label: "Latest operational signal",
      detail: derived.lastSignal,
      at: new Date().toISOString(),
    });
  }

  for (const ev of eventsForOperator(operatorId, continuityEvents, 8)) {
    entries.push({
      id: ev.id,
      label: ev.title,
      detail: ev.summary,
      at: ev.occurredAt,
    });
  }

  return entries;
}
