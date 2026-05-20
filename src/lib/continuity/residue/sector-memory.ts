import type { ContinuityEventView, ContinuityEventKind } from "@/lib/continuity/events/types";
import type { SectorHeatView } from "@/data/operational-types";
import type { SectorId } from "@/data/types";
import { ALL_SECTOR_IDS } from "@/lib/operations/taxonomy";
import { clamp01, decayedIntensity, toResidueTier } from "./decay";
import type { SectorResidueMemory } from "./types";

function emptyRaw() {
  return {
    glow: 0,
    density: 0,
    pressure: 0,
    saturation: 0,
    warmth: 0,
    flicker: 0,
    coolness: 0,
    pulseCadence: 0,
  };
}

function accumulateKind(
  raw: SectorResidueMemory["raw"],
  sectorId: SectorId,
  kind: ContinuityEventKind,
  amount: number,
): void {
  raw.glow += amount * 0.35;

  switch (kind) {
    case "deploy_published":
      if (sectorId === "forge") raw.warmth += amount * 0.55;
      if (sectorId === "relay") raw.glow += amount * 0.3;
      if (sectorId === "core") raw.saturation += amount * 0.25;
      break;
    case "deploy_blocked":
      if (sectorId === "relay" || sectorId === "core") raw.pressure += amount * 0.35;
      break;
    case "snapshot_refresh":
      if (sectorId === "core") raw.glow += amount * 0.4;
      if (sectorId === "archive") raw.density += amount * 0.35;
      break;
    case "archive_consolidation":
      if (sectorId === "archive") raw.density += amount * 0.65;
      break;
    case "edit_wave":
      if (sectorId === "forge") raw.warmth += amount * 0.4;
      if (sectorId === "archive") raw.density += amount * 0.3;
      break;
    case "observatory_scan":
      if (sectorId === "observatory") raw.density += amount * 0.5;
      break;
    case "runtime_signal":
    case "infrastructure_change":
      if (sectorId === "runtime") raw.flicker += amount * 0.7;
      if (sectorId === "relay") raw.pressure += amount * 0.35;
      break;
    default:
      break;
  }
}

function dominantKindForSector(
  sectorId: SectorId,
  events: ContinuityEventView[],
): ContinuityEventKind | null {
  let best: { kind: ContinuityEventKind; score: number } | null = null;
  for (const ev of events) {
    if (!ev.sectors.includes(sectorId)) continue;
    const score = decayedIntensity(ev.occurredAt, ev.importance);
    if (!best || score > best.score) best = { kind: ev.kind, score };
  }
  return best?.score && best.score > 0.08 ? best.kind : null;
}

export function buildSectorMemory(
  events: ContinuityEventView[],
  heatBySector: Map<SectorId, SectorHeatView>,
): Record<SectorId, SectorResidueMemory> {
  const result = {} as Record<SectorId, SectorResidueMemory>;

  for (const sectorId of ALL_SECTOR_IDS) {
    const raw = emptyRaw();
    let eventHits = 0;

    for (const ev of events) {
      if (!ev.sectors.includes(sectorId)) continue;
      const amount = decayedIntensity(ev.occurredAt, ev.importance);
      if (amount < 0.03) continue;
      eventHits += 1;
      accumulateKind(raw, sectorId, ev.kind, amount);
    }

    const heat = heatBySector.get(sectorId);
    const heatNorm = clamp01((heat?.activityScore ?? 0) / 100);
    const loadNorm = clamp01((heat?.operationalLoad ?? 0) / 5);

    raw.pressure = clamp01(raw.pressure * 0.55 + heatNorm * 0.35 + loadNorm * 0.25);
    raw.pulseCadence = clamp01(raw.pressure * 0.7 + eventHits * 0.04);
    raw.saturation = clamp01(raw.saturation + heatNorm * 0.2);

    const activity = heat?.activityLevel ?? "idle";
    if (activity === "idle" && heatNorm < 0.12 && eventHits === 0) {
      raw.coolness = clamp01(0.35 + (1 - heatNorm) * 0.4);
    } else if (activity === "idle") {
      raw.coolness = clamp01(0.15);
    } else {
      raw.coolness = clamp01(Math.max(0, 0.2 - heatNorm * 0.25));
    }

    for (const key of Object.keys(raw) as (keyof typeof raw)[]) {
      raw[key] = clamp01(raw[key]);
    }

    result[sectorId] = {
      sectorId,
      glow: toResidueTier(raw.glow),
      density: toResidueTier(raw.density),
      pressure: toResidueTier(raw.pressure),
      saturation: toResidueTier(raw.saturation),
      warmth: toResidueTier(raw.warmth),
      flicker: toResidueTier(raw.flicker),
      coolness: toResidueTier(raw.coolness),
      pulseCadence: toResidueTier(raw.pulseCadence),
      dominantKind: dominantKindForSector(sectorId, events),
      raw,
    };
  }

  return result;
}
