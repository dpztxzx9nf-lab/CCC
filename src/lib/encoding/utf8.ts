import { readFile, writeFile } from "fs/promises";

/** Explicit UTF-8 read for continuity artifacts */
export async function readUtf8File(filePath: string): Promise<string> {
  return readFile(filePath, { encoding: "utf8" });
}

/** Explicit UTF-8 write for continuity artifacts */
export async function writeUtf8File(
  filePath: string,
  body: string,
): Promise<void> {
  await writeFile(filePath, body, { encoding: "utf8" });
}
