import { readdir, readFile, stat } from "fs/promises";
import path from "path";
import type { OperationalDomainId } from "@/data/ecology";
import type { OperatorId } from "@/lib/operations/taxonomy";
import type { RawScannedProject } from "@/lib/localData/scanners";
import { formatDisplayName } from "@/lib/localData/adapters/folders";
import { backupCorruptJsonFile, writeJsonAtomic } from "@/lib/persistence/json-io";
import { projectRegistryPath } from "./paths";
import { createDefaultProjectRegistry } from "./seed";
import {
  isProjectRegistryEntry,
  isProjectRegistryFile,
  PROJECT_REGISTRY_SCHEMA_VERSION,
  type ProjectRegistryDiscovery,
  type ProjectRegistryDiscoveryConfidence,
  type ProjectRegistryEntry,
  type ProjectRegistryFile,
  type ProjectRegistryStatus,
} from "./schema";

const ROOT_PROJECT_MARKER_FILES = [
  "package.json",
  "README.md",
  "readme.md",
  "Readme.md",
  "README.MD",
  "ecosystem.config.cjs",
  "ecosystem.config.js",
  "ecosystem.config.mjs",
];

const ROOT_PROJECT_MARKER_DIRS = ["docs", "app", "lib", "components", "src"];

const STACK_LABELS: Record<string, string> = {
  typescript: "TypeScript",
  javascript: "JavaScript",
  next: "Next.js",
  react: "React",
  python: "Python",
  rust: "Rust",
  "markdown-heavy": "Markdown",
  "active-code": "Active code",
};

interface DiscoveryMarkers {
  files: string[];
  dirs: string[];
  readmeHeading: string | null;
  readmeSummary: string | null;
}

function nowIso(): string {
  return new Date().toISOString();
}

async function loadRegistryForDiscovery(cwd: string): Promise<ProjectRegistryFile> {
  const filePath = projectRegistryPath(cwd);
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (isProjectRegistryFile(parsed)) return parsed;
    await backupCorruptJsonFile(filePath, raw);
  } catch {
    /* seed below */
  }

  const initial = createDefaultProjectRegistry();
  await writeJsonAtomic(filePath, initial);
  return initial;
}

