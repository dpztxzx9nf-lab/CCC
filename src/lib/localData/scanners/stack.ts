import { readFile } from "fs/promises";
import path from "path";
import type { WalkStats } from "./markdown";

const STACK_DEPS: Record<string, string[]> = {
  typescript: ["typescript", "tsx", "@types/node"],
  javascript: ["react", "next", "express", "vite"],
  python: ["python"],
  rust: ["rust"],
};

export async function inferLikelyStack(
  projectPath: string,
  walk: WalkStats,
): Promise<string[]> {
  const stack = new Set<string>();

  if (walk.recentCodeEdits > 0 || walk.fileCount > 0) {
    if (walk.recentCodeEdits > 0) stack.add("active-code");
  }

  try {
    const raw = await readFile(path.join(projectPath, "package.json"), "utf-8");
    const pkg = JSON.parse(raw) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const deps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };
    for (const [stackName, keys] of Object.entries(STACK_DEPS)) {
      if (keys.some((k) => deps[k])) stack.add(stackName);
    }
    if (deps.next) stack.add("next");
    if (deps.react) stack.add("react");
  } catch {
    /* no package.json */
  }

  if (walk.markdownCount > walk.fileCount * 0.25) stack.add("markdown-heavy");

  return Array.from(stack);
}
