import {
  buildGitHubDryRunRows,
  fetchGitHubDryRunPayloads,
  fixtureGitHubPayloads,
  fixtureGitHubRepositoryMappings,
  formatGitHubDryRun,
  loadGitHubRepositoryMappings,
  readGitHubCheckpoint,
  type GitHubDryRunResult,
} from "@/lib/continuity/events/github-ingest";

function usage(): string {
  return [
    "Usage:",
    "  npm run github:ingest -- --dry-run --fixture",
    "  npm run github:ingest -- --dry-run",
    "",
    "Phase 2A is dry-run only. No files are written.",
  ].join("\n");
}

function repositoryName(input: { owner: string; repo: string }): string {
  return `${input.owner}/${input.repo}`;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const fixture = args.includes("--fixture");

  if (!dryRun || args.includes("--write")) {
    console.error(usage());
    process.exitCode = 1;
    return;
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
      throw new Error("GITHUB_TOKEN is required for live GitHub dry-run ingestion.");
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

  const rows = buildGitHubDryRunRows({
    mappings,
    payloadsByRepository,
    checkpoint: checkpoint.checkpoint,
  });
  const dedupedCount = rows.filter((row) => row.status === "deduped").length;
  const result: GitHubDryRunResult = {
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
  };

  console.log(formatGitHubDryRun(result));
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
