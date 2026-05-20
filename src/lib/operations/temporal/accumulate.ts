import type { SectorId } from "@/data/types";
import type { RawScannedProject } from "@/lib/localData/scanners";
import { ALL_SECTOR_IDS } from "@/lib/operations/taxonomy";
import type { OperationalSignal } from "../types";
import {
  resolveProjectionSector,
  secondarySectorsForSignal,
} from "../signalSectorRouting";
import { decayAtAge, ageHoursFromTimestamp } from "./decay";
import {
  BLEND_HISTORICAL,
  BLEND_SUSTAINED,
  BLEND_TRANSIENT,
  SIGNAL_DECAY_HALF_LIFE_HOURS,
  SUSTAINED_WINDOW_HOURS,
  TRANSIENT_WINDOW_HOURS,
} from "./constants";
import { rollingSectorMomentum, type TimedContribution } from "./momentum";
import { signalBaseWeight } from "./recency";
import { classifySectorActivity } from "./classify";
import type { SectorTemporalState, TemporalContinuityModel } from "./types";

function emptySectorRecord<T>(fill: T): Record<SectorId, T> {
  const o = {} as Record<SectorId, T>;
  for (const id of ALL_SECTOR_IDS) o[id] = fill;
  return o;
}

function structuralBaselineForSector(
  projects: RawScannedProject[],
  sectorId: SectorId,
): number {
  const inSector = projects.filter((p) => p.sectorClassification === sectorId);
  if (inSector.length === 0) return 0;
  const score = inSector.reduce((n, p) => n + p.activityScore, 0);
  return Math.min(40, Math.round(score / Math.max(1, inSector.length) / 2.5));
}

interface SectorBuckets {
  contributions: TimedContribution[];
}

function emptyBuckets(): Record<SectorId, SectorBuckets> {
  const o = {} as Record<SectorId, SectorBuckets>;
  for (const id of ALL_SECTOR_IDS) {
    o[id] = { contributions: [] };
  }
  return o;
}

/** Accumulate decay-weighted contributions per sector from real signals */
export function accumulateSignalPressure(
  signals: OperationalSignal[],
  referenceMs: number,
): Record<
  SectorId,
  {
    transient: number;
    sustained: number;
    historical: number;
    momentum: number;
  }
> {
  const buckets = emptyBuckets();

  for (const s of signals) {
    const age = ageHoursFromTimestamp(s.timestamp, referenceMs);
    const base = signalBaseWeight(s, referenceMs);
    if (base <= 0) continue;

    const primary = resolveProjectionSector(s);
    const targets = [primary, ...secondarySectorsForSignal(s)];

    for (const sectorId of targets) {
      const mult = sectorId === primary ? 1 : 0.28;
      buckets[sectorId].contributions.push({
        ageHours: age,
        base: base * mult,
      });
    }
  }

  const out = emptySectorRecord({
    transient: 0,
    sustained: 0,
    historical: 0,
    momentum: 0,
  });

  for (const sectorId of ALL_SECTOR_IDS) {
    const { contributions } = buckets[sectorId];
    let transient = 0;
    let sustained = 0;
    let historical = 0;

    for (const { ageHours, base } of contributions) {
      const d = decayAtAge(ageHours, SIGNAL_DECAY_HALF_LIFE_HOURS);
      const w = base * d;
      historical += w;
      if (ageHours <= SUSTAINED_WINDOW_HOURS) sustained += w;
      if (ageHours <= TRANSIENT_WINDOW_HOURS) transient += w;
    }

    out[sectorId] = {
      transient,
      sustained,
      historical,
      momentum: rollingSectorMomentum(
        contributions,
        SIGNAL_DECAY_HALF_LIFE_HOURS,
      ),
    };
  }

  return out;
}

export function deriveTemporalContinuity(
  signals: OperationalSignal[],
  projects: RawScannedProject[],
  referenceMs: number = Date.now(),
): TemporalContinuityModel {
  const accumulated = accumulateSignalPressure(signals, referenceMs);
  const sectors = {} as Record<SectorId, SectorTemporalState>;
  const environmentalPressure = emptySectorRecord(0);
  const historicalPressure = emptySectorRecord(0);
  const sectorMomentum = emptySectorRecord(0);
  const sectorActivityClass = emptySectorRecord<SectorTemporalState["activityClass"]>("dormant");
  const dormantSectors: SectorId[] = [];
  const structurallyActiveSectors: SectorId[] = [];

  for (const sectorId of ALL_SECTOR_IDS) {
    const acc = accumulated[sectorId];
    const structuralBaseline = structuralBaselineForSector(projects, sectorId);

    const environmental =
      acc.historical * BLEND_HISTORICAL +
      acc.sustained * BLEND_SUSTAINED +
      acc.transient * BLEND_TRANSIENT;

    const activityClass = classifySectorActivity({
      sectorId,
      transientPressure: acc.transient,
      sustainedPressure: acc.sustained,
      historicalPressure: acc.historical,
      structuralBaseline,
      environmentalPressure: environmental,
    });

    sectors[sectorId] = {
      sectorId,
      activityClass,
      transientPressure: acc.transient,
      sustainedPressure: acc.sustained,
      historicalPressure: acc.historical,
      momentum: acc.momentum,
      structuralBaseline,
      environmentalPressure: environmental,
    };

    environmentalPressure[sectorId] = environmental;
    historicalPressure[sectorId] = acc.historical;
    sectorMomentum[sectorId] = acc.momentum;
    sectorActivityClass[sectorId] = activityClass;

    if (activityClass === "dormant") dormantSectors.push(sectorId);
    if (activityClass === "structurally_active") {
      structurallyActiveSectors.push(sectorId);
    }
  }

  return {
    referenceTime: new Date(referenceMs).toISOString(),
    sectors,
    environmentalPressure,
    historicalPressure,
    sectorMomentum,
    sectorActivityClass,
    dormantSectors,
    structurallyActiveSectors,
  };
}
