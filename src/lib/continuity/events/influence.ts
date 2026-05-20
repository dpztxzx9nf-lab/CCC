import type { ContinuityEventView, EventImportance } from "./types";
import type { SectorHeatView } from "@/data/operational-types";
import type { SectorId } from "@/data/types";
import type { OperatorId } from "@/lib/operations/taxonomy";
import {
  getChamberActivity,
  getFacilityPulse,
  type ChamberActivity,
} from "@/lib/chamber-atmosphere";

const IMPORTANCE_WEIGHT: Record<EventImportance, number> = {
  low: 4,
  medium: 10,
  high: 18,
  critical: 28,
};

export function eventAgeHours(occurredAt: string): number {
  const t = Date.parse(occurredAt);
  if (Number.isNaN(t)) return Infinity;
  return (Date.now() - t) / (1000 * 60 * 60);
}

function decayFactor(ageHours: number): number {
  if (ageHours <= 1) return 1;
  if (ageHours <= 6) return 0.85;
  if (ageHours <= 24) return 0.55;
  if (ageHours <= 72) return 0.3;
  return 0.12;
}

/** Recency-weighted boost (0–24) for sector heat visualization */
export function sectorEventBoost(
  sectorId: SectorId,
  events: ContinuityEventView[],
): number {
  let boost = 0;
  for (const ev of events) {
    if (!ev.sectors.includes(sectorId)) continue;
    const age = eventAgeHours(ev.occurredAt);
    if (age > 96) continue;
    boost += IMPORTANCE_WEIGHT[ev.importance] * decayFactor(age);
  }
  return Math.min(24, Math.round(boost));
}

export function effectiveActivityScore(
  heat: SectorHeatView | undefined,
  sectorId: SectorId,
  events: ContinuityEventView[],
): number {
  const base = heat?.activityScore ?? 0;
  return Math.min(100, base + sectorEventBoost(sectorId, events));
}

export function getEffectiveChamberActivity(
  heat: SectorHeatView | undefined,
  sectorId: SectorId,
  events: ContinuityEventView[],
): ChamberActivity {
  const score = effectiveActivityScore(heat, sectorId, events);
  if (score <= 4) return "idle";
  if (score >= 52) return "high";
  if (score >= 20) return "medium";
  return "low";
}

export function getFacilityPulseWithEvents(
  heatList: SectorHeatView[],
  events: ContinuityEventView[],
): ReturnType<typeof getFacilityPulse> & { eventSectors: SectorId[] } {
  const base = getFacilityPulse(heatList);
  const eventSectors: SectorId[] = [];

  for (const h of heatList) {
    const boost = sectorEventBoost(h.sectorId, events);
    if (boost >= 12 && !eventSectors.includes(h.sectorId)) {
      eventSectors.push(h.sectorId);
    }
  }

  const hotSectors = [...new Set([...base.hotSectors, ...eventSectors])] as SectorId[];

  let focusSector = base.focusSector as SectorId | null;
  if (events.length > 0) {
    const recent = events[0];
    if (recent && eventAgeHours(recent.occurredAt) < 12) {
      focusSector = recent.sectors[0] ?? focusSector;
    }
  }

  return { ...base, hotSectors, focusSector, eventSectors };
}

export function eventsForSector(
  sectorId: SectorId,
  events: ContinuityEventView[],
  limit = 5,
): ContinuityEventView[] {
  return events
    .filter((e) => e.sectors.includes(sectorId))
    .slice(0, limit);
}

export function eventsForOperator(
  operatorId: string,
  events: ContinuityEventView[],
  limit = 5,
): ContinuityEventView[] {
  return events
    .filter((e) => e.operators.includes(operatorId as OperatorId))
    .slice(0, limit);
}

export function formatEventTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const ageH = eventAgeHours(iso);
  if (ageH < 1) return "now";
  if (ageH < 24) return `${Math.round(ageH)}h`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function kindLabel(kind: ContinuityEventView["kind"]): string {
  return kind.replace(/_/g, " ");
}

/** Recent high-signal kinds for transit pulses */
export function activeEventPulseKinds(
  events: ContinuityEventView[],
): ContinuityEventView["kind"][] {
  return events
    .filter((e) => {
      const age = eventAgeHours(e.occurredAt);
      if (age > 8) return false;
      return (
        e.kind === "deploy_published" ||
        e.kind === "snapshot_refresh" ||
        e.kind === "edit_wave" ||
        e.kind === "runtime_signal"
      );
    })
    .slice(0, 3)
    .map((e) => e.kind);
}

export interface OperatorEventHint {
  stateLabel: string;
  intensityBoost: boolean;
}

export function operatorEventHint(
  operatorId: string,
  events: ContinuityEventView[],
): OperatorEventHint | null {
  const recent = eventsForOperator(operatorId, events, 1)[0];
  if (!recent || eventAgeHours(recent.occurredAt) > 18) return null;

  return {
    stateLabel: recent.title,
    intensityBoost: recent.importance === "high" || recent.importance === "critical",
  };
}
