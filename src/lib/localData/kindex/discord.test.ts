import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import test from "node:test";
import { scanDiscordContinuityArtifacts } from "./discord";

test("scanDiscordContinuityArtifacts derives aggregate Discord continuity", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ccc-kindex-discord-"));
  try {
    const exportDir = path.join(root, "discord", "exports");
    await mkdir(exportDir, { recursive: true });
    await writeFile(
      path.join(exportDir, "threads.json"),
      JSON.stringify({
        channels: [
          {
            channelName: "architecture-philosophy",
            threads: [
              {
                threadName: "Indexing ontology model",
                lastActivityAt: "2026-05-22T10:00:00.000Z",
                messages: [
                  {
                    timestamp: "2026-05-22T10:00:00.000Z",
                    content: "Architecture and continuity ontology discussion",
                  },
                  {
                    timestamp: "2026-05-22T11:00:00.000Z",
                    content: "Build the deploy path after the schema lands",
                  },
                ],
              },
            ],
          },
          {
            channelName: "general-community",
            messages: [
              {
                timestamp: "2026-05-22T12:00:00.000Z",
                content: "Community announcement and public coordination",
              },
            ],
          },
          {
            channelName: "runtime-debugging",
            messages: [
              {
                timestamp: "2026-05-22T13:00:00.000Z",
                content: "Bot runtime PM2 error coordination",
              },
            ],
          },
          {
            channelName: "docs-knowledge",
            messages: [
              {
                timestamp: "2026-05-22T14:00:00.000Z",
                content: "Documentation and archive source references",
              },
            ],
          },
        ],
      }),
      "utf-8",
    );

    const observed = await scanDiscordContinuityArtifacts([root]);

    assert.equal(observed.artifactCount, 1);
    assert.equal(observed.jsonArtifactCount, 1);
    assert.equal(observed.channelCount, 4);
    assert.equal(observed.threadCount, 1);
    assert.equal(observed.messageCount, 5);
    assert.equal(observed.latestActivityAt, "2026-05-22T14:00:00.000Z");
    assert.ok(observed.channelNames.includes("architecture-philosophy"));
    assert.ok(observed.threadNames.includes("Indexing ontology model"));
    assert.ok(observed.categoryCounts.architecture >= 1);
    assert.ok(observed.categoryCounts.community >= 1);
    assert.ok(observed.categoryCounts.knowledge >= 1);
    assert.ok(observed.categoryCounts.runtime >= 1);
    assert.ok(observed.categoryCounts.forge >= 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("scanDiscordContinuityArtifacts stays quiet with no Discord artifacts", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ccc-kindex-empty-"));
  try {
    await writeFile(path.join(root, "notes.json"), JSON.stringify({ messages: [{}] }));
    const observed = await scanDiscordContinuityArtifacts([root]);

    assert.equal(observed.artifactCount, 0);
    assert.equal(observed.messageCount, 0);
    assert.deepEqual(observed.channelNames, []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
