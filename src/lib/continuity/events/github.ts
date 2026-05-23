import type { SectorId } from "@/data/types";
import type { SignificanceLevel } from "@/lib/localData/archivist-config";
import type { OperatorId } from "@/lib/operations/taxonomy";
import { sanitizeContinuityText } from "@/lib/encoding";
import { operatorsForSectors } from "./attribution";
import type {
  ContinuityEvent,
  ContinuityEventKind,
  EventImportance,
} from "./types";

export type GitHubContinuityKind =
  | "repo_commit"
  | "repo_push"
  | "deployment_success"
  | "deployment_failure";

export interface GitHubRepositoryRef {
  owner: string;
  repo: string;
}

export interface GitHubContinuityContext {
  projectId: string;
  sectors: SectorId[];
  operators?: OperatorId[];
}

export interface GitHubCommitPayload {
  repository: GitHubRepositoryRef;
  sha: string;
  branch: string;
  message: string;
  authorName?: string;
  occurredAt: string;
  url?: string;
}

export interface GitHubPushPayload {
  repository: GitHubRepositoryRef;
  branch: string;
  headSha: string;
  commitCount: number;
  occurredAt: string;
  url?: string;
}

export interface GitHubDeploymentPayload {
  repository: GitHubRepositoryRef;
  deploymentId: string;
  status: "success" | "failure";
  environment: string;
  branch: string;
  commitSha?: string;
  occurredAt: string;
  url?: string;
}

export type GitHubContinuityPayload =
  | { type: "commit"; payload: GitHubCommitPayload }
  | { type: "push"; payload: GitHubPushPayload }
  | { type: "deployment"; payload: GitHubDeploymentPayload };

function repositoryName(ref: GitHubRepositoryRef): string {
  return `${ref.owner}/${ref.repo}`;
}

function shortSha(sha: string): string {
  return sha.slice(0, 7);
}

function firstLine(text: string): string {
  return text.split(/\r?\n/, 1)[0]?.trim() ?? "";
}

function ensureSectors(sectors: SectorId[]): SectorId[] {
  return sectors.length > 0 ? [...sectors] : ["core"];
}

function gitHubEvidence(input: {
  dedupeKey: string;
  repository: GitHubRepositoryRef;
  branch?: string;
  commitSha?: string;
  deploymentId?: string;
  deploymentStatus?: string;
  url?: string;
}): ContinuityEvent["evidence"] {
  return {
    changeCount: 1,
    totalScore: 1,
    lockfileOnly: false,
    github: {
      dedupeKey: input.dedupeKey,
      owner: input.repository.owner,
      repo: input.repository.repo,
      repository: repositoryName(input.repository),
      branch: input.branch,
      commitSha: input.commitSha,
      deploymentId: input.deploymentId,
      deploymentStatus: input.deploymentStatus,
      url: input.url,
    },
  };
}

export function gitHubCommitDedupeKey(payload: GitHubCommitPayload): string {
  return `github:commit:${repositoryName(payload.repository)}:${payload.sha}`;
}

export function gitHubPushDedupeKey(payload: GitHubPushPayload): string {
  return `github:push:${repositoryName(payload.repository)}:${payload.branch}:${payload.headSha}`;
}

export function gitHubDeploymentDedupeKey(
  payload: GitHubDeploymentPayload,
): string {
  return `github:deployment:${repositoryName(payload.repository)}:${payload.deploymentId}:${payload.status}`;
}

export function gitHubPayloadDedupeKey(input: GitHubContinuityPayload): string {
  switch (input.type) {
    case "commit":
      return gitHubCommitDedupeKey(input.payload);
    case "push":
      return gitHubPushDedupeKey(input.payload);
    case "deployment":
      return gitHubDeploymentDedupeKey(input.payload);
  }
}

