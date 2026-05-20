import { readdir, stat } from "fs/promises";
import path from "path";
import { SCAN_IGNORE_DIRS } from "../config";
import { SNAPSHOT_MAX_PROJECTS_PER_ROOT } from "./config";

export interface TopLevelProject {
  name: string;
  path: string;
  scanRoot: string;
  scanRootId: string;
}

export async function pathAccessible(rootPath: string): Promise<boolean> {
  try {
    const info = await stat(rootPath);
    return info.isDirectory();
  } catch {
    return false;
  }
}

/** List immediate child folders under a scan root. */
export async function listTopLevelProjects(
  scanRootId: string,
  rootPath: string,
): Promise<TopLevelProject[]> {
  const accessible = await pathAccessible(rootPath);
  if (!accessible) return [];

  let entries;
  try {
    entries = await readdir(rootPath, { withFileTypes: true });
  } catch {
    return [];
  }

  const projects: TopLevelProject[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (SCAN_IGNORE_DIRS.has(entry.name) || entry.name.startsWith(".")) continue;

    projects.push({
      name: entry.name,
      path: path.join(rootPath, entry.name),
      scanRoot: rootPath,
      scanRootId,
    });

    if (projects.length >= SNAPSHOT_MAX_PROJECTS_PER_ROOT) break;
  }

  return projects;
}

export function projectSlug(scanRootId: string, folderName: string): string {
  const base = folderName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `${scanRootId}--${base}`.replace(/-+/g, "-").replace(/^-|-$/g, "");
}
