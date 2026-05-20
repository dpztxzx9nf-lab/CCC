import { readPackageJson } from "../adapters/packageJson";
import { formatDisplayName } from "../adapters/folders";
import { getSnapshotScanRoots, SNAPSHOT_RECENT_MS } from "./config";
import { classifySector } from "./classify";
import { scanProjectClues } from "./clues";
import { detectGitRepo } from "./git";
import { walkProjectTree } from "./markdown";
import { scanObsidian } from "./obsidian";
import { scanPm2 } from "./pm2";
import {
  listTopLevelProjects,
  pathAccessible,
  projectSlug,
  type TopLevelProject,
} from "./projects";
import { inferLikelyStack } from "./stack";

export interface RawScannedProject {
  id: string;
  name: string;
  path: string;
  scanRoot: string;
  scanRootId: string;
  hasPackageJson: boolean;
  hasGit: boolean;
  markdownCount: number;
  lastModified: string | null;
  runtimeCapable: boolean;
  likelyStack: string[];
  sectorClassification: ReturnType<typeof classifySector>;
  activityScore: number;
  recentActivityCount: number;
  obsidianVault: boolean;
  fileCount: number;
  recentMarkdownEdits: number;
  recentCodeEdits: number;
}

function deriveActivityScore(input: {
  walk: Awaited<ReturnType<typeof walkProjectTree>>;
  hasGit: boolean;
  recentActivityCount: number;
}): number {
  let score = 0;
  if (input.recentActivityCount > 0) {
    score += Math.min(40, input.recentActivityCount * 4);
  }
  if (input.walk.recentMarkdownEdits > 0) {
    score += Math.min(25, input.walk.recentMarkdownEdits * 5);
  }
  if (input.walk.recentCodeEdits > 0) {
    score += Math.min(35, input.walk.recentCodeEdits * 6);
  }
  if (input.hasGit && input.walk.recentCodeEdits > 0) score += 8;
  return Math.min(100, score);
}

export async function scanTopLevelProject(
  entry: TopLevelProject,
): Promise<RawScannedProject> {
  const [pkg, gitStatus, walk, pm2, obsidian, clues] = await Promise.all([
    readPackageJson(entry.path),
    detectGitRepo(entry.path),
    walkProjectTree(entry.path, SNAPSHOT_RECENT_MS),
    scanPm2(entry.path),
    scanObsidian(entry.path),
    scanProjectClues(entry.path, entry.name),
  ]);

  const hasGit = gitStatus === "present";
  const likelyStack = await inferLikelyStack(entry.path, walk);
  const classificationInput = {
    name: entry.name,
    hasPackageJson: pkg.present,
    hasGit,
    walk,
    pm2,
    obsidian,
    clues,
    likelyStack,
  };

  const sectorClassification = classifySector(classificationInput);
  const recentActivityCount = walk.recentActivityCount;
  const activityScore = deriveActivityScore({ walk, hasGit, recentActivityCount });

  return {
    id: projectSlug(entry.scanRootId, entry.name),
    name: formatDisplayName(entry.name),
    path: entry.path,
    scanRoot: entry.scanRoot,
    scanRootId: entry.scanRootId,
    hasPackageJson: pkg.present,
    hasGit,
    markdownCount: walk.markdownCount,
    lastModified: walk.lastModified?.toISOString() ?? null,
    runtimeCapable: pm2.runtimeCapable,
    likelyStack,
    sectorClassification,
    activityScore,
    recentActivityCount,
    obsidianVault: obsidian.obsidianVault,
    fileCount: walk.fileCount,
    recentMarkdownEdits: walk.recentMarkdownEdits,
    recentCodeEdits: walk.recentCodeEdits,
  };
}

export interface FullScanResult {
  projects: RawScannedProject[];
  scanRoots: {
    id: string;
    path: string;
    accessible: boolean;
    projectCount: number;
  }[];
}

/** Scan all configured roots — read-only, real filesystem. */
export async function scanAllSnapshotRoots(): Promise<FullScanResult> {
  const projects: RawScannedProject[] = [];
  const scanRoots: FullScanResult["scanRoots"] = [];

  for (const root of getSnapshotScanRoots()) {
    const accessible = await pathAccessible(root.path);
    const entries = accessible ? await listTopLevelProjects(root.id, root.path) : [];

    scanRoots.push({
      id: root.id,
      path: root.path,
      accessible,
      projectCount: entries.length,
    });

    for (const entry of entries) {
      try {
        projects.push(await scanTopLevelProject(entry));
      } catch {
        /* skip unreadable project */
      }
    }
  }

  return { projects, scanRoots };
}

export { SNAPSHOT_SCAN_ROOTS } from "./config";
