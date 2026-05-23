import type { OperationalDomainId } from "@/data/ecology";
import type { OperationalCategory } from "@/lib/operations/taxonomy";
import type { OperatorId } from "@/lib/operations/taxonomy";
import type { ProjectEcosystem } from "@/data/types";

export const PROJECT_REGISTRY_SCHEMA_VERSION = 1 as const;

export type ProjectRegistrySchemaVersion = typeof PROJECT_REGISTRY_SCHEMA_VERSION;

export const PROJECT_REGISTRY_STATUSES = [
  "active",
  "live",
  "early",
  "concept",
  "dormant",
  "external",
  "unlinked",
] as const;

export type ProjectRegistryStatus = (typeof PROJECT_REGISTRY_STATUSES)[number];

export type ProjectRegistryGitHub =
  | { repository: string }
  | { owner: string; repo: string };

export interface ProjectRegistryEntry {
  id: string;
  name: string;
  tagline: string;
  description: string;
  status: ProjectRegistryStatus;
  domainIds: OperationalDomainId[];
  linkedPaths: string[];
  urls: string[];
  localSlug: string | null;
  category: OperationalCategory;
  continuityPriority: number;
  operatorIds: OperatorId[];
  stack: string[];
  deploymentCapable: boolean;
  repoExpected: boolean;
  systemsAffected: string[];
  highlights: string[];
  github?: ProjectRegistryGitHub;
  ecosystem?: ProjectEcosystem;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectRegistryFile {
  schemaVersion: ProjectRegistrySchemaVersion;
  projects: ProjectRegistryEntry[];
  createdAt: string;
  updatedAt: string;
}

const DOMAIN_IDS = new Set<OperationalDomainId>([
  "core",
  "archive",
  "forge",
  "observatory",
  "relay",
  "runtime",
]);

const CATEGORIES = new Set<OperationalCategory>([
  "command",
  "platform",
  "intelligence",
  "knowledge",
  "game-runtime",
  "archive",
]);

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

function isGitHub(v: unknown): v is ProjectRegistryGitHub {
  if (!v || typeof v !== "object") return false;
  const g = v as Record<string, unknown>;
  if (isNonEmptyString(g.repository)) return true;
  return isNonEmptyString(g.owner) && isNonEmptyString(g.repo);
}

function isDomainIds(v: unknown): v is OperationalDomainId[] {
  return (
    Array.isArray(v) &&
    v.length > 0 &&
    v.every((d) => typeof d === "string" && DOMAIN_IDS.has(d as OperationalDomainId))
  );
}

function isOperatorIds(v: unknown): v is OperatorId[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

function isEcosystem(v: unknown): v is ProjectEcosystem {
  if (!v || typeof v !== "object") return false;
  const e = v as ProjectEcosystem;
  return (
    isNonEmptyString(e.platform) &&
    isNonEmptyString(e.tagline) &&
    Array.isArray(e.modes) &&
    Array.isArray(e.metrics)
  );
}

export function isProjectRegistryEntry(v: unknown): v is ProjectRegistryEntry {
  if (!v || typeof v !== "object") return false;
  const e = v as ProjectRegistryEntry;
  return (
    isNonEmptyString(e.id) &&
    isNonEmptyString(e.name) &&
    typeof e.tagline === "string" &&
    typeof e.description === "string" &&
    PROJECT_REGISTRY_STATUSES.includes(e.status as ProjectRegistryStatus) &&
    isDomainIds(e.domainIds) &&
    isStringArray(e.linkedPaths) &&
    isStringArray(e.urls) &&
    (e.localSlug === null || typeof e.localSlug === "string") &&
    CATEGORIES.has(e.category as OperationalCategory) &&
    typeof e.continuityPriority === "number" &&
    e.continuityPriority >= 1 &&
    e.continuityPriority <= 5 &&
    isOperatorIds(e.operatorIds) &&
    isStringArray(e.stack) &&
    typeof e.deploymentCapable === "boolean" &&
    typeof e.repoExpected === "boolean" &&
    isStringArray(e.systemsAffected) &&
    isStringArray(e.highlights) &&
    (e.github === undefined || isGitHub(e.github)) &&
    (e.ecosystem === undefined || isEcosystem(e.ecosystem)) &&
    (e.archivedAt === null || isNonEmptyString(e.archivedAt)) &&
    isNonEmptyString(e.createdAt) &&
    isNonEmptyString(e.updatedAt)
  );
}

export function isProjectRegistryFile(v: unknown): v is ProjectRegistryFile {
  if (!v || typeof v !== "object") return false;
  const f = v as ProjectRegistryFile;
  return (
    f.schemaVersion === PROJECT_REGISTRY_SCHEMA_VERSION &&
    Array.isArray(f.projects) &&
    f.projects.every(isProjectRegistryEntry) &&
    isNonEmptyString(f.createdAt) &&
    isNonEmptyString(f.updatedAt)
  );
}
