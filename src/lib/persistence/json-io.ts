import { mkdir, readFile, rename, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

function nowIso(): string {
  return new Date().toISOString();
}

export async function backupCorruptJsonFile(
  filePath: string,
  raw: string,
): Promise<void> {
  const dir = path.dirname(filePath);
  const base = path.basename(filePath);
  const stamp = nowIso().replace(/[:.]/g, "-");
  const backupPath = path.join(dir, `.${base}.corrupt-${stamp}.bak`);
  try {
    await writeFile(backupPath, raw, { encoding: "utf8" });
  } catch {
    /* best-effort */
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
