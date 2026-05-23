import assert from "node:assert/strict";
import test from "node:test";
import { derivePm2RuntimeSignalsFromTelemetry } from "./pm2Runtime";
import type { OperationalTelemetry } from "@/lib/telemetry/types";

const timestamp = "2026-05-23T12:00:00.000Z";

function runtime(
  processes: NonNullable<OperationalTelemetry["runtime"]>["processes"],
): OperationalTelemetry["runtime"] {
  return {
    pm2Available: true,
    processes,
  };
}

test("PM2 runtime signals map online recognized services to Runtime", () => {
  const signals = derivePm2RuntimeSignalsFromTelemetry(
    runtime([
      {
        name: "ccc-archivist",
        status: "online",
        uptimeMs: 42_000,
        restartCount: 0,
        memoryMb: 128,
        cpu: 3,
        pmId: 0,
      },
      {
        name: "liahona",
        status: "online",
        uptimeMs: 84_000,
        restartCount: 0,
        memoryMb: 320,
        cpu: 18,
        pmId: 1,
      },
    ]),
    timestamp,
  );

  assert.equal(signals[0].type, "pm2_runtime_online");
  assert.equal(signals[0].sector, "runtime");
  assert.equal(signals[0].metadata.projectId, "ccc");
  assert.equal(signals[1].metadata.projectId, "liahona-ai");
  assert.ok(
    signals.some((s) => s.type === "pm2_runtime_resource_pressure"),
    "higher real resource usage should add pressure",
  );
});

test("PM2 runtime signals report restarting and offline states as warnings", () => {
  const signals = derivePm2RuntimeSignalsFromTelemetry(
    runtime([
      {
        name: "liahona",
        status: "launching",
        uptimeMs: null,
        restartCount: 4,
        memoryMb: 64,
        cpu: 1,
        pmId: 1,
      },
      {
        name: "ccc-archivist",
        status: "errored",
        uptimeMs: null,
        restartCount: 11,
        memoryMb: 64,
        cpu: 0,
        pmId: 0,
      },
    ]),
    timestamp,
  );

  assert.ok(
    signals.some(
      (s) => s.type === "pm2_runtime_restarting" && s.severity === "high",
    ),
  );
  assert.ok(
    signals.some(
      (s) => s.type === "pm2_runtime_offline" && s.severity === "high",
    ),
  );
  assert.ok(
    signals.some(
      (s) =>
        s.type === "pm2_runtime_restart_count" &&
        s.metadata.serviceName === "ccc-archivist" &&
        s.severity === "high",
    ),
  );
});

test("PM2 runtime signals stay quiet when PM2 is unavailable", () => {
  const signals = derivePm2RuntimeSignalsFromTelemetry({
    pm2Available: false,
    processes: [],
  });

  assert.deepEqual(signals, []);
});
