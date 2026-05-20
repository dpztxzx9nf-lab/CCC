import { readdir, stat } from "fs/promises";
import path from "path";

export interface ObsidianScanResult {
  obsidianVault: boolean;
  vaultPath: string | null;
}

/** Detect .obsidian at project root or one level down. */
export async function scanObsidian(projectPath: string): Promise<ObsidianScanResult> {
  if (await hasObsidianDir(projectPath)) {
    return { obsidianVault: true, vaultPath: projectPath };
  }

  try {
    const entries = await readdir(projectPath, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
      const child = path.join(projectPath, entry.name);
      if (await hasObsidianDir(child)) {
        return { obsidianVault: true, vaultPath: child };
      }
    }
  } catch {
    /* unreadable */
  }

  return { obsidianVault: false, vaultPath: null };
}

async function hasObsidianDir(dirPath: string): Promise<boolean> {
  try {
    const info = await stat(path.join(dirPath, ".obsidian"));
    return info.isDirectory();
  } catch {
    return false;
  }
}
