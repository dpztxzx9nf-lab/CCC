import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { CONTINUITY_SNAPSHOT_SCHEMA_VERSION } from "@/lib/substrate/snapshot-schema";
import { buildManifestRefFromRegistry } from "@/lib/substrate/manifest-ref";
import { buildContinuitySnapshot } from "./buildFromScan";
import {
  isLegacyContinuitySnapshot,
  parseContinuitySnapshot,
} from "./parseSnapshot";
import { emptySectorHeatRecord } from "./loadSnapshot";
import type { ContinuitySnapshot } from "./types";

function minimalLegacySnapshot(): ContinuitySnapshot {
  return {
    generatedAt: "2026-01-01T00:00:00.000Z",
    agent: "ARCHIVIST-0",
    projects: [
      {
        id: "projects-ccc",
        name: "CCC",
        path: "C:\\Projects\\CCC",
        scanRoot: "C:\\Projects",
        hasPackageJson: true,
        hasGit: true,
        markdownCount: 1,
        lastModified: null,
        runtimeCapable: true,
        likelyStack: [],
        sectorClassification: "core",
        activityScore: 10,
        recentActivityCount: 0,
        obsidianVault: false,
      },
    ],
    sectorHeat: emptySectorHeatRecord(),
    operators: [],
    signals: [],
    scanRoots: [{ id: "projects", path: "C:\\Projects", accessible: true, projectCount: 1 }],
  };
}

describe("parseContinuitySnapshot", () => {
  it("accepts legacy snapshot without schemaVersion", () => {
    const parsed = parseContinuitySnapshot(minimalLegacySnapshot());
    assert.ok(parsed);
    assert.equal(parsed.schemaVersion, undefined);
    assert.equal(isLegacyContinuitySnapshot(parsed), true);
  });

  it("accepts v1 snapshot with manifestRef and scan", () => {
    const v1: ContinuitySnapshot = {
      ...minimalLegacySnapshot(),
      schemaVersion: CONTINUITY_SNAPSHOT_SCHEMA_VERSION,
      manifestRef: {
        manifestSchemaVersion: 1,
        manifestUpdatedAt: "2026-05-21T00:00:00.000Z",
      },
      scan: { mode: "full", hostId: "test-host" },
    };
    const parsed = parseContinuitySnapshot(v1);
    assert.ok(parsed);
    assert.equal(parsed.schemaVersion, 1);
    assert.equal(isLegacyContinuitySnapshot(parsed), false);
  });

  it("rejects unsupported schemaVersion", () => {
    const bad = {
      ...minimalLegacySnapshot(),
      schemaVersion: 99,
    };
    assert.equal(parseContinuitySnapshot(bad), null);
  });

  it("rejects invalid manifestRef", () => {
    const bad = {
      ...minimalLegacySnapshot(),
      schemaVersion: 1,
      manifestRef: { manifestSchemaVersion: 9, manifestUpdatedAt: "" },
    };
    assert.equal(parseContinuitySnapshot(bad), null);
  });

  it("parses committed public continuity-snapshot.json (legacy)", () => {
    const filePath = path.join(process.cwd(), "public", "continuity-snapshot.json");
    const raw = readFileSync(filePath, "utf8");
    const data: unknown = JSON.parse(raw);
    const parsed = parseContinuitySnapshot(data);
    assert.ok(parsed, "public snapshot must remain readable");
    assert.equal(isLegacyContinuitySnapshot(parsed), true);
  });
});

describe("buildContinuitySnapshot substrate fields", () => {
  it("emits schemaVersion, manifestRef, and scan on write", () => {
    const manifestRef = buildManifestRefFromRegistry(process.cwd());
    const snapshot = buildContinuitySnapshot([], [], [], [], {
      manifestRef,
      hostId: "unit-test",
    });
    assert.equal(snapshot.schemaVersion, CONTINUITY_SNAPSHOT_SCHEMA_VERSION);
    assert.deepEqual(snapshot.manifestRef, manifestRef);
    assert.equal(snapshot.scan?.mode, "full");
    assert.equal(snapshot.scan?.hostId, "unit-test");
  });
});

describe("buildManifestRefFromRegistry", () => {
  it("reads registry updatedAt from disk", () => {
    const ref = buildManifestRefFromRegistry(process.cwd());
    assert.equal(ref.manifestSchemaVersion, 1);
    assert.match(ref.manifestUpdatedAt, /^\d{4}-\d{2}-\d{2}T/);
  });
});
