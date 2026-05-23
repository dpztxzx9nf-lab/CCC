import { createSignal } from "@/lib/operations/signals/createSignal";
import type { OperationalSignal } from "@/lib/operations/types";
import type { RawScannedProject } from "@/lib/localData/scanners";
import { aggregateKindexScope, observeKindexFilesystem } from "./observe";
import { resolveKindexScope } from "./resolve";
import type { KindexScope } from "./types";

export const KINDEX_SIGNAL_SOURCE = "continuity:kindex" as const;

function baseMeta(scope: KindexScope) {
  return {
    ecosystemId: scope.ecosystemId,
    projectId: scope.projectId,
    memberCount: scope.members.length,
    memberIds: scope.members.map((m) => m.id),
  };
}

export async function deriveKindexOperationalSignals(
  projects: RawScannedProject[],
): Promise<OperationalSignal[]> {
  const scope = resolveKindexScope(projects);
  if (scope.members.length === 0) return [];

  const [observation, aggregate] = await Promise.all([
    observeKindexFilesystem(scope),
    Promise.resolve(aggregateKindexScope(scope)),
  ]);

  const meta = { ...baseMeta(scope), observation, aggregate };
  const signals: OperationalSignal[] = [];
  const key = scope.projectId;

  if (
    aggregate.totalRecentActivity >= 3 &&
    aggregate.totalActivityScore >= 35
  ) {
    signals.push(
      createSignal({
        source: KINDEX_SIGNAL_SOURCE,
        sector: "archive",
        type: "kindex_continuity_growth",
        severity:
          aggregate.totalRecentActivity >= 8 ? "medium" : "low",
        stableKey: `${key}:growth`,
        metadata: meta,
      }),
    );
  }

  if (
    observation.ontologyMarkerCount >= 1 &&
    (aggregate.recentMarkdownEdits >= 1 || observation.docsMarkerCount >= 1)
  ) {
    signals.push(
      createSignal({
        source: KINDEX_SIGNAL_SOURCE,
        sector: "observatory",
        type: "kindex_ontology_expansion",
        severity: observation.ontologyMarkerCount >= 2 ? "medium" : "low",
        stableKey: `${key}:ontology`,
        metadata: meta,
      }),
    );
  }

  if (
    aggregate.hasGitActivity &&
    (aggregate.recentCodeEdits >= 1 || aggregate.totalRecentActivity >= 4)
  ) {
    signals.push(
      createSignal({
        source: KINDEX_SIGNAL_SOURCE,
        sector: "observatory",
        type: "kindex_active_initiative",
        severity: "medium",
        stableKey: `${key}:initiative`,
        metadata: meta,
      }),
    );
  }

  if (aggregate.totalMarkdown >= 20) {
    signals.push(
      createSignal({
        source: KINDEX_SIGNAL_SOURCE,
        sector: "archive",
        type: "kindex_archive_density",
        severity: aggregate.totalMarkdown >= 50 ? "medium" : "low",
        stableKey: `${key}:archive-density`,
        metadata: meta,
      }),
    );
  }

  if (
    observation.crossLinkageHits >= 2 ||
    scope.members.length >= 3
  ) {
    signals.push(
      createSignal({
        source: KINDEX_SIGNAL_SOURCE,
        sector: "observatory",
        type: "kindex_cross_linkage",
        severity: observation.crossLinkageHits >= 4 ? "medium" : "low",
        stableKey: `${key}:cross-link`,
        metadata: meta,
      }),
    );
  }

  if (observation.messageMarkerCount >= 1) {
    signals.push(
      createSignal({
        source: KINDEX_SIGNAL_SOURCE,
        sector: "archive",
        type: "kindex_message_archive",
        severity: observation.messageMarkerCount >= 3 ? "medium" : "low",
        stableKey: `${key}:messages`,
        metadata: meta,
      }),
    );
  }

  const discord = observation.discordContinuity;
  if (discord.artifactCount > 0 && discord.messageCount > 0) {
    signals.push(
      createSignal({
        source: KINDEX_SIGNAL_SOURCE,
        sector: "archive",
        type: "kindex_discord_continuity_ingested",
        severity: discord.messageCount >= 100 ? "medium" : "low",
        stableKey: `${key}:discord-ingested`,
        metadata: meta,
      }),
    );
  }

  if (discord.categoryCounts.architecture > 0) {
    signals.push(
      createSignal({
        source: KINDEX_SIGNAL_SOURCE,
        sector: "observatory",
        type: "kindex_discord_architecture_philosophy",
        severity: discord.categoryCounts.architecture >= 3 ? "medium" : "low",
        stableKey: `${key}:discord-architecture`,
        metadata: meta,
      }),
    );
  }

  if (discord.categoryCounts.community > 0) {
    signals.push(
      createSignal({
        source: KINDEX_SIGNAL_SOURCE,
        sector: "relay",
        type: "kindex_discord_community_activity",
        severity:
          discord.messageCount >= 250 || discord.channelCount >= 4
            ? "medium"
            : "low",
        stableKey: `${key}:discord-community`,
        metadata: meta,
      }),
    );
  }

  if (discord.categoryCounts.knowledge > 0) {
    signals.push(
      createSignal({
        source: KINDEX_SIGNAL_SOURCE,
        sector: "archive",
        type: "kindex_discord_knowledge_archive",
        severity: discord.categoryCounts.knowledge >= 3 ? "medium" : "low",
        stableKey: `${key}:discord-knowledge`,
        metadata: meta,
      }),
    );
  }

  if (discord.categoryCounts.runtime > 0) {
    signals.push(
      createSignal({
        source: KINDEX_SIGNAL_SOURCE,
        sector: "runtime",
        type: "kindex_discord_runtime_coordination",
        severity: discord.categoryCounts.runtime >= 3 ? "medium" : "low",
        stableKey: `${key}:discord-runtime`,
        metadata: meta,
      }),
    );
  }

  if (discord.categoryCounts.forge > 0) {
    signals.push(
      createSignal({
        source: KINDEX_SIGNAL_SOURCE,
        sector: "forge",
        type: "kindex_discord_forge_coordination",
        severity: discord.categoryCounts.forge >= 3 ? "medium" : "low",
        stableKey: `${key}:discord-forge`,
        metadata: meta,
      }),
    );
  }

  if (observation.runtimeMarkerCount >= 1 && aggregate.recentCodeEdits >= 1) {
    signals.push(
      createSignal({
        source: KINDEX_SIGNAL_SOURCE,
        sector: "runtime",
        type: "kindex_bot_runtime",
        severity: "medium",
        stableKey: `${key}:runtime`,
        metadata: meta,
      }),
    );
  }

  if (observation.publicMarkerCount >= 1 && aggregate.totalRecentActivity >= 1) {
    signals.push(
      createSignal({
        source: KINDEX_SIGNAL_SOURCE,
        sector: "relay",
        type: "kindex_public_communication",
        severity: "low",
        stableKey: `${key}:public-comms`,
        metadata: meta,
      }),
    );
  }

  if (
    aggregate.totalMarkdown >= 12 &&
    aggregate.totalRecentActivity >= 2 &&
    (aggregate.obsidianVaultCount >= 1 || observation.indexArtifactCount >= 1)
  ) {
    signals.push(
      createSignal({
        source: KINDEX_SIGNAL_SOURCE,
        sector: "archive",
        type: "kindex_consolidation_wave",
        severity: "medium",
        stableKey: `${key}:consolidation`,
        metadata: meta,
      }),
    );
  }

  if (signals.length >= 2) {
    signals.push(
      createSignal({
        source: KINDEX_SIGNAL_SOURCE,
        sector: "observatory",
        type: "kindex_ecosystem_pressure",
        severity: signals.length >= 4 ? "high" : "medium",
        stableKey: `${key}:pressure`,
        metadata: {
          ...meta,
          derivedSignalCount: signals.length,
        },
      }),
    );
  }

  return signals;
}
