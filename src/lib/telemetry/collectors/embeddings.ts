import { readdir, readFile, stat } from "fs/promises";
import path from "path";
import { LOCAL_SOURCE_ROOTS, SCAN_IGNORE_DIRS } from "@/lib/localData/config";
import {
  readPersistedEmbeddingCount,
  telemetryStoreSourceLabel,
} from "../persistence";
import type { TelemetryMetricValue } from "../types";

const EMBEDDING_FILE_RE =
  /^(embeddings?|vectors?|index-embeddings)(\.json|\.jsonl|\.ndjson)?$/i;
const EMBEDDING_DIR_RE = /^(embeddings?|vector[_-]?store|chroma|\.vectordb)$/i;

const MAX_FILES = 4_000;

async function exists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function countFromJsonFile(filePath: string): Promise<number | null> {
  try {
    const raw = await readFile(filePath, { encoding: "utf8" });
    const data: unknown = JSON.parse(raw);
    if (Array.isArray(data)) return data.length;
    if (data && typeof data === "object") {
      const o = data as Record<string, unknown>;
      if (Array.isArray(o.embeddings)) return o.embeddings.length;
      if (Array.isArray(o.vectors)) return o.vectors.length;
      if (typeof o.count === "number") return o.count;
      const rolling = o.rolling;
      if (rolling && typeof rolling === "object") {
        const count = (rolling as Record<string, unknown>).count;
        if (typeof count === "number") return count;
      }
    }
  } catch {
    /* not parseable */
  }
  return null;
}

async function walkEmbeddings(
  root: string,
  depth: number,
  state: { files: number; records: number; scanned: number },
): Promise<void> {
  if (depth > 5 || state.scanned >= MAX_FILES) return;

  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (state.scanned >= MAX_FILES) return;
    const full = path.join(root, entry.name);

    if (entry.isDirectory()) {
      if (SCAN_IGNORE_DIRS.has(entry.name) || entry.name.startsWith(".")) {
        if (EMBEDDING_DIR_RE.test(entry.name)) {
          state.files += 1;
          state.scanned += 1;
        }
        continue;
      }
      if (EMBEDDING_DIR_RE.test(entry.name)) {
        state.files += 1;
      }
      await walkEmbeddings(full, depth + 1, state);
      continue;
    }

    if (!entry.isFile()) continue;
    state.scanned += 1;

    if (!/embedding|vector/i.test(entry.name)) continue;

    if (EMBEDDING_FILE_RE.test(entry.name) || /\.(json|jsonl|ndjson)$/i.test(entry.name)) {
      state.files += 1;
      const fromJson = await countFromJsonFile(full);
      if (fromJson != null) state.records += fromJson;
      else state.records += 1;
    }
  }
}

/** Count embedding/index artifacts from observable filesystem markers */
export async function collectEmbeddingTelemetry(
  cwd = process.cwd(),
): Promise<TelemetryMetricValue<number>> {
  const persisted = await readPersistedEmbeddingCount(cwd);
  if (persisted != null) {
    return {
      value: Math.round(persisted),
      source: telemetryStoreSourceLabel("embeddings"),
      available: true,
    };
  }

  const roots = [
    cwd,
    ...LOCAL_SOURCE_ROOTS.map((r) => r.root).filter((r) => r.length > 0),
  ];
  const seen = new Set<string>();
  const state = { files: 0, records: 0, scanned: 0 };

  for (const root of roots) {
    const key = root.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    if (!(await exists(root))) continue;
    await walkEmbeddings(root, 0, state);
  }

  if (state.files === 0 && state.records === 0) {
    return {
      value: null,
      source: "no-embedding-artifacts",
      available: false,
    };
  }

  const count = state.records > 0 ? state.records : state.files;
  return {
    value: count,
    source: `filesystem-scan (${state.files} artifact(s))`,
    available: true,
  };
}
