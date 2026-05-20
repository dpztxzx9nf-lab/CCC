import type { SectorId } from "@/data/types";
import {
  CHANGE_SECTOR_HINTS,
  type ArchivistWatchRoot,
} from "@/lib/localData/archivist-config";
import path from "path";
import { sanitizeContinuityText } from "@/lib/encoding";
import { isLockfile, isSourceLike, projectKeyFromPath } from "./noise";

export interface ClassifiedChange {
  path: string;
  projectKey: string;
  sector: SectorId;
  points: number;
  label: string;
}

const ALL_SECTORS: SectorId[] = [
  "core",
  "archive",
  "forge",
  "observatory",
  "relay",
  "runtime",
];

function scorePath(filePath: string): { sector: SectorId; points: number; label: string } {
  const normalized = filePath.replace(/\//g, "\\");
  const base = path.basename(normalized);
  const lower = normalized.toLowerCase();

  const scores: Record<SectorId, number> = {
    core: 0,
    archive: 0,
    forge: 0,
    observatory: 0,
    relay: 0,
    runtime: 0,
  };

  for (const sector of ALL_SECTORS) {
    for (const re of CHANGE_SECTOR_HINTS[sector]) {
      if (re.test(normalized) || re.test(base)) {
        scores[sector] += sector === "archive" && /\.mdx?$/i.test(base) ? 6 : 5;
      }
    }
  }

  if (isLockfile(filePath)) scores.forge += 1;
  if (isSourceLike(filePath)) scores.forge += 4;
  if (/\\ccc\\/.test(lower)) scores.core += 12;
  if (/continuity-snapshot\.json/.test(lower)) scores.core += 15;

  let best: SectorId = "forge";
  let bestScore = 0;
  for (const [s, v] of Object.entries(scores) as [SectorId, number][]) {
    if (v > bestScore) {
      bestScore = v;
      best = s;
    }
  }

  const points = Math.max(2, bestScore);
  const label = sanitizeContinuityText(`${base} -> ${best}`);
  return { sector: best, points, label };
}

export function classifyFileChange(
  filePath: string,
  watchRoots: ArchivistWatchRoot[],
): ClassifiedChange {
  const projectKey = projectKeyFromPath(filePath, watchRoots);
  const { sector, points, label } = scorePath(filePath);
  return {
    path: path.resolve(filePath),
    projectKey,
    sector,
    points,
    label,
  };
}
