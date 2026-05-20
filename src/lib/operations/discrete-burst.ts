import type { ContinuityEventView } from "@/lib/continuity/events/types";
import type { ChamberId, OperationalDomainId } from "@/data/ecology";
import { DOMAIN_TO_HOME_CHAMBER } from "@/data/ecology";
import type { OperatorId } from "@/lib/operations/taxonomy";
import type { SignalIntensity, SignalRouteSpec } from "@/lib/signal-routes";

function chamberForOperationalDomain(domain: OperationalDomainId): ChamberId {
  const map: Record<OperationalDomainId, ChamberId> = {
    core: "nexus-prime",
    archive: "deep-stack",
    forge: "foundry",
    observatory: "observation-deck",
    relay: "signal-bridge",
    runtime: "live-grid",
  };
  return map[domain];
}

/** Extra ms after occurredAt for high-signal kinds. */
const KIND_TAIL_MS: Partial<Record<ContinuityEventView["kind"], number>> = {
  deploy_published: 45_000,
  deploy_blocked: 40_000,
  snapshot_refresh: 35_000,
  runtime_signal: 35_000,
  observatory_scan: 30_000,
  archive_consolidation: 30_000,
  infrastructure_change: 28_000,
  sector_activity: 12_000,
  edit_wave: 25_000,
};

function importanceWindowMs(imp: ContinuityEventView["importance"]): number {
  switch (imp) {
    case "critical":
      return 90_000;
    case "high":
      return 75_000;
    case "medium":
      return 45_000;
    case "low":
      return 18_000;
    default:
      return 18_000;
  }
}

/** End of discrete visual window for one event (wall clock ms). */
export function discreteEventBurstEndMs(ev: ContinuityEventView): number {
  const t = Date.parse(ev.occurredAt);
  if (Number.isNaN(t)) return 0;
  return t + importanceWindowMs(ev.importance) + (KIND_TAIL_MS[ev.kind] ?? 0);
}

export interface DiscreteBurstInput {
  continuityEvents: ContinuityEventView[];
  /** Client clock when snapshot meta `generatedAt` last changed — not static file time. */
  snapshotBumpAt: number | null;
  placementBumpAt: number | null;
  scanBumpAt: number | null;
  /**
   * Operational source is mock seed — avoid simulated placement/scan pulses when there
   * are no persisted continuity events (facility should read idle).
   */
  suppressDiscreteMock: boolean;
}

export interface DiscreteBurstState {
  burstUntil: number;
  discreteActive: boolean;
  intensity: number;
  /** Newest event still inside its window, if any — drives event-attributed routes. */
  anchorEvent: ContinuityEventView | null;
  /** Short window after a measured placement signature change (embodiment cues). */
  placementPulseActive: boolean;
  /** Short window for yellow path beads + dash motion — stricter than discreteActive. */
  transitMotionActive: boolean;
  /** Ms remaining on transit motion window (for finite SVG repeats). */
  transitMotionRemainingMs: number;
}

const PLACEMENT_TAIL_MS = 48_000;
const SCAN_TAIL_MS = 42_000;
const SNAPSHOT_TAIL_MS = 50_000;
/** Moving beads / live dash flow — brief onset only, not whole event/comms window. */
const TRANSIT_MOTION_TAIL_MS = 22_000;

function bumpMotionEnd(bumpAt: number | null): number {
  return bumpAt != null ? bumpAt + TRANSIT_MOTION_TAIL_MS : 0;
}

function eventTransitMotionEnd(ev: ContinuityEventView): number {
  const t = Date.parse(ev.occurredAt);
  if (Number.isNaN(t)) return 0;
  const tail =
    ev.importance === "critical"
      ? 28_000
      : ev.importance === "high"
        ? 24_000
        : 18_000;
  return t + tail;
}

function pickLiveAnchorEvent(
  events: ContinuityEventView[],
  now: number,
): ContinuityEventView | null {
  for (const ev of events) {
    if (now < discreteEventBurstEndMs(ev)) return ev;
  }
  return null;
}

