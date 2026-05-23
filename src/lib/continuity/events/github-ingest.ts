import { readFile } from "fs/promises";
import path from "path";
import type { SectorId } from "@/data/types";
import { OPERATOR_IDS, type OperatorId } from "@/lib/operations/taxonomy";
import {
  gitHubPayloadDedupeKey,
  gitHubPayloadsToContinuityEvents,
  type GitHubContinuityContext,
  type GitHubContinuityPayload,
  type GitHubRepositoryRef,
} from "./github";
import type { ContinuityEvent } from "./types";

export interface GitHubRepositoryMapping {
  projectId: string;
  repository: GitHubRepositoryRef;
  sectors: SectorId[];
  operators: OperatorId[];
}

export interface GitHubCheckpointFile {
  version: 1;
  updatedAt: string;
  repositories: Record<string, { seenDedupeKeys?: string[] }>;
}

export interface GitHubDryRunEventRow {
  kind: ContinuityEvent["kind"];
  projectId: string;
  sectors: SectorId[];
  key: string;
  occurredAt: string;
  status: "accepted" | "deduped";
  summary: string;
}

export interface GitHubDryRunResult {
  mode: "fixture" | "live";
  checkpointPath: string;
  checkpointLoaded: boolean;
  mappings: GitHubRepositoryMapping[];
  skipped: string[];
  rows: GitHubDryRunEventRow[];
  candidateCount: number;
  dedupedCount: number;
  acceptedCount: number;
  diagnostics: string[];
}

interface RegistryProjectRaw {
  id?: unknown;
  domainIds?: unknown;
  operatorIds?: unknown;
  urls?: unknown;
  github?: unknown;
  archivedAt?: unknown;
}

function repositoryName(ref: GitHubRepositoryRef): string {
  return `${ref.owner}/${ref.repo}`;
}

function parseRepositoryName(value: string): GitHubRepositoryRef | null {
  const trimmed = value.trim();
  const direct = trimmed.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
  if (direct) return { owner: direct[1]!, repo: direct[2]!.replace(/\.git$/, "") };

  try {
    const url = new URL(trimmed);
    if (url.hostname !== "github.com" && url.hostname !== "www.github.com") {
      return null;
    }
    const [owner, repo] = url.pathname.split("/").filter(Boolean);
    if (!owner || !repo) return null;
    return { owner, repo: repo.replace(/\.git$/, "") };
  } catch {
    return null;
  }
}

function githubRepositoryFromProject(project: RegistryProjectRaw): GitHubRepositoryRef | null {
  if (project.github && typeof project.github === "object") {
    const g = project.github as Record<string, unknown>;
    if (typeof g.repository === "string") {
      const parsed = parseRepositoryName(g.repository);
      if (parsed) return parsed;
    }
    if (typeof g.owner === "string" && typeof g.repo === "string") {
      return { owner: g.owner, repo: g.repo };
    }
  }

  if (Array.isArray(project.urls)) {
    for (const value of project.urls) {
      if (typeof value !== "string") continue;
      const parsed = parseRepositoryName(value);
      if (parsed) return parsed;
    }
  }

  return null;
}

function sectorsFromProject(project: RegistryProjectRaw): SectorId[] {
  if (!Array.isArray(project.domainIds)) return ["core"];
  const sectors = project.domainIds.filter((id): id is SectorId =>
    typeof id === "string",
  );
  return sectors.length > 0 ? sectors : ["core"];
}

function operatorsFromProject(project: RegistryProjectRaw): OperatorId[] {
  if (!Array.isArray(project.operatorIds)) return [];
  return project.operatorIds.filter((id): id is OperatorId =>
    typeof id === "string" && OPERATOR_IDS.includes(id as OperatorId),
  );
}

export function checkpointPath(cwd = process.cwd()): string {
  return path.join(cwd, "data", "telemetry", "github-checkpoints.json");
}

export async function readGitHubCheckpoint(
  cwd = process.cwd(),
): Promise<{ path: string; loaded: boolean; checkpoint: GitHubCheckpointFile }> {
  const filePath = checkpointPath(cwd);
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as GitHubCheckpointFile;
    if (parsed?.version === 1 && parsed.repositories && typeof parsed.repositories === "object") {
      return { path: filePath, loaded: true, checkpoint: parsed };
    }
  } catch {
    /* missing or unreadable checkpoint */
  }

  return {
    path: filePath,
    loaded: false,
    checkpoint: { version: 1, updatedAt: "", repositories: {} },
  };
}

