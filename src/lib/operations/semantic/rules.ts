import type { SectorId } from "@/data/types";
import {
  ARCHIVE_SUSTAINED_THRESHOLD,
  DORMANT_ACTIVITY_SCORE_MAX,
  FORGE_SUSTAINED_THRESHOLD,
  LOW_MOMENTUM_PROJECT_MAX,
  MARKDOWN_CORPUS_MIN,
  MARKDOWN_GROWTH_RECENT_MIN,
  MOMENTUM_EMERGENCE_MIN,
  MOMENTUM_INITIATIVE_MIN,
  OBSERVATORY_SUSTAINED_THRESHOLD,
  RELAY_SUSTAINED_THRESHOLD,
  RUNTIME_SUSTAINED_THRESHOLD,
} from "./constants";
import { scoreSemanticConfidence } from "./confidence";
import type {
  ProjectContinuityProfile,
  SectorContinuityProfile,
} from "./correlate";
import type { OperationalSemanticMeaning, SemanticEvidence } from "./types";

export interface SemanticRuleCandidate {
  meaning: OperationalSemanticMeaning;
  sector: SectorId;
  sectors: SectorId[];
  projectId: string | null;
  summary: string;
  evidence: SemanticEvidence;
  confidence: number;
}

function evidence(
  profile: ProjectContinuityProfile,
  extra?: Partial<SemanticEvidence>,
): SemanticEvidence {
  return {
    signalCount:
      profile.forgeSignals +
      profile.archiveSignals +
      profile.runtimeSignals +
      profile.relaySignals +
      profile.observatorySignals +
      profile.coreSignals,
    correlatedSignalTypes: [...profile.correlatedTypes],
    sustainedPressure: profile.sustainedPressure,
    momentum: profile.momentum,
    markdownCount: profile.markdownCount,
    recentActivityCount: profile.recentActivityCount,
    ...extra,
  };
}

function candidate(
  meaning: OperationalSemanticMeaning,
  sector: SectorId,
  sectors: SectorId[],
  projectId: string | null,
  summary: string,
  ev: SemanticEvidence,
  requiredSignals = 2,
): SemanticRuleCandidate | null {
  const confidence = scoreSemanticConfidence(ev, requiredSignals);
  if (confidence <= 0) return null;
  return { meaning, sector, sectors, projectId, summary, evidence: ev, confidence };
}

