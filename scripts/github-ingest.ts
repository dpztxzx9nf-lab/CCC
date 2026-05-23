import {
  acceptedGitHubEvents,
  buildGitHubDryRunRows,
  checkpointWithAcceptedEvents,
  fetchGitHubDryRunPayloads,
  fixtureGitHubPayloads,
  fixtureGitHubRepositoryMappings,
  formatGitHubDryRun,
  gitHubDedupeKeysFromEvents,
  loadGitHubRepositoryMappings,
  readGitHubCheckpoint,
  writeGitHubCheckpoint,
  type GitHubDryRunResult,
} from "@/lib/continuity/events/github-ingest";
import { appendContinuityEvents, readContinuityEventLog } from "@/lib/continuity/events/store";
import { getArchivistConfig } from "@/lib/localData/archivist-config";

function usage(): string {
  return [
    "Usage:",
    "  npm run github:ingest -- --dry-run --fixture",
    "  npm run github:ingest -- --dry-run",
    "  npm run github:ingest -- --write",
    "",
    "Manual execution only. --write appends continuity events and updates checkpoints.",
  ].join("\n");
}

function repositoryName(input: { owner: string; repo: string }): string {
  return `${input.owner}/${input.repo}`;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const write = args.includes("--write");
  const fixture = args.includes("--fixture");

  if ((!dryRun && !write) || (dryRun && write)) {
    console.error(usage());
    process.exitCode = 1;
    return;
  }
  if (write && fixture) {
    throw new Error("--fixture is dry-run only; write mode requires live GitHub input.");
  }

  const checkpoint = await readGitHubCheckpoint();
  const diagnostics: string[] = [];
  const payloadsByRepository = new Map();
  const { mappings, skipped } = fixture
    ? { mappings: fixtureGitHubRepositoryMappings(), skipped: [] }
    : await loadGitHubRepositoryMappings();

  if (fixture) {
    for (const mapping of mappings) {
      payloadsByRepository.set(
        repositoryName(mapping.repository),
        fixtureGitHubPayloads(mapping.repository),
      );
    }
  } else {
    const token = process.env.GITHUB_TOKEN;
    if (!token && mappings.length > 0) {
      throw new Error("GITHUB_TOKEN is required for live GitHub ingestion.");
    }
    for (const mapping of mappings) {
      try {
        payloadsByRepository.set(
          repositoryName(mapping.repository),
          await fetchGitHubDryRunPayloads(mapping, token ?? ""),
        );
      } catch (err: unknown) {
        diagnostics.push(
          `${repositoryName(mapping.repository)}: ${
            err instanceof Error ? err.message : "GitHub fetch failed"
          }`,
        );
        payloadsByRepository.set(repositoryName(mapping.repository), []);
      }
    }
  }

  const config = getArchivistConfig();
  const existingLog = await readContinuityEventLog(config);
  const existingKeys = gitHubDedupeKeysFromEvents(existingLog.events);
  const rows = buildGitHubDryRunRows({
    mappings,
    payloadsByRepository,
    checkpoint: checkpoint.checkpoint,
    existingKeys,
  });
  const dedupedCount = rows.filter((row) => row.status === "deduped").length;
  let appendedCount = 0;
  let checkpointWritten = false;

  if (write) {
    const accepted = acceptedGitHubEvents({
      mappings,
      payloadsByRepository,
      checkpoint: checkpoint.checkpoint,
      existingKeys,
    });
    if (accepted.length > 0) {
      const appendResult = await appendContinuityEvents(
        config,
        accepted.map((candidate) => candidate.event),
      );
      appendedCount = appendResult.appended;
      await writeGitHubCheckpoint(
        checkpointWithAcceptedEvents({
          checkpoint: checkpoint.checkpoint,
          accepted,
          updatedAt: new Date().toISOString(),
        }),
      );
      checkpointWritten = true;
    }
  }

  const result: GitHubDryRunResult = {
    operation: write ? "write" : "dry-run",
    mode: fixture ? "fixture" : "live",
    checkpointPath: checkpoint.path,
    checkpointLoaded: checkpoint.loaded,
    mappings,
    skipped,
    rows,
    candidateCount: rows.length,
    dedupedCount,
    acceptedCount: rows.length - dedupedCount,
    diagnostics,
    appendedCount,
    checkpointWritten,
  };

  console.log(formatGitHubDryRun(result));
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