export async function loadGitHubRepositoryMappings(
  cwd = process.cwd(),
): Promise<{ mappings: GitHubRepositoryMapping[]; skipped: string[] }> {
  const registryPath = path.join(cwd, "data", "projects", "registry.json");
  const raw = await readFile(registryPath, "utf8");
  const registry = JSON.parse(raw) as { projects?: RegistryProjectRaw[] };
  const mappings: GitHubRepositoryMapping[] = [];
  const skipped: string[] = [];

  for (const project of registry.projects ?? []) {
    if (project.archivedAt) continue;
    if (typeof project.id !== "string") continue;
    const repository = githubRepositoryFromProject(project);
    if (!repository) {
      skipped.push(`${project.id}: no GitHub repository mapping`);
      continue;
    }
    mappings.push({
      projectId: project.id,
      repository,
      sectors: sectorsFromProject(project),
      operators: operatorsFromProject(project),
    });
  }

  return { mappings, skipped };
}

export function fixtureGitHubRepositoryMappings(): GitHubRepositoryMapping[] {
  return [
    {
      projectId: "ccc",
      repository: { owner: "thinkcore", repo: "ccc" },
      sectors: ["core", "forge"],
      operators: ["nexus-7"],
    },
  ];
}

export function fixtureGitHubPayloads(
  repository: GitHubRepositoryRef,
): GitHubContinuityPayload[] {
  return [
    {
      type: "commit",
      payload: {
        repository,
        sha: "abc1234567890",
        branch: "main",
        message: "Tighten continuity projection",
        occurredAt: "2026-05-20T12:00:00.000Z",
        url: `https://github.com/${repositoryName(repository)}/commit/abc1234567890`,
      },
    },
    {
      type: "push",
      payload: {
        repository,
        branch: "main",
        headSha: "def4567890123",
        commitCount: 3,
        occurredAt: "2026-05-20T12:05:00.000Z",
        url: `https://github.com/${repositoryName(repository)}/compare/abc...def`,
      },
    },
    {
      type: "deployment",
      payload: {
        repository,
        deploymentId: "deploy-100",
        status: "success",
        environment: "production",
        branch: "main",
        commitSha: "fedcba9876543",
        occurredAt: "2026-05-20T12:10:00.000Z",
        url: `https://github.com/${repositoryName(repository)}/deployments/deploy-100`,
      },
    },
    {
      type: "deployment",
      payload: {
        repository,
        deploymentId: "deploy-101",
        status: "failure",
        environment: "production",
        branch: "main",
        commitSha: "9876543fedcba",
        occurredAt: "2026-05-20T12:12:00.000Z",
        url: `https://github.com/${repositoryName(repository)}/deployments/deploy-101`,
      },
    },
  ];
}

interface GitHubCommitApi {
  sha?: string;
  html_url?: string;
  commit?: {
    message?: string;
    author?: { name?: string; date?: string };
  };
}

interface GitHubDeploymentApi {
  id?: number | string;
  sha?: string;
  ref?: string;
  environment?: string;
  statuses_url?: string;
}

interface GitHubDeploymentStatusApi {
  state?: string;
  created_at?: string;
  target_url?: string;
  html_url?: string;
}

async function fetchJson<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!res.ok) {
    throw new Error(`GitHub ${res.status} for ${url}`);
  }
  return (await res.json()) as T;
}

