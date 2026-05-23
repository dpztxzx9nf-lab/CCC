import type { SectorId } from "@/data/types";
import type { ContinuityEvent } from "@/lib/continuity/events/types";
import { ALL_SECTOR_IDS, type OperatorId } from "@/lib/operations/taxonomy";
import type { OperationalEvent } from "../events";
import type { OperationalSignal, OperationalSignalSeverity, Sector } from "../types";
import { createSignal } from "./createSignal";
import { resolveProjectionSector, secondarySectorsForSignal } from "../signalSectorRouting";

const SOURCE = "continuity:historical" as const;
const LOOKBACK_DAYS = 90;
const RECENT_TREND_DAYS = 21;

interface HistoricalContribution {
  timestamp: string;
  sector: SectorId;
  sectors: SectorId[];
  project: string | null;
  operators: OperatorId[];
  type: string;
  severity: OperationalSignalSeverity;
  source: string;
}

interface SectorStats {
  sector: SectorId;
  count: number;
  uniqueDays: Set<string>;
  projects: Map<string, number>;
  operators: Map<string, number>;
  firstMs: number;
  lastMs: number;
  deploymentBuildCount: number;
  runtimeInstabilityCount: number;
  recentCount: number;
  priorCount: number;
}

function emptySectorStats(referenceMs: number): Map<SectorId, SectorStats> {
  return new Map(
    ALL_SECTOR_IDS.map((sector) => [
      sector,
      {
        sector,
        count: 0,
        uniqueDays: new Set<string>(),
        projects: new Map<string, number>(),
        operators: new Map<string, number>(),
        firstMs: referenceMs,
        lastMs: 0,
        deploymentBuildCount: 0,
        runtimeInstabilityCount: 0,
        recentCount: 0,
        priorCount: 0,
      },
    ]),
  );
}

function severityWeight(severity: string): OperationalSignalSeverity {
  if (severity === "high") return "high";
  if (severity === "medium") return "medium";
  return "low";
}

function signalToContribution(signal: OperationalSignal): HistoricalContribution {
  const primary = resolveProjectionSector(signal);
  const projectId = signal.metadata.projectId;
  const serviceName = signal.metadata.serviceName;
  return {
    timestamp: signal.timestamp,
    sector: primary,
    sectors: [primary, ...secondarySectorsForSignal(signal)],
    project:
      typeof projectId === "string"
        ? projectId
        : typeof serviceName === "string"
          ? serviceName
          : null,
    operators: [],
    type: signal.type,
    severity: signal.severity,
    source: signal.source,
  };
}

function operationalEventToContribution(event: OperationalEvent): HistoricalContribution {
  return {
    timestamp: event.timestamp,
    sector: event.sector,
    sectors: event.sectors,
    project: event.project,
    operators: [],
    type: event.type,
    severity: severityWeight(event.severity),
    source: event.source,
  };
}

function continuityEventToContribution(event: ContinuityEvent): HistoricalContribution {
  const sector = event.sectors.find((s) => ALL_SECTOR_IDS.includes(s)) ?? "core";
  return {
    timestamp: event.occurredAt,
    sector,
    sectors: event.sectors.filter((s) => ALL_SECTOR_IDS.includes(s)),
    project: event.projects[0] ?? null,
    operators: event.operators,
    type: event.kind,
    severity: severityWeight(event.importance),
    source: event.source,
  };
}

function isDeploymentBuild(type: string): boolean {
  return /build|deploy|deployment|repo_ahead|git_deployment/i.test(type);
}

function isRuntimeInstability(c: HistoricalContribution): boolean {
  return (
    c.sectors.includes("runtime") &&
    /offline|restarting|restart_count|resource_pressure|build_failure|runtime_signal|instability/i.test(
      c.type,
    )
  );
}

function scoreSeverity(stats: SectorStats): OperationalSignalSeverity {
  if (stats.count >= 14 || stats.uniqueDays.size >= 6) return "high";
  if (stats.count >= 7 || stats.uniqueDays.size >= 3) return "medium";
  return "low";
}

