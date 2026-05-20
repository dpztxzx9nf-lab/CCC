import type { SectorId } from "@/data/types";
import type { RawScannedProject } from "@/lib/localData/scanners";
import { resolveProjectionSector } from "../signalSectorRouting";
import type { OperationalSignal } from "../types";
import type { TemporalContinuityModel } from "../temporal/types";

export interface ProjectContinuityProfile {
  projectId: string;
  name: string;
  primarySector: SectorId;
  activityScore: number;
  recentActivityCount: number;
  markdownCount: number;
  hasGit: boolean;
  runtimeCapable: boolean;
  obsidianVault: boolean;
  wasDormant: boolean;
  wasActive: boolean;
  forgeSignals: number;
  archiveSignals: number;
  runtimeSignals: number;
  relaySignals: number;
  observatorySignals: number;
  coreSignals: number;
  hasRecentCommit: boolean;
  hasDirtyRepo: boolean;
  hasRemote: boolean;
  hasBranch: boolean;
  hasPm2Hint: boolean;
  hasBuildFailure: boolean;
  hasDeploySignal: boolean;
  architectureSignalHits: number;
  sustainedPressure: number;
  transientPressure: number;
  momentum: number;
  correlatedTypes: string[];
}

function projectIdFromSignal(s: OperationalSignal): string | null {
  const m = s.metadata?.projectId;
  return typeof m === "string" && m.length > 0 ? m : null;
}

function pushType(profile: ProjectContinuityProfile, type: string): void {
  if (!profile.correlatedTypes.includes(type)) {
    profile.correlatedTypes.push(type);
  }
}

export function buildProjectProfiles(
  projects: RawScannedProject[],
  signals: OperationalSignal[],
  temporal: TemporalContinuityModel,
  dormantProjectIds: string[],
  activeProjectIds: string[],
): ProjectContinuityProfile[] {
  const dormant = new Set(dormantProjectIds);
  const active = new Set(activeProjectIds);
  const byId = new Map<string, ProjectContinuityProfile>();

  for (const p of projects) {
    const sector = p.sectorClassification;
    const ts = temporal.sectors[sector];
    byId.set(p.id, {
      projectId: p.id,
      name: p.name,
      primarySector: sector,
      activityScore: p.activityScore,
      recentActivityCount: p.recentActivityCount,
      markdownCount: p.markdownCount,
      hasGit: p.hasGit,
      runtimeCapable: p.runtimeCapable,
      obsidianVault: p.obsidianVault,
      wasDormant: dormant.has(p.id),
      wasActive: active.has(p.id),
      forgeSignals: 0,
      archiveSignals: 0,
      runtimeSignals: 0,
      relaySignals: 0,
      observatorySignals: 0,
      coreSignals: 0,
      hasRecentCommit: false,
      hasDirtyRepo: false,
      hasRemote: false,
      hasBranch: false,
      hasPm2Hint:
        p.runtimeCapable &&
        (p.likelyStack.includes("pm2") || /next|node/.test(p.likelyStack.join(" "))),
      hasBuildFailure: false,
      hasDeploySignal: false,
      architectureSignalHits: 0,
      sustainedPressure: ts?.sustainedPressure ?? 0,
      transientPressure: ts?.transientPressure ?? 0,
      momentum: ts?.momentum ?? 0,
      correlatedTypes: [],
    });
  }

  for (const s of signals) {
    const pid = projectIdFromSignal(s);
    if (!pid) continue;
    let profile = byId.get(pid);
    if (!profile) {
      const p = projects.find((x) => x.id === pid);
      if (!p) continue;
      profile = buildProjectProfiles(
        [p],
        [],
        temporal,
        dormantProjectIds,
        activeProjectIds,
      )[0];
      byId.set(pid, profile);
    }

    const sector = resolveProjectionSector(s);
    const t = s.type.toLowerCase();
    pushType(profile, t);

    if (sector === "forge") profile.forgeSignals += 1;
    if (sector === "archive") profile.archiveSignals += 1;
    if (sector === "runtime") profile.runtimeSignals += 1;
    if (sector === "relay") profile.relaySignals += 1;
    if (sector === "observatory") profile.observatorySignals += 1;
    if (sector === "core") profile.coreSignals += 1;

    if (t === "recent_commit_detected") profile.hasRecentCommit = true;
    if (t === "repo_dirty") profile.hasDirtyRepo = true;
    if (t === "remote_detected") profile.hasRemote = true;
    if (t === "branch_detected") profile.hasBranch = true;
    if (/pm2|ecosystem|runtime/.test(t) || /pm2|ecosystem/.test(s.source)) {
      profile.hasPm2Hint = true;
    }
    if (t === "build_failure") profile.hasBuildFailure = true;
    if (/deploy|remote/.test(t)) profile.hasDeploySignal = true;
    if (/architecture|ontology|continuity-|adr/i.test(t)) {
      profile.architectureSignalHits += 1;
    }
  }

  return Array.from(byId.values());
}

export interface SectorContinuityProfile {
  sectorId: SectorId;
  sustainedPressure: number;
  transientPressure: number;
  momentum: number;
  activityClass: string;
  projectCount: number;
  risingMomentumProjects: number;
}

export function buildSectorProfiles(
  projects: ProjectContinuityProfile[],
  temporal: TemporalContinuityModel,
): SectorContinuityProfile[] {
  return (Object.keys(temporal.sectors) as SectorId[]).map((sectorId) => {
    const ts = temporal.sectors[sectorId];
    const inSector = projects.filter((p) => p.primarySector === sectorId);
    return {
      sectorId,
      sustainedPressure: ts?.sustainedPressure ?? 0,
      transientPressure: ts?.transientPressure ?? 0,
      momentum: ts?.momentum ?? 0,
      activityClass: ts?.activityClass ?? "dormant",
      projectCount: inSector.length,
      risingMomentumProjects: inSector.filter(
        (p) => p.momentum >= 1.15 && p.recentActivityCount > 0,
      ).length,
    };
  });
}
