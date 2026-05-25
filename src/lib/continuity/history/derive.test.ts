import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ContinuitySnapshot } from "@/lib/snapshot/types";
import { deriveContinuityHistoryOperationalEvents } from "./derive";

function snapshot(
  patch: Partial<ContinuitySnapshot>,
): ContinuitySnapshot {
  return {
    schemaVersion: 1,
    generatedAt: "2026-05-25T00:00:00.000Z",
    agent: "ARCHIVIST-0",
    projects: [],
    sectorHeat: {
      core: { activityScore: 0, activityLevel: "idle", operationalLoad: 0, dominantActivity: null },
      archive: { activityScore: 0, activityLevel: "idle", operationalLoad: 0, dominantActivity: null },
      forge: { activityScore: 0, activityLevel: "idle", operationalLoad: 0, dominantActivity: null },
      relay: { activityScore: 0, activityLevel: "idle", operationalLoad: 0, dominantActivity: null },
      runtime: { activityScore: 0, activityLevel: "idle", operationalLoad: 0, dominantActivity: null },
      observatory: { activityScore: 0, activityLevel: "idle", operationalLoad: 0, dominantActivity: null },
    },
    operators: [],
    signals: [],
    scanRoots: [],
    ...patch,
  };
}

describe("deriveContinuityHistoryOperationalEvents", () => {
  it("derives PROJECT_EMERGED from a new evidence-backed project", () => {
    const previous = snapshot({
      generatedAt: "2026-05-25T00:00:00.000Z",
    });
    const current = snapshot({
      generatedAt: "2026-05-25T01:00:00.000Z",
      projects: [
        {
          id: "projects-dealbot",
          name: "DealBot",
          path: "C:\\Projects\\dealbot",
          scanRoot: "C:\\Projects",
          hasPackageJson: true,
          hasGit: true,
          markdownCount: 5,
          lastModified: "2026-05-25T00:30:00.000Z",
          runtimeCapable: true,
          likelyStack: ["next", "typescript"],
          sectorClassification: "forge",
          activityScore: 42,
          recentActivityCount: 12,
          obsidianVault: false,
        },
      ],
    });

    const events = deriveContinuityHistoryOperationalEvents(previous, current);
    const emerged = events.find((event) => event.type === "PROJECT_EMERGED");

    assert.ok(emerged);
    assert.equal(emerged.project, "projects-dealbot");
    assert.equal(emerged.sector, "forge");
    assert.equal(emerged.source, "archivist:history");
    assert.deepEqual(
      (emerged.metadata.evidence as { markers: string[] }).markers.slice(0, 2),
      ["package.json", ".git"],
    );
  });

  it("derives sector pressure and operator pressure deltas", () => {
    const previous = snapshot({
      generatedAt: "2026-05-25T00:00:00.000Z",
      sectorPressure: {
        core: 2,
        archive: 0,
        forge: 4,
        relay: 0,
        runtime: 0,
        observatory: 0,
      },
      operators: [
        {
          operatorId: "fab-0",
          callsign: "FAB-0",
          workload: 20,
          currentActivity: "standby",
          activeProjectId: null,
          lastSignal: null,
        },
      ],
    });
    const current = snapshot({
      generatedAt: "2026-05-25T01:00:00.000Z",
      sectorPressure: {
        core: 2,
        archive: 0,
        forge: 30,
        relay: 0,
        runtime: 0,
        observatory: 0,
      },
      operators: [
        {
          operatorId: "fab-0",
          callsign: "FAB-0",
          workload: 55,
          currentActivity: "forge pressure",
          activeProjectId: null,
          lastSignal: "repo dirty",
        },
      ],
    });

    const types = deriveContinuityHistoryOperationalEvents(previous, current).map(
      (event) => event.type,
    );

    assert.ok(types.includes("SECTOR_PRESSURE_INCREASED"));
    assert.ok(types.includes("OPERATOR_PRESSURE_SHIFT"));
  });

  it("does not derive fabricated history without a previous snapshot", () => {
    const current = snapshot({
      generatedAt: "2026-05-25T01:00:00.000Z",
    });

    assert.deepEqual(deriveContinuityHistoryOperationalEvents(null, current), []);
  });
});