export function evaluateProjectRules(
  profile: ProjectContinuityProfile,
): SemanticRuleCandidate[] {
  const out: SemanticRuleCandidate[] = [];
  const forgeSustained = profile.sustainedPressure >= FORGE_SUSTAINED_THRESHOLD;

  const activeInitiative = candidate(
    "active_initiative",
    "forge",
    ["forge", "relay"],
    profile.projectId,
    `${profile.name}: sustained forge pressure with git activity`,
    evidence(profile, { sustainedPressure: profile.sustainedPressure }),
    2,
  );
  if (
    activeInitiative &&
    forgeSustained &&
    (profile.hasRecentCommit || profile.hasDirtyRepo) &&
    profile.forgeSignals >= 2
  ) {
    out.push(activeInitiative);
  }

  const sustainedDev = candidate(
    "sustained_development_focus",
    "forge",
    ["forge"],
    profile.projectId,
    `${profile.name}: sustained development focus in forge`,
    evidence(profile),
    2,
  );
  if (
    sustainedDev &&
    forgeSustained &&
    profile.forgeSignals >= 1 &&
    profile.momentum >= 1
  ) {
    out.push(sustainedDev);
  }

  const consolidation = candidate(
    "continuity_consolidation",
    "archive",
    ["archive", "core"],
    profile.projectId,
    `${profile.name}: archive corpus consolidation (${profile.markdownCount} notes)`,
    evidence(profile, { markdownCount: profile.markdownCount }),
    2,
  );
  if (
    consolidation &&
    profile.markdownCount >= MARKDOWN_CORPUS_MIN &&
    profile.archiveSignals >= 1 &&
    (profile.recentActivityCount >= MARKDOWN_GROWTH_RECENT_MIN ||
      profile.obsidianVault)
  ) {
    out.push(consolidation);
  }

  const instability = candidate(
    "infrastructure_instability",
    "runtime",
    ["runtime", "forge"],
    profile.projectId,
    `${profile.name}: runtime / process instability signals`,
    evidence(profile),
    2,
  );
  if (
    instability &&
    profile.runtimeCapable &&
    (profile.hasBuildFailure ||
      profile.hasPm2Hint ||
      profile.runtimeSignals >= 2)
  ) {
    out.push(instability);
  }

  const emergence = candidate(
    "initiative_emergence",
    "forge",
    ["forge", "observatory"],
    profile.projectId,
    `${profile.name}: emerging initiative — rising momentum`,
    evidence(profile),
    2,
  );
  if (
    emergence &&
    profile.momentum >= MOMENTUM_EMERGENCE_MIN &&
    profile.recentActivityCount > 0 &&
    profile.activityScore <= LOW_MOMENTUM_PROJECT_MAX + 20
  ) {
    out.push(emergence);
  }

  const reactivation = candidate(
    "reactivation_event",
    "forge",
    ["forge", "archive"],
    profile.projectId,
    `${profile.name}: dormant project reactivated via git`,
    evidence(profile),
    1,
  );
  if (
    reactivation &&
    profile.wasDormant &&
    profile.hasGit &&
    (profile.hasDirtyRepo || profile.hasRecentCommit)
  ) {
    out.push(reactivation);
  }

  const deployStable = candidate(
    "deployment_stabilization",
    "relay",
    ["relay", "runtime"],
    profile.projectId,
    `${profile.name}: deployment / remote linkage stabilizing`,
    evidence(profile),
    2,
  );
  if (
    deployStable &&
    profile.hasRemote &&
    profile.hasDeploySignal &&
    !profile.hasDirtyRepo
  ) {
    out.push(deployStable);
  }

  const archShift = candidate(
    "architecture_shift",
    "core",
    ["core", "forge"],
    profile.projectId,
    `${profile.name}: architecture / foundation activity`,
    evidence(profile),
    1,
  );
  if (archShift && profile.architectureSignalHits >= 1) {
    out.push(archShift);
  }

  return out;
}

export function evaluateSectorRules(
  sectors: SectorContinuityProfile[],
): SemanticRuleCandidate[] {
  const out: SemanticRuleCandidate[] = [];

  for (const s of sectors) {
    const ev: SemanticEvidence = {
      signalCount: s.projectCount,
      correlatedSignalTypes: [s.activityClass],
      sustainedPressure: s.sustainedPressure,
      momentum: s.momentum,
    };

    const ecosystem = candidate(
      "ecosystem_expansion",
      "observatory",
      ["observatory", "core"],
      null,
      `Observatory sector: scan/index pressure across ${s.risingMomentumProjects} projects`,
      ev,
      1,
    );
    if (
      ecosystem &&
      s.sectorId === "observatory" &&
      s.sustainedPressure >= OBSERVATORY_SUSTAINED_THRESHOLD &&
      s.risingMomentumProjects >= 2
    ) {
      out.push(ecosystem);
    }

    const deployProgress = candidate(
      "deployment_progress",
      "relay",
      ["relay", "forge"],
      null,
      `Relay sector: sustained publish / remote signals`,
      ev,
      1,
    );
    if (
      deployProgress &&
      s.sectorId === "relay" &&
      s.sustainedPressure >= RELAY_SUSTAINED_THRESHOLD
    ) {
      out.push(deployProgress);
    }

    const runtimeInst = candidate(
      "infrastructure_instability",
      "runtime",
      ["runtime"],
      null,
      `Runtime sector: sustained instability pattern`,
      ev,
      1,
    );
    if (
      runtimeInst &&
      s.sectorId === "runtime" &&
      s.sustainedPressure >= RUNTIME_SUSTAINED_THRESHOLD &&
      s.transientPressure > s.sustainedPressure * 0.6
    ) {
      out.push(runtimeInst);
    }
  }

  return out;
}