function increment(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function topEntries(map: Map<string, number>, limit: number): [string, number][] {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

function addContribution(
  statsBySector: Map<SectorId, SectorStats>,
  contribution: HistoricalContribution,
  referenceMs: number,
): void {
  const timestampMs = Date.parse(contribution.timestamp);
  if (!Number.isFinite(timestampMs)) return;
  if (referenceMs - timestampMs > LOOKBACK_DAYS * 24 * 60 * 60 * 1000) return;
  if (timestampMs > referenceMs + 60_000) return;

  const day = new Date(timestampMs).toISOString().slice(0, 10);
  const trendCutoff = referenceMs - RECENT_TREND_DAYS * 24 * 60 * 60 * 1000;
  const targets = new Set<SectorId>([contribution.sector, ...contribution.sectors]);

  for (const sector of targets) {
    const stats = statsBySector.get(sector);
    if (!stats) continue;
    stats.count += 1;
    stats.uniqueDays.add(day);
    stats.firstMs = Math.min(stats.firstMs, timestampMs);
    stats.lastMs = Math.max(stats.lastMs, timestampMs);
    if (contribution.project) increment(stats.projects, contribution.project);
    for (const operator of contribution.operators) increment(stats.operators, operator);
    if (isDeploymentBuild(contribution.type)) stats.deploymentBuildCount += 1;
    if (isRuntimeInstability(contribution)) stats.runtimeInstabilityCount += 1;
    if (timestampMs >= trendCutoff) stats.recentCount += 1;
    else stats.priorCount += 1;
  }
}

function signalForSector(input: {
  stats: SectorStats;
  type: string;
  severity: OperationalSignalSeverity;
  stableSuffix: string;
  metadata?: Record<string, unknown>;
}): OperationalSignal {
  const { stats, type, severity, stableSuffix, metadata } = input;
  return createSignal({
    source: SOURCE,
    sector: stats.sector as Sector,
    type,
    severity,
    stableKey: `${stats.sector}:${stableSuffix}`,
    metadata: {
      sector: stats.sector,
      eventCount: stats.count,
      uniqueDays: stats.uniqueDays.size,
      firstActivityAt:
        stats.firstMs < Number.MAX_SAFE_INTEGER
          ? new Date(stats.firstMs).toISOString()
          : null,
      lastActivityAt: stats.lastMs > 0 ? new Date(stats.lastMs).toISOString() : null,
      topProjects: topEntries(stats.projects, 5),
      topOperators: topEntries(stats.operators, 5),
      ...metadata,
    },
  });
}

export function deriveHistoricalContinuitySignals(input: {
  operationalEvents?: OperationalEvent[];
  continuityEvents?: ContinuityEvent[];
  operationalSignals?: OperationalSignal[];
  referenceTime?: string;
}): OperationalSignal[] {
  const referenceMs = input.referenceTime ? Date.parse(input.referenceTime) : Date.now();
  const safeReferenceMs = Number.isFinite(referenceMs) ? referenceMs : Date.now();
  const statsBySector = emptySectorStats(safeReferenceMs);

  for (const event of input.operationalEvents ?? []) {
    addContribution(statsBySector, operationalEventToContribution(event), safeReferenceMs);
  }
  for (const event of input.continuityEvents ?? []) {
    addContribution(statsBySector, continuityEventToContribution(event), safeReferenceMs);
  }
  for (const signal of input.operationalSignals ?? []) {
    addContribution(statsBySector, signalToContribution(signal), safeReferenceMs);
  }

  const out: OperationalSignal[] = [];

  for (const stats of statsBySector.values()) {
    const spanDays =
      stats.lastMs > 0 ? Math.max(0, (stats.lastMs - stats.firstMs) / 86_400_000) : 0;

    if (stats.count >= 5 && stats.uniqueDays.size >= 3) {
      out.push(
        signalForSector({
          stats,
          type: "historical_recurring_sector_activity",
          severity: scoreSeverity(stats),
          stableSuffix: "recurring",
          metadata: { spanDays: Math.round(spanDays * 10) / 10 },
        }),
      );
    }

    if (stats.count >= 8 && spanDays >= 7) {
      out.push(
        signalForSector({
          stats,
          type: "historical_long_running_pressure",
          severity: stats.count >= 16 || spanDays >= 30 ? "high" : "medium",
          stableSuffix: "pressure",
          metadata: { spanDays: Math.round(spanDays * 10) / 10 },
        }),
      );
    }

    const repeatedOperators = topEntries(stats.operators, 3).filter(([, n]) => n >= 3);
    const repeatedProjects = topEntries(stats.projects, 3).filter(([, n]) => n >= 4);
    if (repeatedOperators.length > 0 || repeatedProjects.length > 0) {
      out.push(
        signalForSector({
          stats,
          type: "historical_repeated_system_involvement",
          severity: repeatedOperators.some(([, n]) => n >= 6) ? "medium" : "low",
          stableSuffix: "involvement",
          metadata: { repeatedOperators, repeatedProjects },
        }),
      );
    }

    if (stats.recentCount >= 5 && stats.recentCount >= Math.max(3, stats.priorCount * 1.5)) {
      out.push(
        signalForSector({
          stats,
          type: "historical_continuity_density_trend",
          severity: stats.recentCount >= 10 ? "medium" : "low",
          stableSuffix: "density",
          metadata: {
            recentWindowDays: RECENT_TREND_DAYS,
            recentCount: stats.recentCount,
            priorCount: stats.priorCount,
          },
        }),
      );
    }

    if (stats.deploymentBuildCount >= 2) {
      out.push(
        signalForSector({
          stats,
          type: "historical_deployment_build_cycle",
          severity: stats.deploymentBuildCount >= 5 ? "medium" : "low",
          stableSuffix: "deploy-build",
          metadata: { deploymentBuildCount: stats.deploymentBuildCount },
        }),
      );
    }

    if (stats.sector === "runtime" && stats.runtimeInstabilityCount >= 2) {
      out.push(
        signalForSector({
          stats,
          type: "historical_sustained_runtime_instability",
          severity: stats.runtimeInstabilityCount >= 5 ? "high" : "medium",
          stableSuffix: "runtime-instability",
          metadata: { runtimeInstabilityCount: stats.runtimeInstabilityCount },
        }),
      );
    }
  }

  return out;
}
