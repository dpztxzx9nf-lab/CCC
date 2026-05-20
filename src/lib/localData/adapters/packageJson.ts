import { readFile, stat } from "fs/promises";
import path from "path";
import { RECENT_ACTIVITY_MS } from "../config";

export interface PackageJsonInfo {
  present: boolean;
  name: string | null;
  version: string | null;
  description: string | null;
}

const README_CANDIDATES = ["README.md", "readme.md", "Readme.md", "README.MD"];

export async function detectReadme(dirPath: string): Promise<boolean> {
  for (const name of README_CANDIDATES) {
    try {
      await readFile(path.join(dirPath, name));
      return true;
    } catch {
      /* try next */
    }
  }
  return false;
}

export async function isReadmeRecentlyModified(
  dirPath: string,
  thresholdMs: number = RECENT_ACTIVITY_MS,
): Promise<boolean> {
  const now = Date.now();
  for (const name of README_CANDIDATES) {
    try {
      const info = await stat(path.join(dirPath, name));
      if (now - info.mtime.getTime() <= thresholdMs) return true;
    } catch {
      /* try next */
    }
  }
  return false;
}

export async function readPackageJson(dirPath: string): Promise<PackageJsonInfo> {
  const filePath = path.join(dirPath, "package.json");
  try {
    const raw = await readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw) as {
      name?: string;
      version?: string;
      description?: string;
    };
    return {
      present: true,
      name: typeof parsed.name === "string" ? parsed.name : null,
      version: typeof parsed.version === "string" ? parsed.version : null,
      description:
        typeof parsed.description === "string"
          ? parsed.description.slice(0, 200)
          : null,
    };
  } catch {
    return {
      present: false,
      name: null,
      version: null,
      description: null,
    };
  }
}
