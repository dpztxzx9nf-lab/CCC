import { readdir, stat } from "fs/promises";
import path from "path";

export async function pathExists(target: string): Promise<boolean> {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

/** Count how many relative marker paths exist under a project root */
export async function countExistingMarkers(
  rootPath: string,
  markers: string[],
): Promise<number> {
  let n = 0;
  for (const rel of markers) {
    if (await pathExists(path.join(rootPath, rel))) n += 1;
  }
  return n;
}

/** Shallow scan for directory names suggesting cross-project linkage */
export async function detectCrossProjectLinkage(
  rootPath: string,
  linkHints: string[],
): Promise<number> {
  let hits = 0;
  const lowerHints = linkHints.map((h) => h.toLowerCase());

  async function walkShallow(dir: string, depth: number): Promise<void> {
    if (depth > 3) return;
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const name = e.name.toLowerCase();
      if (e.isDirectory()) {
        if (lowerHints.some((h) => name.includes(h))) hits += 1;
        await walkShallow(path.join(dir, e.name), depth + 1);
      } else if (e.isFile() && /\.mdx?$/i.test(name)) {
        if (lowerHints.some((h) => name.includes(h))) hits += 1;
      }
    }
  }

  await walkShallow(rootPath, 0);
  return hits;
}
