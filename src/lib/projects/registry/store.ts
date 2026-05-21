import "server-only";

import { readFile, stat } from "fs/promises";
import { readFileSync } from "fs";
import {
  backupCorruptJsonFile,
  writeJsonAtomic,
} from "@/lib/persistence/json-io";
import {
  isProjectRegistryEntry,
  isProjectRegistryFile,
  PROJECT_REGISTRY_SCHEMA_VERSION,
  type ProjectRegistryEntry,
  type ProjectRegistryFile,
} from "./schema";
import { projectRegistryPath } from "./paths";
import { createDefaultProjectRegistry } from "./seed";

function nowIso(): string {
  return new Date().toISOString();
}

function slugifyId(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function parseRegistryJson(raw: string): ProjectRegistryFile {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("empty registry file");
  const parsed: unknown = JSON.parse(trimmed);
  if (!isProjectRegistryFile(parsed)) {
    throw new Error("invalid project registry shape");
  }
  return parsed;
}

export async function loadProjectRegistry(
  cwd: string = process.cwd(),
): Promise<ProjectRegistryFile> {
  const filePath = projectRegistryPath(cwd);

  let exists = false;
  try {
    await stat(filePath);
    exists = true;
  } catch {
    exists = false;
  }

  if (!exists) {
    const initial = createDefaultProjectRegistry();
    await writeJsonAtomic(filePath, initial);
    return initial;
  }

  let raw = "";
  try {
    raw = await readFile(filePath, { encoding: "utf8" });
  } catch {
    const initial = createDefaultProjectRegistry();
    await writeJsonAtomic(filePath, initial);
    return initial;
  }

  try {
    return parseRegistryJson(raw);
  } catch {
    await backupCorruptJsonFile(filePath, raw);
    const initial = createDefaultProjectRegistry();
    await writeJsonAtomic(filePath, initial);
    return initial;
  }
}

export function loadProjectRegistrySync(
  cwd: string = process.cwd(),
): ProjectRegistryFile {
  const filePath = projectRegistryPath(cwd);
  try {
    const raw = readFileSync(filePath, { encoding: "utf8" });
    return parseRegistryJson(raw);
  } catch {
    return createDefaultProjectRegistry();
  }
}

export async function saveProjectRegistry(
  registry: ProjectRegistryFile,
  cwd: string = process.cwd(),
): Promise<ProjectRegistryFile> {
  const next: ProjectRegistryFile = {
    ...registry,
    schemaVersion: PROJECT_REGISTRY_SCHEMA_VERSION,
    updatedAt: nowIso(),
  };
  await writeJsonAtomic(projectRegistryPath(cwd), next);
  return next;
}

export type CreateProjectInput = Omit<
  ProjectRegistryEntry,
  "id" | "createdAt" | "updatedAt" | "archivedAt"
> & { id?: string };

export type UpdateProjectInput = Partial<
  Omit<ProjectRegistryEntry, "id" | "createdAt" | "updatedAt">
>;

export async function listRegistryProjects(
  cwd?: string,
  options?: { includeArchived?: boolean },
): Promise<ProjectRegistryEntry[]> {
  const registry = await loadProjectRegistry(cwd);
  if (options?.includeArchived) return registry.projects;
  return registry.projects.filter((p) => !p.archivedAt);
}

export async function createRegistryProject(
  input: CreateProjectInput,
  cwd?: string,
): Promise<ProjectRegistryEntry> {
  const registry = await loadProjectRegistry(cwd);
  const at = nowIso();
  let id = input.id?.trim() || slugifyId(input.name);
  if (!id) throw new Error("project id required");
  if (registry.projects.some((p) => p.id === id)) {
    id = `${id}-${Date.now().toString(36).slice(-4)}`;
  }

  const entry: ProjectRegistryEntry = {
    id,
    name: input.name.trim(),
    tagline: input.tagline ?? "",
    description: input.description ?? "",
    status: input.status,
    domainIds: input.domainIds,
    linkedPaths: input.linkedPaths ?? [],
    urls: input.urls ?? [],
    localSlug: input.localSlug ?? null,
    category: input.category,
    continuityPriority: input.continuityPriority,
    operatorIds: input.operatorIds ?? [],
    stack: input.stack ?? [],
    deploymentCapable: input.deploymentCapable ?? false,
    repoExpected: input.repoExpected ?? false,
    systemsAffected: input.systemsAffected ?? [],
    highlights: input.highlights ?? [],
    ecosystem: input.ecosystem,
    archivedAt: null,
    createdAt: at,
    updatedAt: at,
  };

  if (!isProjectRegistryEntry(entry)) {
    throw new Error("invalid project entry");
  }

  await saveProjectRegistry({
    ...registry,
    projects: [...registry.projects, entry],
  });

  return entry;
}

export async function updateRegistryProject(
  id: string,
  patch: UpdateProjectInput,
  cwd?: string,
): Promise<ProjectRegistryEntry> {
  const registry = await loadProjectRegistry(cwd);
  const index = registry.projects.findIndex((p) => p.id === id);
  if (index < 0) throw new Error(`project not found: ${id}`);

  const current = registry.projects[index]!;
  const updated: ProjectRegistryEntry = {
    ...current,
    ...patch,
    id: current.id,
    createdAt: current.createdAt,
    updatedAt: nowIso(),
  };

  const projects = [...registry.projects];
  projects[index] = updated;

  if (!isProjectRegistryEntry(updated)) {
    throw new Error("invalid project patch");
  }

  await saveProjectRegistry({ ...registry, projects });
  return updated;
}

export async function archiveRegistryProject(
  id: string,
  cwd?: string,
): Promise<ProjectRegistryEntry> {
  return updateRegistryProject(id, { archivedAt: nowIso() }, cwd);
}

export async function restoreRegistryProject(
  id: string,
  cwd?: string,
): Promise<ProjectRegistryEntry> {
  return updateRegistryProject(id, { archivedAt: null }, cwd);
}

export async function deleteRegistryProject(
  id: string,
  cwd?: string,
): Promise<void> {
  const registry = await loadProjectRegistry(cwd);
  const next = registry.projects.filter((p) => p.id !== id);
  if (next.length === registry.projects.length) {
    throw new Error(`project not found: ${id}`);
  }
  await saveProjectRegistry({ ...registry, projects: next });
}
