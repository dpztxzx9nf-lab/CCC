/** ARCHIVIST-0 consolidation agent configuration */

import type { SectorId } from "@/data/types";

export type SignificanceLevel = "ignore" | "observe" | "snapshot" | "deploy-worthy";

export interface ArchivistWatchRoot {
  id: string;
  path: string;
  /** Scan this root itself as a project, not only immediate child folders. */
  includeRoot?: boolean;
}

export interface SignificanceThresholds {
  /** Below this: ignore */
  observe: number;
  /** At or above: generate snapshot (if autoSnapshot) */
  snapshot: number;
  /** At or above: deploy-worthy (if autoDeploy + build passes) */
  deploy: number;
}

export interface ArchivistConfig {
  watchRoots: ArchivistWatchRoot[];
  autoSnapshot: boolean;
  autoDeploy: boolean;
  deployCooldownMinutes: number;
  debounceSeconds: number;
  significanceThreshold: SignificanceThresholds;
  /** CCC repo root for snapshot output and optional deploy */
  cccProjectRoot: string;
  snapshotOutputRelative: string;
  /** Persisted continuity event log (operational memory) */
  eventsOutputRelative: string;
  eventsMaxCount: number;
  /** Max normalized operational events persisted (rolling window) */
  operationalEventsMaxCount: number;
  operationalEventsMaxAgeDays: number;
  eventsMaxAgeDays: number;
  eventsCoalesceWindowMs: number;
}

export const ARCHIVIST_IGNORE_DIRS = new Set([
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
  ".cache",
  "logs",
]);

export const ARCHIVIST_LOCKFILES = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lockb",
  "npm-shrinkwrap.json",
]);

/** Meaningful log files (not generic logs/) */
export const ARCHIVIST_MEANINGFUL_LOG_PATTERNS = [
  /deploy\.log$/i,
  /build\.log$/i,
  /error\.log$/i,
];

export const DEFAULT_ARCHIVIST_CONFIG: ArchivistConfig = {
  watchRoots: [
    { id: "projects", path: "C:\\Projects" },
    { id: "kindex", path: "C:\\Projects\\KINDEX", includeRoot: true },
    { id: "liahona", path: "C:\\Projects\\Liahona", includeRoot: true },
    { id: "secondbrain-nested", path: "C:\\Projects\\SecondBrain" },
    { id: "archive-nested", path: "C:\\Projects\\ARCHIVE" },
    { id: "secondbrain-root", path: "C:\\SecondBrain" },
    { id: "archive-root", path: "C:\\ARCHIVE" },
  ],
  autoSnapshot: true,
  autoDeploy: false,
  deployCooldownMinutes: 10,
  debounceSeconds: 60,
  significanceThreshold: {
    observe: 4,
    snapshot: 14,
    deploy: 48,
  },
  cccProjectRoot: "C:\\Projects\\CCC",
  snapshotOutputRelative: "public/continuity-snapshot.json",
  eventsOutputRelative: "public/continuity-events.json",
  eventsMaxCount: 400,
  operationalEventsMaxCount: 250,
  operationalEventsMaxAgeDays: 90,
  eventsMaxAgeDays: 90,
  eventsCoalesceWindowMs: 120_000,
};

/** Sector weights for path-based change classification */
export const CHANGE_SECTOR_HINTS: Record<SectorId, RegExp[]> = {
  core: [
    /\\ccc\\/,
    /continuity-command/i,
    /archivist/i,
    /megastructure/i,
    /liahona.*(authority|governance|policy|config)/i,
    /\\liahona\\.*(authority|governance|policy|config)/i,
  ],
  archive: [
    /\.md$/i,
    /\.mdx$/i,
    /\.obsidian/,
    /secondbrain/i,
    /\\archive\\/i,
    /vault/i,
    /\\kindex\\.*(discord|forum|message|messages)/i,
    /\\liahona\\.*(source|sources|grounding|docs|document|corpus)/i,
  ],
  forge: [
    /\.tsx?$/i,
    /\.jsx?$/i,
    /\.mjs$/i,
    /package\.json$/,
    /tsconfig/i,
    /next\.config/i,
  ],
  runtime: [
    /ecosystem\.config/i,
    /pm2/i,
    /dockerfile/i,
    /docker-compose/i,
    /\.env\.production/i,
    /vercel\.json$/i,
    /\\kindex\\.*(bot|runtime|pm2|ecosystem)/i,
    /\\liahona\\.*(app|api|runtime|pm2|vercel|ecosystem)/i,
  ],
  relay: [
    /\\public\\/,
    /deploy/i,
    /\.github\\workflows/,
    /thinkcore/i,
    /website/i,
    /\\kindex\\.*(announcement|announcements|public|comms|communication)/i,
  ],
  observatory: [
    /prisma/i,
    /schema\.sql/i,
    /indexer/i,
    /scanner/i,
    /metrics/i,
    /kindex/i,
    /\\kindex\\.*(semantic|semantics|continuity|index|indexing)/i,
    /\\liahona\\.*(retrieval|index|indexing|search|embedding|embeddings)/i,
  ],
};

export function getArchivistConfig(): ArchivistConfig {
  return { ...DEFAULT_ARCHIVIST_CONFIG };
}
