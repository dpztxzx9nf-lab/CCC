import { stat } from "fs/promises";
import path from "path";
import { readContinuityStorageStatsFromDisk } from "@/lib/continuity/events/store";
import { readUtf8ContinuityJsonFile } from "@/lib/encoding/json-io";
import type { OperationalTelemetry } from "../types";

export async function collectStorageTelemetry(
  cwd = process.cwd(),
): Promise<Pick<OperationalTelemetry, "snapshot" | "events">> {
  const stats = await readContinuityStorageStatsFromDisk(cwd);
  const snapshotPath = path.join(cwd, "public", "continuity-snapshot.json");

  let lastModified: string | null = null;
  try {
    lastModified = (await stat(snapshotPath)).mtime.toISOString();
  } catch {
    /* missing */
  }

  const snapshotGeneratedAt = stats.snapshotGeneratedAt;
  const totalEvents = stats.railEventCount + stats.operationalEventCount;

  return {
    snapshot: {
      bytes: stats.snapshotFileBytes,
      kb: Math.round((stats.snapshotFileBytes / 1024) * 10) / 10,
      lastModified,
      generatedAt: snapshotGeneratedAt,
    },
    events: {
      count: totalEvents,
      bytes: stats.eventsFileBytes,
      railCount: stats.railEventCount,
      operationalCount: stats.operationalEventCount,
      logUpdatedAt: stats.logUpdatedAt,
    },
  };
}

/** Snapshot write time from JSON generatedAt when mtime missing */
export async function resolveSnapshotGeneratedAt(
  cwd = process.cwd(),
): Promise<string | null> {
  try {
    const data = await readUtf8ContinuityJsonFile<{
      generatedAt?: string;
    }>(path.join(cwd, "public", "continuity-snapshot.json"));
    return typeof data.generatedAt === "string" ? data.generatedAt : null;
  } catch {
    return null;
  }
}
