import { mkdir } from "fs/promises";
import path from "path";
import { parseUtf8ContinuityJson } from "./json-parse";
import { sanitizeContinuityPayload } from "./normalize";
import { readUtf8File, writeUtf8File } from "./utf8";

/**
 * Write UTF-8 JSON with normalized continuity strings (no BOM; stable \\n suffix).
 */
export async function writeUtf8ContinuityJson(
  filePath: string,
  data: unknown,
): Promise<void> {
  const normalized = sanitizeContinuityPayload(data);
  const body = `${JSON.stringify(normalized, null, 2)}\n`;
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeUtf8File(filePath, body);
}

export async function readUtf8ContinuityJsonFile<T = unknown>(
  filePath: string,
): Promise<T> {
  const raw = await readUtf8File(filePath);
  return parseUtf8ContinuityJson<T>(raw);
}
