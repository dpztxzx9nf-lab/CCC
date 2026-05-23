/** ARCHIVIST-0 snapshot scan roots — derived from archivist-config */

import { getArchivistConfig } from "../archivist-config";

export interface SnapshotScanRoot {
  id: string;
  path: string;
  includeRoot?: boolean;
}

export function getSnapshotScanRoots(): SnapshotScanRoot[] {
  const cfg = getArchivistConfig();
  const seen = new Set<string>();
  const roots: SnapshotScanRoot[] = [];

  for (const r of cfg.watchRoots) {
    const key = r.path.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    roots.push({ id: r.id, path: r.path, includeRoot: r.includeRoot });
  }

  return roots;
}

/** @deprecated use getSnapshotScanRoots() */
export const SNAPSHOT_SCAN_ROOTS: SnapshotScanRoot[] = getSnapshotScanRoots();

export const SNAPSHOT_RECENT_MS = 7 * 24 * 60 * 60 * 1000;
export const SNAPSHOT_MAX_PROJECTS_PER_ROOT = 80;
