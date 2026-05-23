import { execFile } from "child_process";
import { promisify } from "util";
import type { RawScannedProject } from "@/lib/localData/scanners";
import { createSignal } from "./createSignal";
import type { OperationalSignal, OperationalSignalSeverity, Sector } from "../types";

const execFileAsync = promisify(execFile);

const GIT_SOURCE = "continuity:git" as const;
const RECENT_COMMIT_MS = 7 * 24 * 60 * 60 * 1000;

const DEPLOYMENT_PATH_RE =
  /(^|\/)(vercel\.json|netlify\.toml|Dockerfile|docker-compose\.ya?ml|deploy|deployment|release|public|scripts\/deploy|\.github\/workflows)(\/|$)/i;
const INFRA_PATH_RE =
  /(^|\/)(next\.config\.[cm]?[jt]s|tsconfig\.json|eslint\.config\.[cm]?[jt]s|postcss\.config\.[cm]?[jt]s|tailwind\.config\.[cm]?[jt]s|package-lock\.json|pnpm-lock\.yaml|yarn\.lock|package\.json|\.env|config|ops|infra|ecosystem\.config\.[cm]?[jt]s|pm2\.config\.[cm]?[jt]s)(\/|$)/i;
const DOCS_PATH_RE =
  /(^|\/)(README\.md|AGENTS\.md|docs|data\/projects|continuity|archive|\.md$|\.mdx$)(\/|$)/i;

interface LatestCommit {
  hash: string;
  message: string;
  committedAt: string;
  recent: boolean;
}

interface AheadBehind {
  ahead: number;
  behind: number;
}

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

export function parsePorcelainPaths(status: string): string[] {
  return status
    .split("\n")
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => {
      const raw = line.slice(3).trim();
      const renameTarget = raw.includes(" -> ") ? raw.split(" -> ").at(-1) : raw;
      return (renameTarget ?? raw).replace(/^"|"$/g, "");
    })
    .filter(Boolean);
}

export function gitSectorForPath(filePath: string): Sector {
  const normalized = filePath.replace(/\\/g, "/");
  if (DOCS_PATH_RE.test(normalized)) return "archive";
  if (INFRA_PATH_RE.test(normalized)) return "core";
  if (DEPLOYMENT_PATH_RE.test(normalized)) return "relay";
  return "forge";
}

function pathSummary(paths: string[]): Record<Sector, string[]> {
  return paths.reduce(
    (acc, filePath) => {
      acc[gitSectorForPath(filePath)].push(filePath);
      return acc;
    },
    {
      core: [],
      archive: [],
      forge: [],
      relay: [],
      runtime: [],
      observatory: [],
    } as Record<Sector, string[]>,
  );
}

function gitChangeTypeForSector(sector: Sector): string {
  if (sector === "archive") return "git_docs_continuity_changed";
  if (sector === "core") return "git_infrastructure_changed";
  if (sector === "relay") return "git_deployment_changed";
  return "git_code_changed";
}

function severityForCount(count: number): OperationalSignalSeverity {
  if (count >= 12) return "high";
  if (count >= 4) return "medium";
  return "low";
}

export function parseLatestCommit(raw: string | null): LatestCommit | null {
  if (!raw) return null;
  const [hash, message, committedAt] = raw.split("\0");
  if (!hash || !committedAt) return null;
  const time = Date.parse(committedAt);
  return {
    hash,
    message: message ?? "",
    committedAt,
    recent: Number.isFinite(time) && Date.now() - time <= RECENT_COMMIT_MS,
  };
}

export function parseAheadBehind(raw: string | null): AheadBehind | null {
  if (!raw) return null;
  const [behindRaw, aheadRaw] = raw.trim().split(/\s+/, 2);
  const behind = Number(behindRaw);
  const ahead = Number(aheadRaw);
  if (!Number.isFinite(ahead) || !Number.isFinite(behind)) return null;
  return { ahead, behind };
}

