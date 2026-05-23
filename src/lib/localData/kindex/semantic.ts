import type { SectorId } from "@/data/types";
import { scoreSemanticConfidence } from "@/lib/operations/semantic/confidence";
import type { SemanticRuleCandidate } from "@/lib/operations/semantic/rules";
import type { OperationalSignal } from "@/lib/operations/types";
import type { KindexScope } from "./types";
import { KINDEX_SIGNAL_SOURCE } from "./signals";

function kindexSignals(signals: OperationalSignal[]): OperationalSignal[] {
  return signals.filter((s) => s.source === KINDEX_SIGNAL_SOURCE);
}

function evidenceFromSignals(
  kin: OperationalSignal[],
  extra?: Record<string, unknown>,
) {
  const agg = kin[0]?.metadata?.aggregate as
    | { totalMarkdown?: number; totalRecentActivity?: number }
    | undefined;
  return {
    signalCount: kin.length,
    correlatedSignalTypes: [...new Set(kin.map((s) => s.type))],
    markdownCount: agg?.totalMarkdown,
    recentActivityCount: agg?.totalRecentActivity,
    ...extra,
  };
}

function candidate(
  meaning: SemanticRuleCandidate["meaning"],
  sector: SectorId,
  sectors: SectorId[],
  summary: string,
  kin: OperationalSignal[],
  requiredSignals: number,
): SemanticRuleCandidate | null {
  const ev = evidenceFromSignals(kin);
  const confidence = scoreSemanticConfidence(ev, requiredSignals);
  if (confidence <= 0) return null;
  return {
    meaning,
    sector,
    sectors,
    projectId: "kindex",
    summary,
    evidence: ev,
    confidence,
  };
}

export function evaluateKindexSemanticRules(
  scope: KindexScope,
  allSignals: OperationalSignal[],
): SemanticRuleCandidate[] {
  if (scope.members.length === 0) return [];

  const kin = kindexSignals(allSignals);
  if (kin.length === 0) return [];

  const types = new Set(kin.map((s) => s.type));
  const out: SemanticRuleCandidate[] = [];

  const growth = candidate(
    "initiative_emergence",
    "observatory",
    ["observatory", "archive", "core"],
    "KINDEX: continuity growth across knowledge lattice",
    kin.filter((s) => s.type === "kindex_continuity_growth"),
    1,
  );
  if (growth && types.has("kindex_continuity_growth")) out.push(growth);

  const ontology = candidate(
    "architecture_shift",
    "observatory",
    ["observatory", "archive"],
    "KINDEX: ontology and architecture corpus expansion",
    kin.filter((s) => s.type === "kindex_ontology_expansion"),
    1,
  );
  if (ontology && types.has("kindex_ontology_expansion")) out.push(ontology);

  const initiative = candidate(
    "active_initiative",
    "observatory",
    ["observatory", "archive"],
    "KINDEX: active indexing initiative with git activity",
    kin.filter((s) => s.type === "kindex_active_initiative"),
    1,
  );
  if (initiative && types.has("kindex_active_initiative")) out.push(initiative);

  const consolidation = candidate(
    "continuity_consolidation",
    "archive",
    ["archive", "core", "observatory"],
    "KINDEX: archive density and consolidation wave",
    kin.filter(
      (s) =>
        s.type === "kindex_archive_density" ||
        s.type === "kindex_consolidation_wave",
    ),
    2,
  );
  if (
    consolidation &&
    types.has("kindex_consolidation_wave")
  ) {
    out.push(consolidation);
  }

  const cross = candidate(
    "ecosystem_expansion",
    "observatory",
    ["observatory", "core"],
    "KINDEX: cross-project linkage in continuity index",
    kin.filter((s) => s.type === "kindex_cross_linkage"),
    1,
  );
  if (cross && types.has("kindex_cross_linkage")) out.push(cross);

  const messages = candidate(
    "continuity_consolidation",
    "archive",
    ["archive", "observatory"],
    "KINDEX: Discord, forum, or message continuity archived",
    kin.filter((s) => s.type === "kindex_message_archive"),
    1,
  );
  if (messages && types.has("kindex_message_archive")) out.push(messages);

  const discordIngested = candidate(
    "continuity_consolidation",
    "archive",
    ["archive", "relay", "observatory"],
    "KINDEX: Discord-derived continuity artifacts ingested",
    kin.filter((s) => s.type === "kindex_discord_continuity_ingested"),
    1,
  );
  if (discordIngested && types.has("kindex_discord_continuity_ingested")) {
    out.push(discordIngested);
  }

  const discordArchitecture = candidate(
    "architecture_shift",
    "observatory",
    ["observatory", "core"],
    "KINDEX: Discord architecture or philosophy discussion detected",
    kin.filter((s) => s.type === "kindex_discord_architecture_philosophy"),
    1,
  );
  if (
    discordArchitecture &&
    types.has("kindex_discord_architecture_philosophy")
  ) {
    out.push(discordArchitecture);
  }

  const discordCommunity = candidate(
    "deployment_progress",
    "relay",
    ["relay", "archive"],
    "KINDEX: Discord community continuity activity detected",
    kin.filter((s) => s.type === "kindex_discord_community_activity"),
    1,
  );
  if (discordCommunity && types.has("kindex_discord_community_activity")) {
    out.push(discordCommunity);
  }

  const discordRuntime = candidate(
    "infrastructure_instability",
    "runtime",
    ["runtime", "forge"],
    "KINDEX: Discord runtime/debug coordination detected",
    kin.filter((s) => s.type === "kindex_discord_runtime_coordination"),
    1,
  );
  if (discordRuntime && types.has("kindex_discord_runtime_coordination")) {
    out.push(discordRuntime);
  }

  const discordForge = candidate(
    "active_initiative",
    "forge",
    ["forge", "relay"],
    "KINDEX: Discord coding/build/deploy coordination detected",
    kin.filter((s) => s.type === "kindex_discord_forge_coordination"),
    1,
  );
  if (discordForge && types.has("kindex_discord_forge_coordination")) {
    out.push(discordForge);
  }

  const runtime = candidate(
    "infrastructure_instability",
    "runtime",
    ["runtime", "observatory"],
    "KINDEX: bot/runtime or PM2 continuity active",
    kin.filter((s) => s.type === "kindex_bot_runtime"),
    1,
  );
  if (runtime && types.has("kindex_bot_runtime")) out.push(runtime);

  const relay = candidate(
    "deployment_progress",
    "relay",
    ["relay", "archive"],
    "KINDEX: announcements or public communication activity",
    kin.filter((s) => s.type === "kindex_public_communication"),
    1,
  );
  if (relay && types.has("kindex_public_communication")) out.push(relay);

  const pressure = candidate(
    "ecosystem_expansion",
    "observatory",
    ["observatory", "archive", "core"],
    "KINDEX: ecosystem-level operational pressure elevated",
    kin.filter((s) => s.type === "kindex_ecosystem_pressure"),
    1,
  );
  if (pressure && types.has("kindex_ecosystem_pressure")) out.push(pressure);

  return out;
}
