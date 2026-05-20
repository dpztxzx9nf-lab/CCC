import type { SectorId } from "@/data/types";
import type { RawScannedProject } from "@/lib/localData/scanners";
import {
  ACTIVITY_SECTOR_MAP,
  ALL_SECTOR_IDS,
  scoreToActivityLevel,
  type ActivityKind,
} from "@/lib/operations/taxonomy";
import type {
  ContinuitySnapshotOperator,
  ContinuitySnapshotSectorHeat,
  ContinuitySnapshotSignal,
} from "@/lib/snapshot/types";
import { sectorPressureToHeatDelta } from "./deriveOperationalSnapshot";
import {
  resolveProjectionSector,
  secondarySectorsForSignal,
  signalTypeToActivityKind,
} from "./signalSectorRouting";
import type { TemporalContinuityModel } from "./temporal/types";
import { deriveTemporalContinuity } from "./temporal/accumulate";
import { operatorSectorPreferenceScore } from "./temporal/operatorPreference";
import { weightedSignalContribution } from "./temporal/recency";
import type { SemanticDerivationResult } from "./semantic/types";
import type { OperationalSignal } from "./types";

export { resolveProjectionSector, secondarySectorsForSignal, signalTypeToActivityKind } from "./signalSectorRouting";
export { deriveTemporalContinuity } from "./temporal/accumulate";
export type { TemporalContinuityModel, SectorActivityClass } from "./temporal/types";

const OPERATOR_SECTOR_OWNERSHIP: Record<string, SectorId[]> = {
  "nexus-7": ["core"],
  "deep-1": ["archive"],
  "fab-0": ["forge", "runtime"],
  "bcast-1": ["relay"],
  "scout-6": ["observatory", "core"],
};

const OPERATOR_CALLSIGNS: Record<string, string> = {
  "nexus-7": "NEXUS-7",
  "deep-1": "ARCHIVIST-0",
  "fab-0": "FAB-0",
  "bcast-1": "BCAST-1",
  "scout-6": "SCOUT-6",
};

function emptyPressure(): Record<SectorId, number> {
  const o = {} as Record<SectorId, number>;
  for (const id of ALL_SECTOR_IDS) o[id] = 0;
  return o;
}

/** @deprecated Use deriveTemporalContinuity — instant pressure without persistence */
export function deriveOperationalSignalPressure(
  signals: OperationalSignal[],
  referenceMs: number = Date.now(),
): Record<SectorId, number> {
  const pressure = emptyPressure();
  if (signals.length === 0) return pressure;

  for (const s of signals) {
    const w = weightedSignalContribution(s, referenceMs);
    if (w <= 0) continue;
    const primary = resolveProjectionSector(s);
    pressure[primary] += w;
    for (const sec of secondarySectorsForSignal(s)) {
      pressure[sec] += w * 0.28;
    }
  }

  return pressure;
}

export function mergeSectorPressure(
  ...layers: Record<SectorId, number>[]
): Record<SectorId, number> {
  const out = emptyPressure();
  for (const layer of layers) {
    for (const id of ALL_SECTOR_IDS) {
      out[id] += layer[id] ?? 0;
    }
  }
  return out;
}

function projectIdFromSignal(s: OperationalSignal): string | null {
  const m = s.metadata?.projectId;
  return typeof m === "string" && m.length > 0 ? m : null;
}

function findProject(
  projects: RawScannedProject[],
  projectId: string | null,
): RawScannedProject | undefined {
  if (!projectId) return undefined;
  return projects.find((p) => p.id === projectId || p.name === projectId);
}

/** Sector heat: scan baseline + temporal environmental pressure (decay + momentum) */
export function buildSectorHeatFromSignals(
  projects: RawScannedProject[],
  scanSignals: ContinuitySnapshotSignal[],
  temporal: TemporalContinuityModel,
  operationalSignals: OperationalSignal[],
  semanticEnvironmentalBoost?: Record<SectorId, number>,
): Record<SectorId, ContinuitySnapshotSectorHeat> {
  const referenceMs = Date.parse(temporal.referenceTime) || Date.now();
  const mergedEnv = mergeSectorPressure(
    temporal.environmentalPressure,
    semanticEnvironmentalBoost ?? emptyPressure(),
  );
  const operationalDelta = sectorPressureToHeatDelta(mergedEnv);
  const heat: Record<SectorId, ContinuitySnapshotSectorHeat> = {} as Record<
    SectorId,
    ContinuitySnapshotSectorHeat
  >;

  for (const sectorId of ALL_SECTOR_IDS) {
    const ts = temporal.sectors[sectorId];
    const inSector = projects.filter((p) => p.sectorClassification === sectorId);
    const scoreFromProjects = inSector.reduce((n, p) => n + p.activityScore, 0);
    const scanBoost = scanSignals
      .filter((s) => (ACTIVITY_SECTOR_MAP[s.kind] ?? []).includes(sectorId))
      .reduce((n, s) => n + s.weight, 0);

    const structuralBoost =
      ts?.activityClass === "structurally_active"
        ? Math.round((ts.structuralBaseline ?? 0) * 0.4)
        : 0;

    const activityScore = Math.min(
      100,
      Math.round(scoreFromProjects / 2 + scanBoost / 4) +
        Math.round(operationalDelta[sectorId] ?? 0) +
        structuralBoost,
    );

    const kinds = new Map<string, number>();
    for (const s of scanSignals) {
      if ((ACTIVITY_SECTOR_MAP[s.kind] ?? []).includes(sectorId)) {
        kinds.set(s.kind, (kinds.get(s.kind) ?? 0) + s.weight);
      }
    }
    for (const s of operationalSignals) {
      if (resolveProjectionSector(s) !== sectorId) continue;
      const kind = signalTypeToActivityKind(s.type);
      const w = Math.round(weightedSignalContribution(s, referenceMs) * 6);
      if (w > 0) kinds.set(kind, (kinds.get(kind) ?? 0) + w);
    }

    let dominantActivity: string | null = null;
    let max = 0;
    for (const [k, v] of kinds) {
      if (v > max) {
        max = v;
        dominantActivity = k;
      }
    }

    const projectsWithSignals = new Set(
      operationalSignals
        .filter((s) => resolveProjectionSector(s) === sectorId)
        .map((s) => projectIdFromSignal(s))
        .filter(Boolean),
    );

    heat[sectorId] = {
      activityScore,
      activityLevel: scoreToActivityLevel(activityScore),
      operationalLoad: Math.max(
        inSector.filter((p) => p.activityScore > 0).length,
        projectsWithSignals.size,
      ),
      dominantActivity,
    };
  }

  return heat;
}