export async function fetchGitHubDryRunPayloads(
  mapping: GitHubRepositoryMapping,
  token: string,
): Promise<GitHubContinuityPayload[]> {
  const repo = repositoryName(mapping.repository);
  const commits = await fetchJson<GitHubCommitApi[]>(
    `https://api.github.com/repos/${repo}/commits?per_page=10`,
    token,
  );
  const payloads: GitHubContinuityPayload[] = commits
    .filter((commit) => commit.sha && commit.commit?.author?.date)
    .map((commit) => ({
      type: "commit" as const,
      payload: {
        repository: mapping.repository,
        sha: commit.sha!,
        branch: "default",
        message: commit.commit?.message ?? "Commit recorded",
        authorName: commit.commit?.author?.name,
        occurredAt: commit.commit?.author?.date ?? new Date().toISOString(),
        url: commit.html_url,
      },
    }));

  const deployments = await fetchJson<GitHubDeploymentApi[]>(
    `https://api.github.com/repos/${repo}/deployments?per_page=10`,
    token,
  ).catch(() => []);

  for (const deployment of deployments) {
    if (!deployment.id || !deployment.statuses_url) continue;
    const statuses = await fetchJson<GitHubDeploymentStatusApi[]>(
      deployment.statuses_url,
      token,
    ).catch(() => []);
    const latest = statuses[0];
    if (!latest || (latest.state !== "success" && latest.state !== "failure")) continue;
    payloads.push({
      type: "deployment",
      payload: {
        repository: mapping.repository,
        deploymentId: String(deployment.id),
        status: latest.state,
        environment: deployment.environment ?? "deployment",
        branch: deployment.ref ?? "unknown",
        commitSha: deployment.sha,
        occurredAt: latest.created_at ?? new Date().toISOString(),
        url: latest.target_url ?? latest.html_url,
      },
    });
  }

  return payloads;
}

function seenKeysForRepository(
  checkpoint: GitHubCheckpointFile,
  repository: GitHubRepositoryRef,
): Set<string> {
  const entry = checkpoint.repositories[repositoryName(repository)];
  return new Set(entry?.seenDedupeKeys ?? []);
}

export function buildGitHubDryRunRows(input: {
  mappings: GitHubRepositoryMapping[];
  payloadsByRepository: Map<string, GitHubContinuityPayload[]>;
  checkpoint: GitHubCheckpointFile;
}): GitHubDryRunEventRow[] {
  const rows: GitHubDryRunEventRow[] = [];
  for (const mapping of input.mappings) {
    const repo = repositoryName(mapping.repository);
    const payloads = input.payloadsByRepository.get(repo) ?? [];
    const seen = seenKeysForRepository(input.checkpoint, mapping.repository);
    const context: GitHubContinuityContext = {
      projectId: mapping.projectId,
      sectors: mapping.sectors,
      operators: mapping.operators,
    };
    const events = gitHubPayloadsToContinuityEvents(payloads, context);

    for (let i = 0; i < events.length; i += 1) {
      const event = events[i]!;
      const key = gitHubPayloadDedupeKey(payloads[i]!);
      rows.push({
        kind: event.kind,
        projectId: mapping.projectId,
        sectors: event.sectors,
        key,
        occurredAt: event.occurredAt,
        status: seen.has(key) ? "deduped" : "accepted",
        summary: event.summary,
      });
    }
  }
  return rows;
}

export function formatGitHubDryRun(result: GitHubDryRunResult): string {
  const lines: string[] = [
    `GitHub continuity ingest dry run (${result.mode})`,
    "",
    "Repositories:",
  ];

  if (result.mappings.length === 0) {
    lines.push("  [none] no mapped repositories");
  } else {
    for (const m of result.mappings) {
      lines.push(`  [ok] ${repositoryName(m.repository)} -> ${m.projectId}`);
    }
  }
  for (const skipped of result.skipped) {
    lines.push(`  [skip] ${skipped}`);
  }

  lines.push(
    "",
    "Checkpoint:",
    `  path: ${result.checkpointPath}`,
    `  loaded: ${result.checkpointLoaded ? "yes" : "no"}`,
    "  write: no",
    "",
    "Candidates:",
  );

  if (result.rows.length === 0) {
    lines.push("  [none] no candidate events");
  } else {
    for (const row of result.rows) {
      lines.push(
        `  [${row.status}] ${row.kind} ${row.projectId} ${row.sectors.join(",")} ${row.key} ${row.occurredAt}`,
      );
      lines.push(`    ${row.summary}`);
    }
  }

  lines.push(
    "",
    "Dedupe:",
    `  candidates: ${result.candidateCount}`,
    `  deduped: ${result.dedupedCount}`,
    `  accepted: ${result.acceptedCount}`,
  );

  if (result.diagnostics.length > 0) {
    lines.push("", "Diagnostics:");
    for (const diagnostic of result.diagnostics) {
      lines.push(`  - ${diagnostic}`);
    }
  }

  lines.push("", "No files written.");
  return lines.join("\n");
}
