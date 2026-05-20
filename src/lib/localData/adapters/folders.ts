import { readdir, stat } from "fs/promises";
import path from "path";
import { SCAN_IGNORE_DIRS } from "../config";

export interface FolderListing {
  subfolderCount: number;
  childProjectDirs: { name: string; absolutePath: string }[];
}

export async function listProjectFolder(
  rootPath: string,
): Promise<FolderListing | null> {
  try {
    const entries = await readdir(rootPath, { withFileTypes: true });
    const dirs = entries.filter((e) => e.isDirectory());
    const childProjectDirs: { name: string; absolutePath: string }[] = [];

    for (const dir of dirs) {
      if (SCAN_IGNORE_DIRS.has(dir.name) || dir.name.startsWith(".")) continue;
      childProjectDirs.push({
        name: dir.name,
        absolutePath: path.join(rootPath, dir.name),
      });
    }

    return {
      subfolderCount: childProjectDirs.length,
      childProjectDirs,
    };
  } catch {
    return null;
  }
}

export async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

export function formatDisplayName(folderName: string): string {
  return folderName
    .replace(/[-_]/g, " ")
    .replace(/\.(io|ai)$/i, "")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}
