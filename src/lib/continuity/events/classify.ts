import type { SectorId } from "@/data/types";
import { sanitizeContinuityText } from "@/lib/encoding";
import type { SignificanceLevel } from "@/lib/localData/archivist-config";
import type { ConsolidationResult } from "@/lib/archivist/consolidate";
import type { DeployResult } from "@/lib/archivist/deploy";
import type {
  ContinuityEventKind,
  EventImportance,
} from "./types";

export interface ClassifiedOperationalEvent {
  kind: ContinuityEventKind;
  importance: EventImportance;
  title: string;
  summary: string;
  sectors: SectorId[];
  projects: string[];
  significance: SignificanceLevel;
  shouldPersist: boolean;
}

const SECTOR_LABEL: Record<SectorId, string> = {
  core: "Core",
  archive: "Archive",
  forge: "Forge",
  observatory: "Observatory",
  relay: "Relay",
  runtime: "Runtime",
};

function significanceToBaseImportance(
  significance: SignificanceLevel,
): EventImportance {
  switch (significance) {
    case "deploy-worthy":
      return "high";
    case "snapshot":
      return "medium";
    case "observe":
      return "low";
    default:
      return "low";
  }
}

function bumpImportance(
  current: EventImportance,
  delta: 1 | 2,
): EventImportance {
  const order: EventImportance[] = ["low", "medium", "high", "critical"];
  const i = order.indexOf(current);
  return order[Math.min(order.length - 1, i + delta)];
}

export function classifyConsolidation(
  consolidation: ConsolidationResult,
): ClassifiedOperationalEvent | null {
  if (consolidation.significance === "ignore") return null;
  if (consolidation.lockfileOnly && consolidation.significance === "observe") {
    return null;
  }

  const top = consolidation.activities[0];
  const sector = consolidation.topSector ?? top?.sector ?? "forge";
  const projects = consolidation.activities.flatMap((a) => a.projects);
  const uniqueProjects = [...new Set(projects)].slice(0, 6);
  const projectLabel = uniqueProjects[0] ?? "workspace";
  const changeCount = consolidation.filteredChangeCount;
  const score = consolidation.totalScore;

  let kind: ContinuityEventKind = "sector_activity";
  let importance = significanceToBaseImportance(consolidation.significance);
  let title = `${SECTOR_LABEL[sector]} activity`;
  let summary = top?.summary ?? `Operational changes detected in ${projectLabel}.`;

  const sectorCounts = new Map<SectorId, number>();
  for (const a of consolidation.activities) {
    sectorCounts.set(a.sector, (sectorCounts.get(a.sector) ?? 0) + a.changeCount);
  }

  const archiveChanges = sectorCounts.get("archive") ?? 0;
  const runtimeChanges = sectorCounts.get("runtime") ?? 0;
  const observatoryChanges = sectorCounts.get("observatory") ?? 0;

  if (archiveChanges >= 8 && sector === "archive") {
    kind = "archive_consolidation";
    title = "Archive consolidation wave";
    summary = `${archiveChanges} archive-tagged changes across ${uniqueProjects.length || 1} project(s) - knowledge base shift.`;
    if (consolidation.significance !== "observe") {
      importance = bumpImportance(importance, 1);
    }
  } else if (observatoryChanges >= 4 && sector === "observatory") {
    kind = "observatory_scan";
    title = "Observatory scan activity";
    summary = `Indexer, schema, or metrics paths updated (${observatoryChanges} changes).`;
  } else if (runtimeChanges >= 3 && sector === "runtime") {
    kind = "runtime_signal";
    title = "Runtime / infrastructure signal";
    summary = `PM2, deploy, or runtime config touched in ${projectLabel}.`;
    importance = bumpImportance(importance, 1);
  } else if (sector === "runtime" || sector === "relay") {
    kind = "infrastructure_change";
    title = "Infrastructure change";
    summary = `Relay or runtime surface updated - ${changeCount} tracked change(s).`;
  } else if (changeCount >= 12 && score >= 14) {
    kind = "edit_wave";
    title = "Major edit wave";
    summary = `${changeCount} meaningful changes (score ${score}) concentrated in ${SECTOR_LABEL[sector].toLowerCase()}.`;
    importance = bumpImportance(importance, 1);
  } else if (sector === "forge" && changeCount >= 6) {
    kind = "edit_wave";
    title = "Forge edit wave";
    summary = `Source or build files updated across ${uniqueProjects.join(", ") || projectLabel}.`;
  }

  const sectors = consolidation.activities
    .map((a) => a.sector)
    .filter((s, i, arr) => arr.indexOf(s) === i)
    .slice(0, 4);

  return {
    kind,
    importance,
    title: sanitizeContinuityText(title),
    summary: sanitizeContinuityText(summary),
    sectors: sectors.length > 0 ? sectors : [sector],
    projects: uniqueProjects,
    significance: consolidation.significance,
    shouldPersist: true,
  };
}

export function classifySnapshotRefresh(input: {
  projectCount: number;
  signalCount: number;
  manual: boolean;
}): ClassifiedOperationalEvent {
  return {
    kind: "snapshot_refresh",
    importance: "medium",
    title: sanitizeContinuityText("Continuity snapshot refreshed"),
    summary: sanitizeContinuityText(
      input.manual
        ? `Manual snapshot: ${input.projectCount} projects, ${input.signalCount} signals indexed.`
        : `ARCHIVIST wrote continuity snapshot - ${input.projectCount} projects, ${input.signalCount} signals.`,
    ),
    sectors: ["core", "archive"],
    projects: ["ccc"],
    significance: "snapshot",
    shouldPersist: true,
  };
}

export function classifyDeploy(
  deployResult: DeployResult,
  significance: SignificanceLevel,
): ClassifiedOperationalEvent | null {
  if (deployResult.pushed && deployResult.commitHash) {
    return {
      kind: "deploy_published",
      importance: "critical",
      title: sanitizeContinuityText("Deployment published"),
      summary: sanitizeContinuityText(
        `Continuity snapshot pushed to Git (${deployResult.commitHash}) - Vercel deploy may follow.`,
      ),
      sectors: ["relay", "runtime", "core"],
      projects: ["ccc"],
      significance: "deploy-worthy",
      shouldPersist: true,
    };
  }

  if (significance !== "deploy-worthy") return null;

  return {
    kind: "deploy_blocked",
    importance: "high",
    title: sanitizeContinuityText("Deploy-worthy change (not published)"),
    summary: sanitizeContinuityText(
      deployResult.skippedReason ??
        "Changes met deploy threshold but were not pushed (autoDeploy off or gate failed).",
    ),
    sectors: ["relay", "core"],
    projects: ["ccc"],
    significance: "deploy-worthy",
    shouldPersist: true,
  };
}
