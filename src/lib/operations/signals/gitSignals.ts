import { execFile } from "child_process";
import { promisify } from "util";
import type { RawScannedProject } from "@/lib/localData/scanners";
import { createSignal } from "./createSignal";
import type { OperationalSignal } from "../types";

const execFileAsync = promisify(execFile);

const GIT_SOURCE = "continuity:git" as const;
const RECENT_COMMIT_MS = 7 * 24 * 60 * 60 * 1000;

async function gitStdout(
  repoPath: string,
  args: string[],
): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("git", args, {
      cwd: repoPath,
      timeout: 8_000,
      maxBuffer: 256 * 1024,
      windowsHide: true,
    });
    return typeof stdout === "string" ? stdout.trim() : null;
  } catch {
    return null;
  }
}

export interface GitRepoScanInput {
  projectId: string;
  repoPath: string;
}

/** Read-only git inspection for one repository path */
export async function deriveGitSignalsForRepo(
  input: GitRepoScanInput,
): Promise<OperationalSignal[]> {
  const { projectId, repoPath } = input;
  const baseMeta = { projectId, repoPath };
  const signals: OperationalSignal[] = [];

  const status = await gitStdout(repoPath, ["status", "--porcelain"]);
  if (status === null) return signals;

  if (status.length > 0) {
    signals.push(
      createSignal({
        source: GIT_SOURCE,
        sector: "forge",
        type: "repo_dirty",
        severity: "medium",
        stableKey: projectId,
        metadata: {
          ...baseMeta,
          changeLines: status.split("\n").filter(Boolean).length,
        },
      }),
    );
  } else {
    signals.push(
      createSignal({
        source: GIT_SOURCE,
        sector: "forge",
        type: "repo_clean",
        severity: "low",
        stableKey: projectId,
        metadata: baseMeta,
      }),
    );
  }

  const branch = await gitStdout(repoPath, ["branch", "--show-current"]);
  if (branch) {
    signals.push(
      createSignal({
        source: GIT_SOURCE,
        sector: "forge",
        type: "branch_detected",
        severity: "low",
        stableKey: `${projectId}:branch`,
        metadata: { ...baseMeta, branch },
      }),
    );
  }

  const commitLine = await gitStdout(repoPath, [
    "log",
    "-1",
    "--format=%H %ct",
  ]);
  if (commitLine) {
    const [hash, epochStr] = commitLine.split(/\s+/, 2);
    const epoch = Number(epochStr);
    const recent =
      Number.isFinite(epoch) && Date.now() - epoch * 1000 <= RECENT_COMMIT_MS;

    if (recent && hash) {
      signals.push(
        createSignal({
          source: GIT_SOURCE,
          sector: "forge",
          type: "recent_commit_detected",
          severity: "medium",
          stableKey: `${projectId}:commit`,
          metadata: {
            ...baseMeta,
            commitHash: hash.slice(0, 12),
            committedAt: new Date(epoch * 1000).toISOString(),
          },
        }),
      );
    }
  }

  const remotes = await gitStdout(repoPath, ["remote"]);
  if (remotes && remotes.length > 0) {
    const names = remotes
      .split("\n")
      .map((line) => line.trim().split(/\s+/)[0])
      .filter(Boolean);

    if (names.length > 0) {
      signals.push(
        createSignal({
          source: GIT_SOURCE,
          sector: "relay",
          type: "remote_detected",
          severity: "low",
          stableKey: `${projectId}:remote`,
          metadata: { ...baseMeta, remotes: names },
        }),
      );
    }
  }

  return signals;
}

/** Derive git operational signals for all scanned projects with a git repo */
export async function deriveGitOperationalSignals(
  projects: Pick<RawScannedProject, "id" | "path" | "hasGit">[],
): Promise<OperationalSignal[]> {
  const out: OperationalSignal[] = [];

  for (const p of projects) {
    if (!p.hasGit) continue;
    const batch = await deriveGitSignalsForRepo({
      projectId: p.id,
      repoPath: p.path,
    });
    out.push(...batch);
  }

  return out;
}
