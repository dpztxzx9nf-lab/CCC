import assert from "node:assert/strict";
import test from "node:test";
import {
  gitSectorForPath,
  parseAheadBehind,
  parseLatestCommit,
  parsePorcelainPaths,
} from "./gitSignals";

test("parsePorcelainPaths extracts changed paths and rename targets", () => {
  assert.deepEqual(
    parsePorcelainPaths([
      " M src/app/page.tsx",
      "A  docs/SYSTEM_MAP.md",
      "R  old-name.ts -> src/lib/new-name.ts",
    ].join("\n")),
    ["src/app/page.tsx", "docs/SYSTEM_MAP.md", "src/lib/new-name.ts"],
  );
});

test("gitSectorForPath maps real git paths into CCC sectors", () => {
  assert.equal(gitSectorForPath("src/components/Button.tsx"), "forge");
  assert.equal(gitSectorForPath("docs/WORKFLOW.md"), "archive");
  assert.equal(gitSectorForPath("AGENTS.md"), "archive");
  assert.equal(gitSectorForPath("next.config.ts"), "core");
  assert.equal(gitSectorForPath(".github/workflows/deploy.yml"), "relay");
  assert.equal(gitSectorForPath("vercel.json"), "relay");
});

test("parseLatestCommit keeps hash, message, and ISO commit time", () => {
  const parsed = parseLatestCommit(
    ["abcdef1234567890", "Wire runtime ingestion", "2026-05-23T15:00:00-06:00"].join("\0"),
  );

  assert.equal(parsed?.hash, "abcdef1234567890");
  assert.equal(parsed?.message, "Wire runtime ingestion");
  assert.equal(parsed?.committedAt, "2026-05-23T15:00:00-06:00");
});

test("parseAheadBehind reads upstream left-right counts", () => {
  assert.deepEqual(parseAheadBehind("2\t5"), { behind: 2, ahead: 5 });
  assert.equal(parseAheadBehind(null), null);
  assert.equal(parseAheadBehind("no upstream"), null);
});
