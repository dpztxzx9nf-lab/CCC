import { stat } from "fs/promises";
import path from "path";
import type { GitRepoStatus } from "../types";

/** Read-only git presence check — no git commands, no repo mutation */
export async function detectGitRepo(dirPath: string): Promise<GitRepoStatus> {
  try {
    const gitPath = path.join(dirPath, ".git");
    const info = await stat(gitPath);
    if (info.isDirectory() || info.isFile()) return "present";
    return "absent";
  } catch {
    return "absent";
  }
}
