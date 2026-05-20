/** Configured local roots — server-only; never sent to client as absolute paths */

export interface LocalSourceRoot {
  slug: string;
  displayName: string;
  /** Absolute path on dev machine only */
  root: string;
}

export const LOCAL_SOURCE_ROOTS: LocalSourceRoot[] = [
  { slug: "ccc", displayName: "CCC", root: "C:\\Projects\\CCC" },
  { slug: "liahona", displayName: "Liahona", root: "C:\\Projects\\Liahona" },
  {
    slug: "thinkcore",
    displayName: "ThinkCore",
    root: "C:\\Projects\\ThinkCore.io",
  },
  {
    slug: "second-brain",
    displayName: "Second Brain",
    root: "C:\\Projects\\SecondBrain",
  },
  { slug: "archive", displayName: "Archive", root: "C:\\Projects\\ARCHIVE" },
];

/** Directories skipped during read-only walks */
export const SCAN_IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "out",
  "coverage",
  ".turbo",
  "__pycache__",
  ".vercel",
  "vendor",
]);

export const SCAN_MAX_DEPTH = 5;
export const SCAN_MAX_ENTRIES = 4000;
export const RECENT_ACTIVITY_MS = 7 * 24 * 60 * 60 * 1000;
