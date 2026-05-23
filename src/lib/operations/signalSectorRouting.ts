import type { SectorId } from "@/data/types";
import { ALL_SECTOR_IDS, type ActivityKind } from "@/lib/operations/taxonomy";
import type { OperationalSignal } from "./types";

/**
 * Route signal types to projection sectors.
 * Falls back to declared signal.sector when type is generic.
 */
export function resolveProjectionSector(signal: OperationalSignal): SectorId {
  const t = signal.type.toLowerCase();
  const src = signal.source.toLowerCase();
  const blob = `${t} ${src}`;

  if (/^kindex_/.test(t) || src.includes("continuity:kindex")) {
    if (/discord.*architecture|philosophy|semantic|ontology|index|cross|ecosystem|initiative|pressure/.test(t)) {
      return "observatory";
    }
    if (/discord.*community|announcement|public|communication|relay/.test(t)) {
      return "relay";
    }
    if (/discord.*runtime|runtime|bot|pm2/.test(t)) return "runtime";
    if (/discord.*forge|build|deploy|code/.test(t)) return "forge";
    if (/discord|forum|message|archive|consolidation|growth|density|knowledge/.test(t)) {
      return "archive";
    }
    return "core";
  }
  if (/^liahona_/.test(t) || src.includes("continuity:liahona")) {
    if (/authority|governance|config/.test(t)) return "core";
    if (/grounding|docs|archive/.test(t)) return "archive";
    if (/forge|build|code/.test(t)) return "forge";
    if (/discord|projection|relay/.test(t)) return "relay";
    if (/source|memory|retrieval|index/.test(t)) return "observatory";
    return "runtime";
  }

  if (/^historical_/.test(t) || src.includes("continuity:historical")) {
    if (/runtime_instability/.test(t)) return "runtime";
    if (/deployment_build/.test(t)) return "relay";
    return signal.sector;
  }

  if (/git_docs_continuity/.test(t)) return "archive";
  if (/git_infrastructure/.test(t)) return "core";
  if (/git_deployment|repo_ahead|repo_behind|remote_detected/.test(t)) {
    return "relay";
  }
  if (/git_code|latest_commit|recent_commit|repo_dirty|repo_clean|branch_detected/.test(t)) {
    return "forge";
  }

  if (
    /repo_|branch_|commit_|build_|package|forge|code_changed|git/.test(blob)
  ) {
    return "forge";
  }
  if (/pm2|ecosystem|runtime|docker|vercel|build_success|build_failure/.test(blob)) {
    return "runtime";
  }
  if (/markdown|obsidian|journal|vault|archive|documentation|\.md/.test(blob)) {
    return "archive";
  }
  if (/remote|deploy|publish|relay|discord|social|thinkcore/.test(blob)) {
    return "relay";
  }
  if (/scan|index|import|observatory|metrics|prisma|migrate/.test(blob)) {
    return "observatory";
  }
  if (/continuity|archivist|snapshot|ccc|core|governance/.test(blob)) {
    return "core";
  }

  const declared = signal.sector as SectorId;
  if (ALL_SECTOR_IDS.includes(declared)) return declared;
  return "forge";
}

export function secondarySectorsForSignal(signal: OperationalSignal): SectorId[] {
  const primary = resolveProjectionSector(signal);
  const t = signal.type.toLowerCase();
  const extra: SectorId[] = [];

  if (/^kindex_/.test(t)) {
    extra.push("archive", "observatory", "runtime", "relay", "forge", "core");
  }
  if (/^liahona_/.test(t)) {
    extra.push("core", "archive", "observatory", "runtime", "forge");
  }
  if (/^historical_/.test(t)) {
    if (/deployment_build/.test(t)) extra.push("forge", "runtime");
    if (/runtime_instability/.test(t)) extra.push("forge");
  }
  if (/git_deployment|repo_ahead|repo_behind|remote_detected/.test(t)) {
    extra.push("forge", "runtime");
  }
  if (/git_infrastructure/.test(t)) extra.push("forge");
  if (/git_docs_continuity/.test(t)) extra.push("forge", "archive");
  if (t === "remote_detected" && primary === "relay") extra.push("forge");
  if (/deploy/.test(t)) extra.push("runtime", "relay");
  if (/build_/.test(t)) extra.push("runtime");
  if (/recent_commit/.test(t) && primary === "forge") extra.push("relay");

  return extra.filter((s) => s !== primary);
}

export function signalTypeToActivityKind(type: string): ActivityKind {
  const t = type.toLowerCase();
  if (/remote|publish|discord|social/.test(t)) return "communications";
  if (/historical_sustained_runtime_instability/.test(t)) return "runtime";
  if (/historical_deployment_build_cycle/.test(t)) return "deployment";
  if (/historical_/.test(t)) return "continuity";
  if (/git_deployment|repo_ahead|repo_behind/.test(t)) return "deployment";
  if (/git_infrastructure/.test(t)) return "architecture";
  if (/git_docs_continuity/.test(t)) return "archive";
  if (/latest_commit|recent_commit|git_code/.test(t)) return "forge";
  if (/deploy/.test(t)) return "deployment";
  if (/repo_|branch|commit|build|package|forge|git/.test(t)) return "forge";
  if (/pm2|runtime|docker|ecosystem|vercel/.test(t)) return "runtime";
  if (/markdown|obsidian|journal|vault|archive/.test(t)) return "archive";
  if (/scan|index|import|metrics|observatory/.test(t)) return "observability";
  if (/continuity|snapshot|archivist/.test(t)) return "continuity";
  if (/documentation|readme/.test(t)) return "documentation";
  return "architecture";
}
