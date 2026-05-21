import type { SectorId } from "@/data/types";
import { scoreSemanticConfidence } from "@/lib/operations/semantic/confidence";
import type { SemanticRuleCandidate } from "@/lib/operations/semantic/rules";
import type { OperationalSignal } from "@/lib/operations/types";
import type { RawScannedProject } from "@/lib/localData/scanners";
import { LIAHONA_SIGNAL_SOURCE } from "./signals";

function liahonaSignals(signals: OperationalSignal[]): OperationalSignal[] {
  return signals.filter((s) => s.source === LIAHONA_SIGNAL_SOURCE);
}

function evidenceFromSignals(
  kin: OperationalSignal[],
  project: RawScannedProject,
) {
  return {
    signalCount: kin.length,
    correlatedSignalTypes: [...new Set(kin.map((s) => s.type))],
    recentActivityCount: project.recentActivityCount,
    sustainedPressure: undefined,
    momentum: undefined,
  };
}

function candidate(
  meaning: SemanticRuleCandidate["meaning"],
  sector: SectorId,
  sectors: SectorId[],
  summary: string,
  kin: OperationalSignal[],
  project: RawScannedProject,
  requiredSignals: number,
): SemanticRuleCandidate | null {
  const ev = evidenceFromSignals(kin, project);
  const confidence = scoreSemanticConfidence(ev, requiredSignals);
  if (confidence <= 0) return null;
  return {
    meaning,
    sector,
    sectors,
    projectId: "liahona",
    summary,
    evidence: ev,
    confidence,
  };
}

export function evaluateLiahonaSemanticRules(
  project: RawScannedProject | null,
  allSignals: OperationalSignal[],
): SemanticRuleCandidate[] {
  if (!project) return [];

  const kin = liahonaSignals(allSignals);
  if (kin.length === 0) return [];

  const types = new Set(kin.map((s) => s.type));
  const out: SemanticRuleCandidate[] = [];

  const runtime = candidate(
    "sustained_development_focus",
    "runtime",
    ["runtime", "observatory"],
    "Liahona: runtime pipeline and execution activity",
    kin.filter((s) => s.type === "liahona_runtime_activity"),
    project,
    1,
  );
  if (runtime && types.has("liahona_runtime_activity")) out.push(runtime);

  const sources = candidate(
    "ecosystem_expansion",
    "observatory",
    ["observatory", "runtime"],
    "Liahona: source and retrieval systems present",
    kin.filter((s) => s.type === "liahona_source_retrieval"),
    project,
    1,
  );
  if (sources && types.has("liahona_source_retrieval")) out.push(sources);

  const memory = candidate(
    "continuity_consolidation",
    "observatory",
    ["observatory", "archive", "runtime"],
    "Liahona: canonical memory and continuity scopes",
    kin.filter((s) => s.type === "liahona_memory_systems"),
    project,
    1,
  );
  if (memory && types.has("liahona_memory_systems")) out.push(memory);

  const projection = candidate(
    "deployment_progress",
    "relay",
    ["relay", "runtime", "observatory"],
    "Liahona: projection surface under active change",
    kin.filter((s) => s.type === "liahona_projection_surface"),
    project,
    1,
  );
  if (projection && types.has("liahona_projection_surface")) out.push(projection);

  const discord = candidate(
    "deployment_progress",
    "relay",
    ["relay", "runtime"],
    "Liahona: Discord projection continuity active",
    kin.filter((s) => s.type === "liahona_discord_continuity"),
    project,
    1,
  );
  if (discord && types.has("liahona_discord_continuity")) out.push(discord);

  const stable = candidate(
    "deployment_stabilization",
    "runtime",
    ["runtime", "relay"],
    "Liahona: deployment and runtime stabilization",
    kin.filter((s) => s.type === "liahona_runtime_stabilization"),
    project,
    1,
  );
  if (stable && types.has("liahona_runtime_stabilization")) out.push(stable);

  return out;
}