async function saveRegistryForDiscovery(
  registry: ProjectRegistryFile,
  cwd: string,
): Promise<ProjectRegistryFile> {
  const next = {
    ...registry,
    schemaVersion: PROJECT_REGISTRY_SCHEMA_VERSION,
    updatedAt: nowIso(),
  } satisfies ProjectRegistryFile;
  await writeJsonAtomic(projectRegistryPath(cwd), next);
  return next;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^@[^/]+[/\\]/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function normalizePath(value: string): string {
  return path.resolve(value).toLowerCase();
}

async function existsAsFile(filePath: string): Promise<boolean> {
  try {
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
}

async function existsAsDir(dirPath: string): Promise<boolean> {
  try {
    return (await stat(dirPath)).isDirectory();
  } catch {
    return false;
  }
}

function firstMarkdownParagraph(markdown: string): string | null {
  const lines = markdown.split(/\r?\n/);
  let paragraph: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      if (paragraph.length > 0) break;
      continue;
    }
    if (/^[-*+]\s+/.test(trimmed) || /^```/.test(trimmed)) continue;
    paragraph.push(trimmed);
    if (paragraph.join(" ").length >= 220) break;
  }

  const joined = paragraph.join(" ").trim();
  return joined.length > 0 ? joined.slice(0, 240) : null;
}

async function readReadmeMetadata(projectPath: string): Promise<{
  heading: string | null;
  summary: string | null;
}> {
  for (const name of ROOT_PROJECT_MARKER_FILES.filter((n) =>
    /^readme\.md$/i.test(n),
  )) {
    const filePath = path.join(projectPath, name);
    if (!(await existsAsFile(filePath))) continue;

    try {
      const raw = await readFile(filePath, "utf8");
      const heading =
        raw
          .split(/\r?\n/)
          .map((line) => line.trim())
          .find((line) => /^#\s+/.test(line))
          ?.replace(/^#\s+/, "")
          .trim() ?? null;
      return {
        heading: heading && heading.length > 0 ? heading.slice(0, 120) : null,
        summary: firstMarkdownParagraph(raw),
      };
    } catch {
      return { heading: null, summary: null };
    }
  }

  return { heading: null, summary: null };
}

async function scanRootMarkers(projectPath: string): Promise<DiscoveryMarkers> {
  const [readme, entries] = await Promise.all([
    readReadmeMetadata(projectPath),
    readdir(projectPath, { withFileTypes: true }).catch(() => []),
  ]);

  const files: string[] = [];
  const dirs: string[] = [];
  const entryNames = new Set(entries.map((entry) => entry.name));

  for (const file of ROOT_PROJECT_MARKER_FILES) {
    if (entryNames.has(file) && (await existsAsFile(path.join(projectPath, file)))) {
      files.push(file);
    }
  }

  for (const dir of ROOT_PROJECT_MARKER_DIRS) {
    if (entryNames.has(dir) && (await existsAsDir(path.join(projectPath, dir)))) {
      dirs.push(`${dir}/`);
    }
  }

  return {
    files,
    dirs,
    readmeHeading: readme.heading,
    readmeSummary: readme.summary,
  };
}

function isProjectRoot(markers: DiscoveryMarkers, project: RawScannedProject): boolean {
  if (project.hasPackageJson) return true;
  if (markers.files.some((file) => /^readme\.md$/i.test(file))) return true;
  if (markers.files.some((file) => /^ecosystem\.config\.[cm]?js$/i.test(file))) {
    return true;
  }
  if (markers.dirs.some((dir) => ROOT_PROJECT_MARKER_DIRS.includes(dir.replace("/", "")))) {
    return true;
  }
  return project.hasGit && project.fileCount > 0;
}

function stackLabels(project: RawScannedProject, markers: DiscoveryMarkers): string[] {
  const stack = new Set<string>();
  for (const item of project.likelyStack) {
    const label = STACK_LABELS[item] ?? formatDisplayName(item);
    stack.add(label);
  }
  if (markers.dirs.includes("app/")) stack.add("App");
  if (markers.files.some((file) => /^ecosystem\.config\./i.test(file))) stack.add("PM2");
  return Array.from(stack);
}

function confidenceFor(
  project: RawScannedProject,
  markers: DiscoveryMarkers,
): ProjectRegistryDiscoveryConfidence {
  let score = 0;
  if (project.hasPackageJson) score += 3;
  if (project.packageName) score += 2;
  if (project.packageDescription || markers.readmeSummary) score += 2;
  if (markers.readmeHeading) score += 1;
  if (project.hasGit) score += 1;
  if (markers.dirs.length > 0) score += 1;

  if (score >= 6) return "high";
  if (score >= 3) return "medium";
  return "low";
}

function categoryFor(project: RawScannedProject): ProjectRegistryEntry["category"] {
  if (project.sectorClassification === "archive") return "archive";
  if (project.sectorClassification === "core") return "platform";
  if (project.sectorClassification === "runtime") return "platform";
  if (project.sectorClassification === "observatory") return "intelligence";
  return "platform";
}

function operatorsFor(domainIds: OperationalDomainId[]): OperatorId[] {
  if (domainIds.includes("archive")) return ["deep-1"];
  if (domainIds.includes("relay")) return ["bcast-1"];
  if (domainIds.includes("runtime") || domainIds.includes("forge")) return ["fab-0"];
  if (domainIds.includes("core")) return ["nexus-7"];
  return [];
}

function buildEvidence(
  project: RawScannedProject,
  markers: DiscoveryMarkers,
): string[] {
  const evidence = [...markers.files, ...markers.dirs];
  if (project.hasGit) evidence.push(".git");
  if (project.markdownCount > 0) evidence.push(`${project.markdownCount} markdown files`);
  if (project.recentActivityCount > 0) {
    evidence.push(`${project.recentActivityCount} recent file updates`);
  }
  return Array.from(new Set(evidence));
}

function deriveIdentity(
  project: RawScannedProject,
  markers: DiscoveryMarkers,
): {
  name: string;
  tagline: string;
  description: string;
  inferredFields: string[];
} {
  const packageDisplay = project.packageName
    ? formatDisplayName(project.packageName.replace(/^@[^/]+[/\\]/, ""))
    : null;
  const name = markers.readmeHeading
    ? markers.readmeHeading
    : packageDisplay
      ? packageDisplay
      : formatDisplayName(path.basename(project.path));
  const description = project.packageDescription ?? markers.readmeSummary ?? "";
  const tagline = project.packageDescription ?? markers.readmeHeading ?? "";

  return {
    name,
    tagline,
    description,
    inferredFields: [
      ...(project.packageName || markers.readmeHeading ? [] : ["name"]),
      ...(description ? [] : ["tagline", "description"]),
      "status",
      "domainIds",
      "category",
      "continuityPriority",
      "operatorIds",
      "stack",
      "deploymentCapable",
      "repoExpected",
    ],
  };
}

function buildDiscoveryEntry(
  project: RawScannedProject,
  markers: DiscoveryMarkers,
  at: string,
  existingIds: Set<string>,
): ProjectRegistryEntry {
  const packageSlug = project.packageName ? slugify(project.packageName) : "";
  const folderSlug = slugify(path.basename(project.path));
  const localSlug = packageSlug || folderSlug || slugify(project.name);
  let id = localSlug || slugify(project.id);
  while (existingIds.has(id)) {
    id = `${id}-auto`;
  }
  existingIds.add(id);

  const identity = deriveIdentity(project, markers);
  const domainIds = [project.sectorClassification] as OperationalDomainId[];
  const stack = stackLabels(project, markers);
  const evidence = buildEvidence(project, markers);
  const discovery: ProjectRegistryDiscovery = {
    source: "auto",
    discoveredAt: at,
    lastSeenAt: at,
    confidence: confidenceFor(project, markers),
    evidence,
    inferredFields: identity.inferredFields,
  };

  const entry: ProjectRegistryEntry = {
    id,
    name: identity.name,
    tagline: identity.tagline,
    description: identity.description,
    status: "unlinked" satisfies ProjectRegistryStatus,
    domainIds,
    linkedPaths: [project.path],
    urls: [],
    localSlug,
    category: categoryFor(project),
    continuityPriority: project.activityScore >= 40 ? 3 : 2,
    operatorIds: operatorsFor(domainIds),
    stack,
    deploymentCapable: project.runtimeCapable,
    repoExpected: project.hasGit,
    systemsAffected: [],
    highlights: evidence.slice(0, 4).map((item) => `Detected: ${item}`),
    discovery,
    archivedAt: null,
    createdAt: at,
    updatedAt: at,
  };

  if (!isProjectRegistryEntry(entry)) {
    throw new Error(`invalid discovered project entry: ${project.path}`);
  }

  return entry;
}

function findRegistryMatch(
  registry: ProjectRegistryFile,
  project: RawScannedProject,
  localSlug: string,
): ProjectRegistryEntry | null {
  const discoveredPath = normalizePath(project.path);
  return (
    registry.projects.find((entry) =>
      entry.linkedPaths.some((linkedPath) => normalizePath(linkedPath) === discoveredPath),
    ) ??
    registry.projects.find((entry) => entry.localSlug === localSlug) ??
    null
  );
}

export interface ProjectDiscoveryMergeResult {
  registry: ProjectRegistryFile;
  created: number;
  refreshed: number;
}

export async function mergeDiscoveredProjectsIntoRegistry(
  projects: RawScannedProject[],
  cwd: string = process.cwd(),
): Promise<ProjectDiscoveryMergeResult> {
  const registry = await loadRegistryForDiscovery(cwd);
  const at = nowIso();
  const existingIds = new Set(registry.projects.map((project) => project.id));
  const nextProjects = [...registry.projects];
  let created = 0;
  let refreshed = 0;

  for (const project of projects) {
    if (project.scanRootId !== "projects") continue;

    const markers = await scanRootMarkers(project.path);
    if (!isProjectRoot(markers, project)) continue;

    const localSlug = slugify(project.packageName ?? path.basename(project.path));
    const matched = findRegistryMatch(
      { ...registry, projects: nextProjects },
      project,
      localSlug,
    );

    if (matched) {
      if (matched.discovery?.source !== "auto") continue;

      const index = nextProjects.findIndex((entry) => entry.id === matched.id);
      if (index < 0) continue;

      const evidence = buildEvidence(project, markers);
      const identity = deriveIdentity(project, markers);
      nextProjects[index] = {
        ...matched,
        name: identity.name,
        tagline: identity.tagline,
        description: identity.description,
        linkedPaths: matched.linkedPaths.includes(project.path)
          ? matched.linkedPaths
          : [...matched.linkedPaths, project.path],
        stack: stackLabels(project, markers),
        deploymentCapable: project.runtimeCapable,
        repoExpected: project.hasGit,
        discovery: {
          ...matched.discovery,
          lastSeenAt: at,
          confidence: confidenceFor(project, markers),
          evidence,
          inferredFields: identity.inferredFields,
        },
        updatedAt: at,
      };
      refreshed++;
      continue;
    }

    nextProjects.push(buildDiscoveryEntry(project, markers, at, existingIds));
    created++;
  }

  if (created === 0 && refreshed === 0) {
    return { registry, created, refreshed };
  }

  const saved = await saveRegistryForDiscovery(
    { ...registry, projects: nextProjects },
    cwd,
  );
  return { registry: saved, created, refreshed };
}
