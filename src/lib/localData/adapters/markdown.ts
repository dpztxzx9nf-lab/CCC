import { readdir, stat } from "fs/promises";
import path from "path";
import { SCAN_IGNORE_DIRS, SCAN_MAX_DEPTH, SCAN_MAX_ENTRIES } from "../config";

const CODE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
]);

export interface WalkStats {
  markdownCount: number;
  fileCount: number;
  recentActivityCount: number;
  recentMarkdownEdits: number;
  recentCodeEdits: number;
  lastModified: Date | null;
  truncated: boolean;
}

function isCodeFile(name: string): boolean {
  const lower = name.toLowerCase();
  for (const ext of CODE_EXTENSIONS) {
    if (lower.endsWith(ext)) return true;
  }
  return false;
}

export async function walkProjectTree(
  rootPath: string,
  recentThresholdMs: number,
): Promise<WalkStats> {
  const stats: WalkStats = {
    markdownCount: 0,
    fileCount: 0,
    recentActivityCount: 0,
    recentMarkdownEdits: 0,
    recentCodeEdits: 0,
    lastModified: null,
    truncated: false,
  };

  let entriesVisited = 0;
  const now = Date.now();

  async function walk(current: string, depth: number): Promise<void> {
    if (depth > SCAN_MAX_DEPTH || entriesVisited >= SCAN_MAX_ENTRIES) {
      stats.truncated = true;
      return;
    }

    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entriesVisited >= SCAN_MAX_ENTRIES) {
        stats.truncated = true;
        return;
      }

      const fullPath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        if (SCAN_IGNORE_DIRS.has(entry.name) || entry.name.startsWith(".")) {
          continue;
        }
        entriesVisited++;
        await walk(fullPath, depth + 1);
        continue;
      }

      if (!entry.isFile()) continue;

      entriesVisited++;
      stats.fileCount++;

      const lower = entry.name.toLowerCase();
      const isMarkdown = lower.endsWith(".md") || lower.endsWith(".mdx");
      const isCode = isCodeFile(entry.name);

      if (isMarkdown) stats.markdownCount++;

      try {
        const fileStat = await stat(fullPath);
        const mtime = fileStat.mtime;
        if (!stats.lastModified || mtime > stats.lastModified) {
          stats.lastModified = mtime;
        }
        if (now - mtime.getTime() <= recentThresholdMs) {
          stats.recentActivityCount++;
          if (isMarkdown) stats.recentMarkdownEdits++;
          if (isCode) stats.recentCodeEdits++;
        }
      } catch {
        /* skip unreadable */
      }
    }
  }

  await walk(rootPath, 0);
  return stats;
}
