import path from "path";

export function projectRegistryPath(cwd: string = process.cwd()): string {
  return path.join(cwd, "data", "projects", "registry.json");
}
