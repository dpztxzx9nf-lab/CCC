import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  gitHubCommitDedupeKey,
  gitHubCommitToContinuityEvent,
  gitHubDeploymentDedupeKey,
  gitHubDeploymentToContinuityEvent,
  gitHubPayloadsToContinuityEvents,
  gitHubPushDedupeKey,
  gitHubPushToContinuityEvent,
  type GitHubContinuityContext,
} from "./github";

const context: GitHubContinuityContext = {
  projectId: "ccc",
  sectors: ["core", "forge"],
  operators: ["nexus-7"],
};

const repository = {
  owner: "thinkcore",
  repo: "ccc",
};

describe("GitHub continuity adapter", () => {
  it("converts a commit fixture into an existing continuity event", () => {
    const payload = {
      repository,
      sha: "abc1234567890",
      branch: "main",
      message: "Tighten continuity projection\n\nBody ignored for rail summary.",
      authorName: "Operator",
      occurredAt: "2026-05-20T12:00:00.000Z",
      url: "https://github.com/thinkcore/ccc/commit/abc1234567890",
    };

    const event = gitHubCommitToContinuityEvent(payload, context);

    assert.equal(
      gitHubCommitDedupeKey(payload),
      "github:commit:thinkcore/ccc:abc1234567890",
    );
    assert.equal(event.id, gitHubCommitDedupeKey(payload));
    assert.equal(event.kind, "repo_commit");
    assert.equal(event.source, "github");
    assert.equal(event.importance, "low");
    assert.deepEqual(event.projects, ["ccc"]);
    assert.deepEqual(event.sectors, ["core", "forge"]);
    assert.deepEqual(event.operators, ["nexus-7"]);
    assert.match(event.summary, /abc1234 on main/);
    assert.equal(event.evidence.github?.commitSha, payload.sha);
  });

  it("converts a push fixture without inventing extra activity", () => {
    const payload = {
      repository,
      branch: "main",
      headSha: "def4567890123",
      commitCount: 3,
      occurredAt: "2026-05-20T12:05:00.000Z",
      url: "https://github.com/thinkcore/ccc/compare/abc...def",
    };

    const event = gitHubPushToContinuityEvent(payload, context);

    assert.equal(
      gitHubPushDedupeKey(payload),
      "github:push:thinkcore/ccc:main:def4567890123",
    );
    assert.equal(event.kind, "repo_push");
    assert.equal(event.importance, "low");
    assert.equal(event.evidence.changeCount, 3);
    assert.equal(event.evidence.totalScore, 3);
    assert.equal(event.evidence.github?.dedupeKey, event.id);
    assert.match(event.summary, /3 commits pushed to main/);
  });

  it("converts a deployment success fixture", () => {
    const payload = {
      repository,
      deploymentId: "deploy-100",
      status: "success" as const,
      environment: "production",
      branch: "main",
      commitSha: "fedcba9876543",
      occurredAt: "2026-05-20T12:10:00.000Z",
      url: "https://github.com/thinkcore/ccc/deployments/deploy-100",
    };

    const event = gitHubDeploymentToContinuityEvent(payload, context);

    assert.equal(
      gitHubDeploymentDedupeKey(payload),
      "github:deployment:thinkcore/ccc:deploy-100:success",
    );
    assert.equal(event.kind, "deployment_success");
    assert.equal(event.importance, "high");
    assert.equal(event.significance, "deploy-worthy");
    assert.equal(event.evidence.github?.deploymentStatus, "success");
    assert.match(event.summary, /production deployment success/);
  });

  it("converts a deployment failure fixture", () => {
    const payload = {
      repository,
      deploymentId: "deploy-101",
      status: "failure" as const,
      environment: "production",
      branch: "main",
      commitSha: "9876543fedcba",
      occurredAt: "2026-05-20T12:12:00.000Z",
      url: "https://github.com/thinkcore/ccc/deployments/deploy-101",
    };

    const event = gitHubDeploymentToContinuityEvent(payload, context);

    assert.equal(
      gitHubDeploymentDedupeKey(payload),
      "github:deployment:thinkcore/ccc:deploy-101:failure",
    );
    assert.equal(event.kind, "deployment_failure");
    assert.equal(event.importance, "critical");
    assert.equal(event.significance, "deploy-worthy");
    assert.equal(event.evidence.github?.deploymentStatus, "failure");
    assert.match(event.title, /Deployment failed/);
  });

  it("converts mixed offline fixtures through one pure helper", () => {
    const events = gitHubPayloadsToContinuityEvents(
      [
        {
          type: "commit",
          payload: {
            repository,
            sha: "abc1234567890",
            branch: "main",
            message: "Commit fixture",
            occurredAt: "2026-05-20T12:00:00.000Z",
          },
        },
        {
          type: "push",
          payload: {
            repository,
            branch: "main",
            headSha: "def4567890123",
            commitCount: 1,
            occurredAt: "2026-05-20T12:05:00.000Z",
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
            occurredAt: "2026-05-20T12:10:00.000Z",
          },
        },
      ],
      context,
    );

    assert.deepEqual(
      events.map((event) => event.kind),
      ["repo_commit", "repo_push", "deployment_success"],
    );
    assert.ok(events.every((event) => event.source === "github"));
  });
});
