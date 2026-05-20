import type { SectorId } from "@/data/types";
import type { SignificanceLevel } from "@/lib/localData/archivist-config";
import type { ArchivistConfig } from "@/lib/localData/archivist-config";
import type { ClassifiedChange } from "./classify-change";
import { isLockfileOnlyBatch, projectKeyFromPath } from "./noise";

export interface ConsolidatedActivity {
  sector: SectorId;
  score: number;
  changeCount: number;
  projects: string[];
  summary: string;
}

export interface ConsolidationResult {
  rawChangeCount: number;
  filteredChangeCount: number;
  activities: ConsolidatedActivity[];
  topSector: SectorId | null;
  topProject: string | null;
  totalScore: number;
  significance: SignificanceLevel;
  lockfileOnly: boolean;
}

function projectDisplayName(projectKey: string): string {
  const parts = projectKey.split("\\");
  return parts[parts.length - 1] || projectKey;
}

export function consolidateChanges(
  changes: ClassifiedChange[],
  config: ArchivistConfig,
): ConsolidationResult {
  const lockfileOnly = isLockfileOnlyBatch(
    changes.map((c) => c.path),
    (p) => projectKeyFromPath(p, config.watchRoots),
  );

  const bySector = new Map<SectorId, ConsolidatedActivity>();

  for (const ch of changes) {
    const cur = bySector.get(ch.sector) ?? {
      sector: ch.sector,
      score: 0,
      changeCount: 0,
      projects: [],
      summary: "",
    };
    cur.score += ch.points;
    cur.changeCount += 1;
    const name = projectDisplayName(ch.projectKey);
    if (!cur.projects.includes(name)) cur.projects.push(name);
    bySector.set(ch.sector, cur);
  }

  const activities = [...bySector.values()].sort((a, b) => b.score - a.score);

  for (const a of activities) {
    const proj = a.projects[0] ?? "unknown";
    a.summary = `${capitalize(a.sector)} activity in ${proj}`;
  }

  const totalScore = activities.reduce((n, a) => n + a.score, 0);
  const top = activities[0] ?? null;

  let significance = scoreToSignificance(totalScore, config);

  if (lockfileOnly && significance !== "ignore") {
    significance = significance === "deploy-worthy" ? "snapshot" : "observe";
  }

  return {
    rawChangeCount: changes.length,
    filteredChangeCount: changes.length,
    activities,
    topSector: top?.sector ?? null,
    topProject: top?.projects[0] ?? null,
    totalScore,
    significance,
    lockfileOnly,
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function scoreToSignificance(
  totalScore: number,
  config: ArchivistConfig,
): SignificanceLevel {
  const t = config.significanceThreshold;
  if (totalScore >= t.deploy) return "deploy-worthy";
  if (totalScore >= t.snapshot) return "snapshot";
  if (totalScore >= t.observe) return "observe";
  return "ignore";
}
