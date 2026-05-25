import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { OperationalHistoryEventView } from "@/data/operational-types";
import { deriveHistoryEnvironmentalProjection } from "./environment";

function historyEvent(
  patch: Partial<OperationalHistoryEventView>,
): OperationalHistoryEventView {
  return {
    id: "history-1",
    type: "PROJECT_EMERGED",
    projectId: "projects-dealbot",
    sector: "forge",
    severity: "medium",
    summary: "DealBot emerged in continuity scan",
    evidence: { markers: ["package.json"] },
    createdAt: "2026-05-25T00:00:00.000Z",
    ...patch,
  };
}

describe("deriveHistoryEnvironmentalProjection", () => {
  it("projects emergence as a restrained Observatory route and sector boost", () => {
    const projection = deriveHistoryEnvironmentalProjection(
      [historyEvent({})],
      Date.parse("2026-05-25T00:00:30.000Z"),
    );

    assert.ok((projection.sectors.forge?.boost ?? 0) > 0);
    assert.equal(projection.sectors.forge?.mode, "emergence");
    assert.equal(projection.signalRoutes.length, 1);
    assert.equal(projection.signalRoutes[0]?.from, "observation-deck");
    assert.equal(projection.signalRoutes[0]?.to, "foundry");
    assert.equal(projection.caption?.text, "project emerged");
  });

  it("projects runtime escalation through infrastructure and transit", () => {
    const projection = deriveHistoryEnvironmentalProjection(
      [
        historyEvent({
          id: "history-2",
          type: "RUNTIME_ESCALATION",
          projectId: "projects-dealbot",
          sector: "runtime",
          severity: "high",
        }),
      ],
      Date.parse("2026-05-25T00:01:00.000Z"),
    );

    assert.equal(projection.infrastructurePulse, true);
    assert.equal(projection.transitRoutes.length, 1);
    assert.equal(projection.sectors.runtime?.mode, "runtime");
  });

  it("decays naturally and stays quiet after the projection window", () => {
    const projection = deriveHistoryEnvironmentalProjection(
      [historyEvent({})],
      Date.parse("2026-05-25T01:00:00.000Z"),
    );

    assert.deepEqual(projection.sectors, {});
    assert.equal(projection.signalRoutes.length, 0);
    assert.equal(projection.transitRoutes.length, 0);
    assert.equal(projection.caption, null);
  });
});
