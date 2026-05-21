import { readFile, stat } from "fs/promises";
import path from "path";
import {
  readPersistedQueueDepth,
  telemetryStoreSourceLabel,
} from "../persistence";
import type { TelemetryMetricValue } from "../types";

async function readQueueFile(filePath: string): Promise<number | null> {
  try {
    const raw = await readFile(filePath, { encoding: "utf8" });
    const data: unknown = JSON.parse(raw);
    if (typeof data === "number" && Number.isFinite(data)) return data;
    if (Array.isArray(data)) return data.length;
    if (data && typeof data === "object") {
      const o = data as Record<string, unknown>;
      if (Array.isArray(o.pending)) return o.pending.length;
      if (Array.isArray(o.queue)) return o.queue.length;
      if (typeof o.depth === "number") return o.depth;
      if (typeof o.count === "number") return o.count;
      const rolling = o.rolling;
      if (rolling && typeof rolling === "object") {
        const depth = (rolling as Record<string, unknown>).depth;
        if (typeof depth === "number") return depth;
      }
    }
  } catch {
    /* unreadable */
  }
  return null;
}

/**
 * Queue depth only when a real queue artifact exists (env path or known file).
 * ARCHIVIST in-memory debounce queue is not exposed as a durable artifact.
 */
export async function collectQueueTelemetry(
  cwd = process.cwd(),
): Promise<TelemetryMetricValue<number>> {
  const persisted = await readPersistedQueueDepth(cwd);
  if (persisted != null) {
    return {
      value: persisted,
      source: telemetryStoreSourceLabel("queue"),
      available: true,
    };
  }

  const envPath = process.env.CCC_QUEUE_DEPTH_PATH?.trim();
  const candidates = [
    ...(envPath ? [path.resolve(envPath)] : []),
    path.join(cwd, "data", "telemetry", "queue.json"),
    path.join(cwd, ".telemetry", "queue.json"),
    path.join(cwd, "public", "archivist-queue.json"),
  ];

  for (const filePath of candidates) {
    try {
      await stat(filePath);
    } catch {
      continue;
    }
    const depth = await readQueueFile(filePath);
    if (depth != null) {
      return {
        value: Math.max(0, Math.round(depth)),
        source: `file:${path.basename(filePath)}`,
        available: true,
      };
    }
  }

  return {
    value: null,
    source: "no-queue-artifact",
    available: false,
  };
}
