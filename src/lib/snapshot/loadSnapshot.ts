import { parseUtf8ContinuityJson } from "@/lib/encoding/json-parse";
import type { ContinuitySnapshot } from "./types";
import { ALL_SECTOR_IDS } from "@/lib/operations/taxonomy";
import { parseContinuitySnapshot } from "./parseSnapshot";

export {
  isContinuitySnapshotShape,
  isLegacyContinuitySnapshot,
  parseContinuitySnapshot,
} from "./parseSnapshot";

const SNAPSHOT_URL = "/continuity-snapshot.json";

/** @deprecated Prefer parseContinuitySnapshot — kept for type guards */
export function isContinuitySnapshot(data: unknown): data is ContinuitySnapshot {
  return parseContinuitySnapshot(data) !== null;
}

/** Client or server fetch from public static file. */
export async function loadContinuitySnapshot(
  baseUrl = "",
): Promise<ContinuitySnapshot | null> {
  try {
    const path = baseUrl
      ? `${baseUrl.replace(/\/$/, "")}${SNAPSHOT_URL}`
      : SNAPSHOT_URL;
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) return null;
    const raw = await res.text();
    const data: unknown = parseUtf8ContinuityJson(raw);
    return parseContinuitySnapshot(data);
  } catch {
    return null;
  }
}

/** Node-only: read snapshot from disk (API routes, scripts). */
export async function readContinuitySnapshotFromDisk(): Promise<ContinuitySnapshot | null> {
  if (typeof window !== "undefined") return null;

  try {
    const { readFile } = await import("fs/promises");
    const path = await import("path");
    const filePath = path.join(process.cwd(), "public", "continuity-snapshot.json");
    const raw = await readFile(filePath, { encoding: "utf8" });
    const data: unknown = parseUtf8ContinuityJson(raw);
    return parseContinuitySnapshot(data);
  } catch {
    return null;
  }
}

export function snapshotHasData(snapshot: ContinuitySnapshot | null): boolean {
  if (!snapshot?.generatedAt) return false;
  return snapshot.projects.length > 0;
}

export function snapshotAgeHours(snapshot: ContinuitySnapshot): number {
  return snapshotAgeHoursFromIso(snapshot.generatedAt);
}

export function snapshotAgeHoursFromIso(generatedAt: string): number {
  const t = Date.parse(generatedAt);
  if (Number.isNaN(t)) return Infinity;
  return (Date.now() - t) / (1000 * 60 * 60);
}

export function emptySectorHeatRecord(): ContinuitySnapshot["sectorHeat"] {
  const heat = {} as ContinuitySnapshot["sectorHeat"];
  for (const id of ALL_SECTOR_IDS) {
    heat[id] = {
      activityScore: 0,
      activityLevel: "idle",
      operationalLoad: 0,
      dominantActivity: null,
    };
  }
  return heat;
}