function pushChangeSignals(input: {
  signals: OperationalSignal[];
  paths: string[];
  projectId: string;
  repoPath: string;
  branch: string | null;
  commit?: LatestCommit | null;
  stableScope: string;
  dirty: boolean;
}): void {
  const grouped = pathSummary(input.paths);

  for (const sector of ["archive", "core", "relay", "forge"] as const) {
    const paths = grouped[sector];
    if (paths.length === 0) continue;
    input.signals.push(
      createSignal({
        source: GIT_SOURCE,
        sector,
        type: gitChangeTypeForSector(sector),
        severity: severityForCount(paths.length),
        stableKey: `${input.projectId}:${input.stableScope}:${sector}`,
        metadata: {
          projectId: input.projectId,
          repoPath: input.repoPath,
          branch: input.branch,
          paths: paths.slice(0, 24),
          pathCount: paths.length,
          dirty: input.dirty,
          ...(input.commit
            ? {
                commitHash: input.commit.hash.slice(0, 12),
                commitMessage: input.commit.message,
                committedAt: input.commit.committedAt,
              }
            : {}),
        },
      }),
    );
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

  const [status, branch, commitRaw, remotes, aheadBehindRaw, commitFilesRaw] =
    await Promise.all([
      gitStdout(repoPath, ["status", "--porcelain"]),
      gitStdout(repoPath, ["branch", "--show-current"]),
      gitStdout(repoPath, ["log", "-1", "--format=%H%x00%s%x00%cI"]),
      gitStdout(repoPath, ["remote"]),
      gitStdout(repoPath, ["rev-list", "--left-right", "--count", "@{upstream}...HEAD"]),
      gitStdout(repoPath, ["diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD"]),
    ]);
  if (status === null) return signals;

  const latestCommit = parseLatestCommit(commitRaw);
  const aheadBehind = parseAheadBehind(aheadBehindRaw);
  const dirtyPaths = parsePorcelainPaths(status);
  const branchName = branch && branch.length > 0 ? branch : null;
  const gitMeta = {
    ...baseMeta,
    branch: branchName,
    ahead: aheadBehind?.ahead ?? null,
    behind: aheadBehind?.behind ?? null,
    latestCommitHash: latestCommit?.hash.slice(0, 12) ?? null,
    latestCommitMessage: latestCommit?.message ?? null,
    latestCommitTime: latestCommit?.committedAt ?? null,
  };

  if (status.length > 0) {
    signals.push(
      createSignal({
        source: GIT_SOURCE,
        sector: "forge",
        type: "repo_dirty",
        severity: "medium",
        stableKey: projectId,
        metadata: {
          ...gitMeta,
          changeLines: dirtyPaths.length,
          paths: dirtyPaths.slice(0, 24),
        },
      }),
    );
    pushChangeSignals({
      signals,
      paths: dirtyPaths,
      projectId,
      repoPath,
      branch: branchName,
      stableScope: "dirty",
      dirty: true,
    });
  } else {
    signals.push(
      createSignal({
        source: GIT_SOURCE,
        sector: "forge",
        type: "repo_clean",
        severity: "low",
        stableKey: projectId,
        metadata: gitMeta,
      }),
    );
  }

  if (branchName) {
    signals.push(
      createSignal({
        source: GIT_SOURCE,
        sector: "forge",
        type: "branch_detected",
        severity: "low",
        stableKey: `${projectId}:branch`,
        metadata: gitMeta,
      }),
    );
  }

  if (latestCommit) {
    signals.push(
      createSignal({
        source: GIT_SOURCE,
        sector: "forge",
        type: "latest_commit_detected",
        severity: latestCommit.recent ? "medium" : "low",
        stableKey: `${projectId}:latest-commit`,
        metadata: {
          ...gitMeta,
          commitHash: latestCommit.hash.slice(0, 12),
          commitMessage: latestCommit.message,
          committedAt: latestCommit.committedAt,
        },
      }),
    );

    if (latestCommit.recent) {
      signals.push(
        createSignal({
          source: GIT_SOURCE,
          sector: "forge",
          type: "recent_commit_detected",
          severity: "medium",
          stableKey: `${projectId}:commit`,
          metadata: {
            ...gitMeta,
            commitHash: latestCommit.hash.slice(0, 12),
            commitMessage: latestCommit.message,
            committedAt: latestCommit.committedAt,
          },
        }),
      );
    }

    const commitPaths = commitFilesRaw
      ? commitFilesRaw.split("\n").map((line) => line.trim()).filter(Boolean)
      : [];
    pushChangeSignals({
      signals,
      paths: commitPaths,
      projectId,
      repoPath,
      branch: branchName,
      commit: latestCommit,
      stableScope: `commit:${latestCommit.hash.slice(0, 12)}`,
      dirty: false,
    });
  }

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
          metadata: { ...gitMeta, remotes: names },
        }),
      );
    }
  }

  if (aheadBehind && aheadBehind.ahead > 0) {
    signals.push(
      createSignal({
        source: GIT_SOURCE,
        sector: "relay",
        type: "repo_ahead",
        severity: aheadBehind.ahead >= 3 ? "medium" : "low",
        stableKey: `${projectId}:ahead`,
        metadata: gitMeta,
      }),
    );
  }

  if (aheadBehind && aheadBehind.behind > 0) {
    signals.push(
      createSignal({
        source: GIT_SOURCE,
        sector: "relay",
        type: "repo_behind",
        severity: aheadBehind.behind >= 3 ? "medium" : "low",
        stableKey: `${projectId}:behind`,
        metadata: gitMeta,
      }),
    );
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