/**
 * Gate for packets, animated data routes, live transit motion, infra event flash.
 * Does not gate residue, anchors, or chamber ambience.
 */
export function computeDiscreteBurstState(
  now: number,
  input: DiscreteBurstInput,
): DiscreteBurstState {
  const idleMock =
    input.suppressDiscreteMock && input.continuityEvents.length === 0;

  let burstUntil = 0;
  for (const ev of input.continuityEvents) {
    burstUntil = Math.max(burstUntil, discreteEventBurstEndMs(ev));
  }

  if (!idleMock && input.snapshotBumpAt != null) {
    burstUntil = Math.max(burstUntil, input.snapshotBumpAt + SNAPSHOT_TAIL_MS);
  }

  if (!idleMock && input.placementBumpAt != null) {
    burstUntil = Math.max(burstUntil, input.placementBumpAt + PLACEMENT_TAIL_MS);
  }

  if (!idleMock && input.scanBumpAt != null) {
    burstUntil = Math.max(burstUntil, input.scanBumpAt + SCAN_TAIL_MS);
  }

  const discreteActive = now < burstUntil;
  const remaining = Math.max(0, burstUntil - now);
  const intensity = !discreteActive ? 0 : Math.min(1, remaining / 60_000);

  const anchorEvent = pickLiveAnchorEvent(input.continuityEvents, now);

  const placementPulseActive =
    !idleMock &&
    input.placementBumpAt != null &&
    now < input.placementBumpAt + PLACEMENT_TAIL_MS;

  let transitMotionUntil = 0;
  if (!idleMock) {
    transitMotionUntil = Math.max(
      transitMotionUntil,
      bumpMotionEnd(input.placementBumpAt),
      bumpMotionEnd(input.snapshotBumpAt),
      bumpMotionEnd(input.scanBumpAt),
    );
    for (const ev of input.continuityEvents) {
      transitMotionUntil = Math.max(transitMotionUntil, eventTransitMotionEnd(ev));
    }
  }

  const transitMotionRemainingMs = Math.max(0, transitMotionUntil - now);
  const transitMotionActive = transitMotionRemainingMs > 0;

  return {
    burstUntil,
    discreteActive,
    intensity,
    anchorEvent,
    placementPulseActive,
    transitMotionActive,
    transitMotionRemainingMs,
  };
}

export function operatorDiscreteEligible(
  operatorId: string,
  now: number,
  events: ContinuityEventView[],
): boolean {
  return events.some(
    (e) =>
      e.operators.includes(operatorId as OperatorId) &&
      now < discreteEventBurstEndMs(e),
  );
}

/** Data routes only while an event is inside its window — edges reflect attributed domains. */
export function deriveEventSignalRoutes(
  anchorEvent: ContinuityEventView | null,
  now: number,
): SignalRouteSpec[] {
  if (!anchorEvent || now >= discreteEventBurstEndMs(anchorEvent)) return [];

  const hub = chamberForOperationalDomain("core");
  const intensity: SignalIntensity =
    anchorEvent.importance === "critical" || anchorEvent.importance === "high"
      ? "high"
      : anchorEvent.importance === "medium"
        ? "medium"
        : "low";

  const domains = anchorEvent.sectors.length
    ? anchorEvent.sectors
    : (["core"] as OperationalDomainId[]);

  const routes: SignalRouteSpec[] = [];
  const seen = new Set<string>();

  for (const domain of domains) {
    const chamberId =
      DOMAIN_TO_HOME_CHAMBER[domain as OperationalDomainId] ??
      chamberForOperationalDomain(domain as OperationalDomainId);
    if (chamberId === hub) continue;
    const id = `${hub}-${chamberId}`;
    if (seen.has(id)) continue;
    seen.add(id);
    routes.push({ id, from: hub, to: chamberId, intensity });
  }

  return routes.slice(0, 5);
}
