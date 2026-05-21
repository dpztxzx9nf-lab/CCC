import type { ChamberId, OperationalDomainId } from "@/data/ecology";

export type OperatorSectorTone = OperationalDomainId;

/** Map chamber placement to sector tone for card accents. */
export function sectorToneFromDomain(
  domain: OperationalDomainId,
): OperatorSectorTone {
  return domain;
}

export function chamberToSectorTone(chamberId: ChamberId): OperatorSectorTone {
  const map: Record<ChamberId, OperationalDomainId> = {
    foundry: "forge",
    "deep-stack": "archive",
    "live-grid": "runtime",
    "signal-bridge": "relay",
    "observation-deck": "observatory",
    "nexus-prime": "core",
  };
  return map[chamberId] ?? "core";
}

const POSTURE_STATE: Record<string, string> = {
  anchored: "ANCHORED",
  focused: "FOCUSED",
  coordinating: "COORDINATING",
  building: "BUILDING",
  monitoring: "MONITORING",
  archiving: "ARCHIVING",
  reviewing: "REVIEWING",
  relaying: "RELAYING",
  scouting: "SCOUTING",
};

/** Uppercase operational posture for hover state line. */
export function formatOperatorHoverState(posture: string): string {
  const key = posture.trim().toLowerCase();
  return POSTURE_STATE[key] ?? key.replace(/-/g, " ").toUpperCase();
}

import {
  classifySubstrateSignal,
  interpretHoverAwareness,
} from "@/lib/operator-interpretation";

/**
 * Sector-lensed hover activity (delegates to OperatorInterpretationProfile).
 */
export function formatOperatorHoverActivity(
  raw: string,
  sector: OperatorSectorTone,
  chamberLabel: string,
  operatorId = "",
): string {
  const classified = classifySubstrateSignal(null, raw, null);
  return interpretHoverAwareness(operatorId, sector, classified, chamberLabel).activity;
}

/** @deprecated Use formatOperatorHoverActivity */
export const formatOperatorHoverTask = formatOperatorHoverActivity;

/** Sector-lensed signal cause (delegates to OperatorInterpretationProfile). */
export function formatOperatorHoverCause(
  lastSignal: string | null,
  rawActivity: string,
  projectName: string | null,
  sector: OperatorSectorTone = "core",
  operatorId = "",
  chamberLabel = "",
): string | null {
  const classified = classifySubstrateSignal(lastSignal, rawActivity, projectName);
  return interpretHoverAwareness(
    operatorId,
    sector,
    classified,
    chamberLabel,
  ).cause;
}

export interface HoverMetricsInput {
  facilityNow: number;
  scannedAt: string | null;
  lastSync: string;
  workload: number;
  operationalEnabled: boolean;
  hasSnapshot: boolean;
}

/** Recency · load (and confidence when meaningful). */
export function formatOperatorHoverMetrics(input: HoverMetricsInput): string {
  const recency = formatHoverRecency(
    input.facilityNow,
    input.scannedAt ?? input.lastSync,
  );
  const load = formatHoverLoad(input.workload);
  const confidence = formatHoverConfidence(input);

  if (confidence) {
    return `${recency} · ${load} · ${confidence}`;
  }
  return `${recency} · ${load}`;
}

function formatHoverRecency(facilityNow: number, iso: string | null): string {
  if (!iso) return "timing unknown";
  const ms = facilityNow - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "just now";
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) {
    const m = Math.max(1, Math.round(ms / 60_000));
    return `${m}m ago`;
  }
  if (ms < 86_400_000) {
    const h = Math.max(1, Math.round(ms / 3_600_000));
    return `${h}h ago`;
  }
  const d = Math.max(1, Math.round(ms / 86_400_000));
  return `${d}d ago`;
}

function formatHoverLoad(workload: number): string {
  if (workload >= 55) return "high load";
  if (workload >= 28) return "medium load";
  if (workload > 0) return "low load";
  return "idle load";
}

function formatHoverConfidence(input: HoverMetricsInput): string | null {
  if (!input.operationalEnabled) return null;
  const anchor = input.scannedAt ?? input.lastSync;
  const ms = input.facilityNow - new Date(anchor).getTime();
  if (input.hasSnapshot && ms < 300_000) return "high confidence";
  if (input.operationalEnabled && ms < 3_600_000) return "established";
  return null;
}

/** Quieter source line — dossier only; retained for legacy callers. */
export function formatOperatorHoverSource(
  raw: string,
  sector: OperatorSectorTone,
): string {
  const s = raw.trim();
  if (!s || /^profile baseline$/i.test(s)) {
    return "Facility registry";
  }
  if (/^local continuity$/i.test(s)) {
    return "Local continuity scan";
  }
  if (/archivist/i.test(s) && /snapshot/i.test(s)) {
    return "ARCHIVIST continuity sweep";
  }
  if (/operational map/i.test(s)) {
    return "Operational continuity map";
  }
  if (/snapshot/i.test(s)) {
    return s.replace(/\bsnapshot\b/i, "continuity snapshot");
  }

  const parts = s.split(" · ");
  const head = parts[0] ?? s;
  const tail = parts.slice(1).join(" · ");
  let headOut = head
    .replace(/^Profile baseline$/i, "Facility registry")
    .replace(/^Local continuity$/i, "Local continuity scan")
    .replace(/^Operational map$/i, "Operational continuity map");

  if (/ARCHIVIST/i.test(headOut)) {
    headOut = "ARCHIVIST continuity sweep";
  }

  if (!tail) return headOut;
  return `${headOut} · ${tail}`;
}

/** Compact chamber/domain context — no encoded debug strings. */
export function formatOperatorHoverContext(
  domainLabel: string,
  chamberName: string,
): string {
  const domain = domainLabel.trim();
  const chamber = chamberName.trim();
  if (!domain && !chamber) return "";
  if (!chamber) return domain;
  if (!domain) return chamber;
  return `${domain} · ${chamber}`;
}

/** True when activity indicates live operational signal (enables restrained pulse). */
export function operatorHoverHasLiveSignal(activity: string): boolean {
  const t = activity.trim().toLowerCase();
  if (!t) return false;
  if (t.includes("no active local signals")) return false;
  if (t.includes("standby")) return false;
  if (t.includes("profile")) return false;
  return true;
}
