import path from "path";
import {
  ARCHIVIST_IGNORE_DIRS,
  ARCHIVIST_LOCKFILES,
  ARCHIVIST_MEANINGFUL_LOG_PATTERNS,
} from "@/lib/localData/archivist-config";

export function normalizePath(p: string): string {
  return p.replace(/\//g, "\\");
}

export function isIgnoredPath(filePath: string): boolean {
  const normalized = normalizePath(filePath).toLowerCase();
  const segments = normalized.split("\\");

  for (const seg of segments) {
    if (ARCHIVIST_IGNORE_DIRS.has(seg)) return true;
  }

  if (segments.some((s) => s === "logs" || s.endsWith(".log"))) {
    const base = path.basename(filePath);
    if (!ARCHIVIST_MEANINGFUL_LOG_PATTERNS.some((re) => re.test(base))) {
      return true;
    }
  }

  return false;
}

export function isLockfile(filePath: string): boolean {
  return ARCHIVIST_LOCKFILES.has(path.basename(filePath).toLowerCase());
}

export function isSourceLike(filePath: string): boolean {
  const base = path.basename(filePath).toLowerCase();
  if (isLockfile(filePath)) return false;
  return /\.(tsx?|jsx?|mjs|cjs|vue|svelte|md|mdx|json|yaml|yml|css|scss)$/.test(
    base,
  );
}

/** Lockfile-only batch: every change is a lockfile with no source in same project */
export function isLockfileOnlyBatch(
  changes: string[],
  projectOf: (p: string) => string,
): boolean {
  if (changes.length === 0) return false;
  const hasSource = changes.some((p) => isSourceLike(p));
  if (hasSource) return false;
  return changes.every((p) => isLockfile(p));
}

export function projectKeyFromPath(
  filePath: string,
  watchRoots: { path: string }[],
): string {
  const normalized = normalizePath(path.resolve(filePath));
  const sorted = [...watchRoots].sort((a, b) => b.path.length - a.path.length);

  for (const root of sorted) {
    const rp = normalizePath(path.resolve(root.path));
    if (normalized.toLowerCase().startsWith(rp.toLowerCase())) {
      const rel = normalized.slice(rp.length).replace(/^\\/, "");
      const top = rel.split("\\")[0];
      return top ? `${rp}\\${top}` : rp;
    }
  }

  return path.dirname(normalized);
}
