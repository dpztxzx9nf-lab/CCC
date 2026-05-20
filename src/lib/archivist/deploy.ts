import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import type { ArchivistConfig } from "@/lib/localData/archivist-config";

const execFileAsync = promisify(execFile);

export interface DeployResult {
  pushed: boolean;
  commitHash: string | null;
  skippedReason: string | null;
}

function run(
  cwd: string,
  command: string,
  args: string[],
): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync(command, args, {
    cwd,
    maxBuffer: 10 * 1024 * 1024,
    windowsHide: true,
  });
}

export async function runBuild(config: ArchivistConfig): Promise<boolean> {
  try {
    await run(config.cccProjectRoot, "npm", ["run", "build"]);
    return true;
  } catch {
    return false;
  }
}

export async function deploySnapshot(
  config: ArchivistConfig,
): Promise<DeployResult> {
  const cwd = config.cccProjectRoot;
  const rel = config.snapshotOutputRelative.replace(/\\/g, "/");

  try {
    const { stdout: statusOut } = await run(cwd, "git", ["status", "--porcelain", rel]);
    if (!statusOut.trim()) {
      return {
        pushed: false,
        commitHash: null,
        skippedReason: "no snapshot changes to commit",
      };
    }

    await run(cwd, "git", ["add", rel]);
    await run(cwd, "git", [
      "commit",
      "-m",
      `chore(archivist): update continuity snapshot`,
    ]);

    const { stdout: hashOut } = await run(cwd, "git", ["rev-parse", "--short", "HEAD"]);
    const commitHash = hashOut.trim();

    await run(cwd, "git", ["push"]);

    return { pushed: true, commitHash, skippedReason: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { pushed: false, commitHash: null, skippedReason: msg };
  }
}
