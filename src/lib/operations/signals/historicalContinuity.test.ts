import assert from "node:assert/strict";
import test from "node:test";
import type { ContinuityEvent } from "@/lib/continuity/events/types";
import type { OperationalEvent } from "../events";
import { deriveHistoricalContinuitySignals } from "./historicalContinuity";

const referenceTime = "2026-05-23T12:00:00.000Z";

function daysAgo(days: number): string {
  return new Date(Date.parse(referenceTime) - days * 86_400_000).toISOString();
}

function opEvent(input: {
  id: string;
  sector: OperationalEvent["sector"];
  type: OperationalEvent["type"];
  daysAgo: number;
  project?: string;
  severity?: OperationalEvent["severity"];
}): OperationalEvent {
  return {
    id: input.id,
    type: input.type,
    sector: input.sector,
    sectors: [input.sector],
    severity: input.severity ?? "medium",
    confidence: 0.9,
    timestamp: daysAgo(input.daysAgo),
    source: "archivist:watcher",
    project: input.project ?? "ccc",
    filePath: null,
    summary: input.type,
    metadata: {},
  };
}

function railEvent(input: {
  id: string;
  sector: ContinuityEvent["sectors"][number];
  kind: ContinuityEvent["kind"];
  daysAgo: number;
  operators: ContinuityEvent["operators"];
}): ContinuityEvent {
  return {
    id: input.id,
    occurredAt: daysAgo(input.daysAgo),
    kind: input.kind,
    importance: "medium",
    title: input.kind,
    summary: input.kind,
    sectors: [input.sector],
    operators: input.operators,
    projects: ["ccc"],
    source: "archivist",
    significance: "observe",
    evidence: { changeCount: 1, totalScore: 1, lockfileOnly: false },
  };
}

test("deriveHistoricalContinuitySignals detects recurring pressure and density trends", () => {
  const operationalEvents = [
    opEvent({ id: "a", sector: "archive", type: "markdown_changed", daysAgo: 1 }),
    opEvent({ id: "b", sector: "archive", type: "markdown_changed", daysAgo: 2 }),
    opEvent({ id: "c", sector: "archive", type: "markdown_changed", daysAgo: 3 }),
    opEvent({ id: "d", sector: "archive", type: "markdown_changed", daysAgo: 4 }),
    opEvent({ id: "e", sector: "archive", type: "markdown_changed", daysAgo: 5 }),
  ];

  const signals = deriveHistoricalContinuitySignals({
    operationalEvents,
    referenceTime,
  });

  assert.ok(
    signals.some(
      (s) =>
        s.type === "historical_recurring_sector_activity" &&
        s.sector === "archive",
    ),
  );
  assert.ok(
    signals.some(
      (s) =>
        s.type === "historical_continuity_density_trend" &&
        s.sector === "archive",
    ),
  );
});

test("deriveHistoricalContinuitySignals detects deployment cycles and repeated operators", () => {
  const continuityEvents = [
    railEvent({
      id: "a",
      sector: "relay",
      kind: "deployment_success",
      daysAgo: 2,
      operators: ["bcast-1"],
    }),
    railEvent({
      id: "b",
      sector: "relay",
      kind: "repo_push",
      daysAgo: 5,
      operators: ["bcast-1"],
    }),
    railEvent({
      id: "c",
      sector: "relay",
      kind: "deploy_published",
      daysAgo: 8,
      operators: ["bcast-1"],
    }),
  ];

  const signals = deriveHistoricalContinuitySignals({
    continuityEvents,
    referenceTime,
  });

  assert.ok(
    signals.some(
      (s) =>
        s.type === "historical_deployment_build_cycle" && s.sector === "relay",
    ),
  );
  assert.ok(
    signals.some(
      (s) =>
        s.type === "historical_repeated_system_involvement" &&
        s.sector === "relay",
    ),
  );
});

test("deriveHistoricalContinuitySignals detects sustained runtime instability", () => {
  const operationalEvents = [
    opEvent({
      id: "a",
      sector: "runtime",
      type: "runtime_signal",
      daysAgo: 1,
      severity: "high",
    }),
    opEvent({
      id: "b",
      sector: "runtime",
      type: "build_failure",
      daysAgo: 10,
      severity: "high",
    }),
  ];

  const signals = deriveHistoricalContinuitySignals({
    operationalEvents,
    referenceTime,
  });

  assert.ok(
    signals.some(
      (s) =>
        s.type === "historical_sustained_runtime_instability" &&
        s.sector === "runtime",
    ),
  );
});

test("deriveHistoricalContinuitySignals stays quiet without substrate history", () => {
  const signals = deriveHistoricalContinuitySignals({ referenceTime });
  assert.deepEqual(signals, []);
});
