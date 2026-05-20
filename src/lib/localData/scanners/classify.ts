import type { SectorId } from "@/data/types";
import type { WalkStats } from "./markdown";
import type { ObsidianScanResult } from "./obsidian";
import type { Pm2ScanResult } from "./pm2";
import type { ProjectClues } from "./clues";

export interface ClassificationInput {
  name: string;
  hasPackageJson: boolean;
  hasGit: boolean;
  walk: WalkStats;
  pm2: Pm2ScanResult;
  obsidian: ObsidianScanResult;
  clues: ProjectClues;
  likelyStack: string[];
}

/** Sector classification from real filesystem markers — highest score wins. */
export function classifySector(input: ClassificationInput): SectorId {
  const scores: Record<SectorId, number> = {
    core: 0,
    archive: 0,
    forge: 0,
    observatory: 0,
    relay: 0,
    runtime: 0,
  };

  const mdRatio =
    input.walk.fileCount > 0
      ? input.walk.markdownCount / input.walk.fileCount
      : 0;

  if (input.clues.metaControlClues) scores.core += 35;
  if (/secondbrain|continuity|ccc/i.test(input.name)) scores.core += 20;

  if (input.obsidian.obsidianVault) scores.archive += 45;
  if (input.walk.markdownCount >= 15 && mdRatio >= 0.2) scores.archive += 30;
  if (input.walk.recentMarkdownEdits > 0) scores.archive += 15;
  if (/archive|vault|journal|obsidian|brain/i.test(input.name)) scores.archive += 25;

  if (input.hasPackageJson) scores.forge += 20;
  if (input.likelyStack.includes("typescript") || input.likelyStack.includes("javascript")) {
    scores.forge += 25;
  }
  if (input.hasGit && input.walk.recentCodeEdits > 0) scores.forge += 30;
  if (input.walk.recentCodeEdits > 0) scores.forge += 10;

  if (input.pm2.runtimeCapable) scores.runtime += 35;
  if (input.pm2.pm2ConfigPresent) scores.runtime += 25;
  if (/runtime|server|api|nlo|game/i.test(input.name)) scores.runtime += 15;

  if (input.clues.deploymentClues) scores.relay += 30;
  if (input.pm2.hasDeployScript) scores.relay += 15;
  if (/thinkcore|website|relay|broadcast|io$/i.test(input.name)) scores.relay += 20;

  if (input.clues.indexingClues) scores.observatory += 35;
  if (/index|scout|metrics|scan|observatory|kindex/i.test(input.name)) {
    scores.observatory += 25;
  }

  let best: SectorId = "forge";
  let bestScore = -1;
  for (const [sector, score] of Object.entries(scores) as [SectorId, number][]) {
    if (score > bestScore) {
      bestScore = score;
      best = sector;
    }
  }

  if (bestScore <= 0) {
    if (input.obsidian.obsidianVault || input.walk.markdownCount > input.walk.recentCodeEdits) {
      return "archive";
    }
    if (input.hasPackageJson) return "forge";
    return "archive";
  }

  return best;
}
