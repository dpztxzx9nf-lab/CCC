import type { OperationalHistoryEventView } from "@/data/operational-types";
import type { ChamberId, OperationalDomainId } from "@/data/ecology";
import { DOMAIN_TO_HOME_CHAMBER } from "@/data/ecology";
import type { SignalIntensity, SignalRouteSpec } from "@/lib/signal-routes";

export type HistoryEnvironmentMode = "emergence" | "cooling" | "runtime" | "pressure";

export interface HistorySectorProjection {
  boost: number;
  mode: HistoryEnvironmentMode;
  strength: number;
}

export interface HistoryCaptionProjection {
  id: string;
  text: string;
  chamberId: ChamberId;
}

export interface HistoryEnvironmentalProjection {
  sectors: Partial<Record<OperationalDomainId, HistorySectorProjection>>;
  signalRoutes: SignalRouteSpec[];
  transitRoutes: SignalRouteSpec[];
  infrastructurePulse: boolean;
  caption: HistoryCaptionProjection | null;
  motionRemainingMs: number;
}

const HISTORY_WINDOW_MS = 30 * 60 * 1000;
const CAPTION_WINDOW_MS = 90 * 1000;

const ROUTE_FROM: Partial<Record<string, OperationalDomainId>> = {
  PROJECT_EMERGED: "observatory",
  PROJECT_REACTIVATED: "archive",
  PROJECT_DORMANT: "archive",
  RUNTIME_ESCALATION: "core",
  CONTINUITY_ACCELERATION: "core",
  OPERATOR_PRESSURE_SHIFT: "core",
};

function severityBase(severity: OperationalHistoryEventView["severity"]): number {
  if (severity === "high") return 1;
  if (severity === "medium") return 0.72;
  return 0.42;
}

function eventStrength(event: OperationalHistoryEventView, now: number): number {
  const created = Date.parse(event.createdAt);
  if (Number.isNaN(created)) return 0;
  const age = Math.max(0, now - created);
  if (age > HISTORY_WINDOW_MS) return 0;
  const remaining = 1 - age / HISTORY_WINDOW_MS;
  return Math.max(0, severityBase(event.severity) * remaining * remaining);
}

function eventRemainingMs(event: OperationalHistoryEventView, now: number): number {
  const created = Date.parse(event.createdAt);
  if (Number.isNaN(created)) return 0;
  return Math.max(0, created + HISTORY_WINDOW_MS - now);
}

function routeIntensity(strength: number): SignalIntensity {
  if (strength >= 0.55) return "high";
  if (strength >= 0.24) return "medium";
  return "low";
}

function projectionMode(type: string): HistoryEnvironmentMode {
  if (type === "PROJECT_DORMANT" || type === "SECTOR_PRESSURE_DECREASED") {
    return "cooling";
  }
  if (type === "RUNTIME_ESCALATION") return "runtime";
  if (type === "PROJECT_EMERGED" || type === "PROJECT_REACTIVATED") {
    return "emergence";
  }
  return "pressure";
}

function addSectorProjection(
  sectors: Partial<Record<OperationalDomainId, HistorySectorProjection>>,
  sector: OperationalDomainId,
  event: OperationalHistoryEventView,
  strength: number,
): void {
  const current = sectors[sector];
  const boost = Math.round(strength * (event.type === "PROJECT_DORMANT" ? 5 : 12));
  if (current && current.strength >= strength) {
    current.boost = Math.max(current.boost, boost);
    return;
  }
  sectors[sector] = {
    boost,
    mode: projectionMode(event.type),
    strength,
  };
}

function chamberForDomain(domain: OperationalDomainId): ChamberId {
  return DOMAIN_TO_HOME_CHAMBER[domain];
}

function routeForEvent(
  event: OperationalHistoryEventView,
  strength: number,
): SignalRouteSpec | null {
  const fromDomain = ROUTE_FROM[event.type] ?? "core";
  const toDomain =
    event.type === "PROJECT_DORMANT" ? "archive" : event.sector;
  const from = chamberForDomain(fromDomain);
  const to = chamberForDomain(toDomain);
  if (!from || !to || from === to) return null;
  return {
    id: `history-${event.id}-${from}-${to}`,
    from,
    to,
    intensity: routeIntensity(strength),
  };
}

function captionForEvent(
  event: OperationalHistoryEventView,
  now: number,
): HistoryCaptionProjection | null {
  const created = Date.parse(event.createdAt);
  if (Number.isNaN(created) || now - created > CAPTION_WINDOW_MS) return null;
  const chamberId = chamberForDomain(event.sector);
  const label = event.type.toLowerCase().replace(/_/g, " ");
  return {
    id: `history-caption-${event.id}`,
    text: label,
    chamberId,
  };
}

export function deriveHistoryEnvironmentalProjection(
  events: readonly OperationalHistoryEventView[] | undefined,
  now: number,
): HistoryEnvironmentalProjection {
  const sectors: Partial<Record<OperationalDomainId, HistorySectorProjection>> = {};
  const signalRoutes: SignalRouteSpec[] = [];
  const transitRoutes: SignalRouteSpec[] = [];
  let infrastructurePulse = false;
  let caption: HistoryCaptionProjection | null = null;
  let motionRemainingMs = 0;
  const routeIds = new Set<string>();

  for (const event of events ?? []) {
    const strength = eventStrength(event, now);
    if (strength <= 0.06) continue;
    addSectorProjection(sectors, event.sector, event, strength);
    motionRemainingMs = Math.max(motionRemainingMs, eventRemainingMs(event, now));

    if (
      event.type === "RUNTIME_ESCALATION" ||
      event.type === "SECTOR_PRESSURE_INCREASED" ||
      event.type === "CONTINUITY_ACCELERATION"
    ) {
      infrastructurePulse = true;
    }

    const route = routeForEvent(event, strength);
    if (route && !routeIds.has(route.id)) {
      routeIds.add(route.id);
      if (
        event.type === "PROJECT_EMERGED" ||
        event.type === "PROJECT_REACTIVATED" ||
        event.type === "PROJECT_DORMANT"
      ) {
        signalRoutes.push(route);
      } else {
        transitRoutes.push(route);
      }
    }

    caption ??= captionForEvent(event, now);
  }

  return {
    sectors,
    signalRoutes: signalRoutes.slice(0, 3),
    transitRoutes: transitRoutes.slice(0, 3),
    infrastructurePulse,
    caption,
    motionRemainingMs,
  };
}