function buildEvent(input: {
  id: string;
  occurredAt: string;
  kind: GitHubContinuityKind;
  importance: EventImportance;
  title: string;
  summary: string;
  context: GitHubContinuityContext;
  significance: SignificanceLevel;
  evidence: ContinuityEvent["evidence"];
}): ContinuityEvent {
  const sectors = ensureSectors(input.context.sectors);
  return {
    id: input.id,
    occurredAt: input.occurredAt,
    kind: input.kind as ContinuityEventKind,
    importance: input.importance,
    title: sanitizeContinuityText(input.title),
    summary: sanitizeContinuityText(input.summary),
    sectors,
    operators: input.context.operators ?? operatorsForSectors(sectors),
    projects: [input.context.projectId],
    source: "github",
    significance: input.significance,
    evidence: input.evidence,
  };
}

export function gitHubCommitToContinuityEvent(
  payload: GitHubCommitPayload,
  context: GitHubContinuityContext,
): ContinuityEvent {
  const dedupeKey = gitHubCommitDedupeKey(payload);
  const repo = repositoryName(payload.repository);
  const message = firstLine(payload.message) || "Commit recorded";
  return buildEvent({
    id: dedupeKey,
    occurredAt: payload.occurredAt,
    kind: "repo_commit",
    importance: "low",
    title: `Commit recorded in ${repo}`,
    summary: `${shortSha(payload.sha)} on ${payload.branch}: ${message}`,
    context,
    significance: "observe",
    evidence: gitHubEvidence({
      dedupeKey,
      repository: payload.repository,
      branch: payload.branch,
      commitSha: payload.sha,
      url: payload.url,
    }),
  });
}

export function gitHubPushToContinuityEvent(
  payload: GitHubPushPayload,
  context: GitHubContinuityContext,
): ContinuityEvent {
  const dedupeKey = gitHubPushDedupeKey(payload);
  const repo = repositoryName(payload.repository);
  const countLabel =
    payload.commitCount === 1 ? "1 commit" : `${payload.commitCount} commits`;
  return buildEvent({
    id: dedupeKey,
    occurredAt: payload.occurredAt,
    kind: "repo_push",
    importance: payload.commitCount >= 5 ? "medium" : "low",
    title: `Push recorded in ${repo}`,
    summary: `${countLabel} pushed to ${payload.branch} at ${shortSha(payload.headSha)}.`,
    context,
    significance: payload.commitCount >= 5 ? "snapshot" : "observe",
    evidence: {
      ...gitHubEvidence({
        dedupeKey,
        repository: payload.repository,
        branch: payload.branch,
        commitSha: payload.headSha,
        url: payload.url,
      }),
      changeCount: payload.commitCount,
      totalScore: Math.max(1, payload.commitCount),
    },
  });
}

export function gitHubDeploymentToContinuityEvent(
  payload: GitHubDeploymentPayload,
  context: GitHubContinuityContext,
): ContinuityEvent {
  const dedupeKey = gitHubDeploymentDedupeKey(payload);
  const repo = repositoryName(payload.repository);
  const success = payload.status === "success";
  return buildEvent({
    id: dedupeKey,
    occurredAt: payload.occurredAt,
    kind: success ? "deployment_success" : "deployment_failure",
    importance: success ? "high" : "critical",
    title: success ? `Deployment succeeded for ${repo}` : `Deployment failed for ${repo}`,
    summary: `${payload.environment} deployment ${payload.status} on ${payload.branch}${
      payload.commitSha ? ` at ${shortSha(payload.commitSha)}` : ""
    }.`,
    context,
    significance: "deploy-worthy",
    evidence: gitHubEvidence({
      dedupeKey,
      repository: payload.repository,
      branch: payload.branch,
      commitSha: payload.commitSha,
      deploymentId: payload.deploymentId,
      deploymentStatus: payload.status,
      url: payload.url,
    }),
  });
}

export function gitHubPayloadToContinuityEvent(
  input: GitHubContinuityPayload,
  context: GitHubContinuityContext,
): ContinuityEvent {
  switch (input.type) {
    case "commit":
      return gitHubCommitToContinuityEvent(input.payload, context);
    case "push":
      return gitHubPushToContinuityEvent(input.payload, context);
    case "deployment":
      return gitHubDeploymentToContinuityEvent(input.payload, context);
  }
}

export function gitHubPayloadsToContinuityEvents(
  inputs: GitHubContinuityPayload[],
  context: GitHubContinuityContext,
): ContinuityEvent[] {
  return inputs.map((input) => gitHubPayloadToContinuityEvent(input, context));
}
