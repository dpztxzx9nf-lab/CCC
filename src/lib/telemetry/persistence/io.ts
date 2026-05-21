import { mkdir, readFile, rename, stat, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import {
  TELEMETRY_PERSISTENCE_SCHEMA_VERSION,
  type TelemetryPersistenceSchemaVersion,
  type TelemetryStoreBase,
  type TelemetryStoreName,
} from "./schema";
import { telemetryStorePath } from "./paths";

function nowIso(): string {
  return new Date().toISOString();
}

function hasValidSchemaVersion(
  value: unknown,
): value is { schemaVersion: TelemetryPersistenceSchemaVersion } {
  return (
    !!value &&
    typeof value === "object" &&
    (value as { schemaVersion?: unknown }).schemaVersion ===
      TELEMETRY_PERSISTENCE_SCHEMA_VERSION
  );
}

export async function telemetryStoreExists(
  cwd: string,
  store: TelemetryStoreName,
): Promise<boolean> {
  try {
    await stat(telemetryStorePath(cwd, store));
    return true;
  } catch {
    return false;
  }
}

async function backupCorruptFile(filePath: string, raw: string): Promise<void> {
  const dir = path.dirname(filePath);
  const base = path.basename(filePath);
  const stamp = nowIso().replace(/[:.]/g, "-");
  const backupPath = path.join(dir, `.${base}.corrupt-${stamp}.bak`);
  try {
    await writeFile(backupPath, raw, { encoding: "utf8" });
  } catch {
    /* best-effort backup */
  }
}

/** Atomic UTF-8 JSON write (temp file + rename). */
export async function writeJsonAtomic(
  filePath: string,
  data: unknown,
): Promise<void> {
  const dir = path.dirname(filePath);
  await mkdir(dir, { recursive: true });
  const body = `${JSON.stringify(data, null, 2)}\n`;
  const tmp = path.join(
    dir,
    `.${path.basename(filePath)}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`,
  );
  await writeFile(tmp, body, { encoding: "utf8" });
  await rename(tmp, filePath);
}

export async function loadTelemetryStore<T extends TelemetryStoreBase>(
  cwd: string,
  store: TelemetryStoreName,
  createDefault: () => T,
  validate: (value: unknown) => value is T,
  options?: { createIfMissing?: boolean },
): Promise<T> {
  const filePath = telemetryStorePath(cwd, store);
  const createIfMissing = options?.createIfMissing ?? false;

  let exists = false;
  try {
    await stat(filePath);
    exists = true;
  } catch {
    exists = false;
  }

  if (!exists) {
    const initial = createDefault();
    if (createIfMissing) {
      await writeJsonAtomic(filePath, initial);
    }
    return initial;
  }

  let raw = "";
  try {
    raw = await readFile(filePath, { encoding: "utf8" });
  } catch {
    const initial = createDefault();
    if (createIfMissing) await writeJsonAtomic(filePath, initial);
    return initial;
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    await backupCorruptFile(filePath, raw);
    const initial = createDefault();
    if (createIfMissing) await writeJsonAtomic(filePath, initial);
    return initial;
  }

  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (validate(parsed)) return parsed;
    if (!hasValidSchemaVersion(parsed)) {
      throw new Error("unsupported schemaVersion");
    }
    throw new Error("invalid store shape");
  } catch {
    await backupCorruptFile(filePath, raw);
    const initial = createDefault();
    if (createIfMissing) await writeJsonAtomic(filePath, initial);
    return initial;
  }
}

export async function saveTelemetryStore<T extends TelemetryStoreBase>(
  cwd: string,
  store: TelemetryStoreName,
  data: T,
): Promise<void> {
  const filePath = telemetryStorePath(cwd, store);
  const next: T = { ...data, updatedAt: nowIso() };
  await writeJsonAtomic(filePath, next);
}

export function createStoreTimestamps(): Pick<
  TelemetryStoreBase,
  "createdAt" | "updatedAt"
> {
  const at = nowIso();
  return { createdAt: at, updatedAt: at };
}

export function finiteNonNegative(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}