/** Operator rows — prefer sectors with sustained pressure, not only newest spike */
export function buildOperatorsFromSignals(
  projects: RawScannedProject[],
  sectorHeat: Record<SectorId, ContinuitySnapshotSectorHeat>,
  operationalSignals: OperationalSignal[],
  temporal: TemporalContinuityModel,
  semantic?: SemanticDerivationResult,
): ContinuitySnapshotOperator[] {
  const referenceMs = Date.parse(temporal.referenceTime) || Date.now();
  const semanticSectorBoost = semantic?.environmentalPressureBoost;
  const operatorMeaningBoost = semantic?.operatorMeaningBoost ?? {};

  return Object.entries(OPERATOR_SECTOR_OWNERSHIP).map(([operatorId, ownedSectors]) => {
    const ownedSet = new Set(ownedSectors);
    const meaningBoost = operatorMeaningBoost[operatorId] ?? 0;

    const sectorSignals = operationalSignals
      .map((sig) => ({
        sig,
        sector: resolveProjectionSector(sig),
        instant: weightedSignalContribution(sig, referenceMs),
        preference: operatorSectorPreferenceScore(
          temporal,
          resolveProjectionSector(sig),
          semanticSectorBoost?.[resolveProjectionSector(sig)] ?? 0,
        ),
      }))
      .filter((x) => ownedSet.has(x.sector))
      .sort((a, b) => {
        const pref = b.preference - a.preference;
        if (Math.abs(pref) > 0.05) return pref;
        return b.instant - a.instant;
      });

    const workload = Math.min(
      100,
      Math.round(
        ownedSectors.reduce(
          (n, s) =>
            n +
            (sectorHeat[s]?.activityScore ?? 0) +
            Math.round((temporal.sectors[s]?.sustainedPressure ?? 0) * 4) +
            Math.round((semanticSectorBoost?.[s] ?? 0) * 8),
          0,
        ) / Math.max(1, ownedSectors.length) +
        Math.round(meaningBoost * 12),
      ),
    );

    const topSignalEntry = sectorSignals[0];
    const topSig = topSignalEntry?.sig;

    const relevant = projects.filter((p) => ownedSectors.includes(p.sectorClassification));
    const signalProject = topSig ? findProject(projects, projectIdFromSignal(topSig)) : undefined;
    const topProject =
      signalProject ??
      [...relevant].sort((a, b) => b.activityScore - a.activityScore)[0];

    const hotSector = [...ownedSectors]
      .sort(
        (a, b) =>
          operatorSectorPreferenceScore(
            temporal,
            b,
            semanticSectorBoost?.[b] ?? 0,
          ) -
          operatorSectorPreferenceScore(
            temporal,
            a,
            semanticSectorBoost?.[a] ?? 0,
          ),
      )
      .find(
        (s) =>
          operatorSectorPreferenceScore(
            temporal,
            s,
            semanticSectorBoost?.[s] ?? 0,
          ) >= 0.35,
      );

    let currentActivity = "Standby — no local activity in owned sectors";
    if (topSig && topSignalEntry && topSignalEntry.instant > 0) {
      const label = topSig.type.replace(/_/g, " ");
      const proj = projectIdFromSignal(topSig);
      currentActivity = proj
        ? `${label} · ${proj}`
        : `${label} · ${topSig.sector}`;
    } else if (topProject && topProject.activityScore > 0) {
      currentActivity = `${topProject.name}: ${topProject.recentActivityCount > 0 ? "recent file activity" : "structure detected"}`;
    } else if (hotSector) {
      const dom = sectorHeat[hotSector]?.dominantActivity;
      currentActivity = dom
        ? `${hotSector}: ${dom}`
        : `${hotSector} sector heat ${sectorHeat[hotSector]?.activityScore ?? 0}`;
    }

    const lastSignal = topSig
      ? `${topSig.type.replace(/_/g, " ")} (${topSig.severity})`
      : null;

    return {
      operatorId,
      callsign: OPERATOR_CALLSIGNS[operatorId] ?? operatorId,
      workload,
      currentActivity,
      activeProjectId:
        topProject &&
        (topProject.activityScore > 0 ||
          (topSig && topSignalEntry && topSignalEntry.instant > 0))
          ? topProject.id
          : null,
      lastSignal,
    };
  });
}
