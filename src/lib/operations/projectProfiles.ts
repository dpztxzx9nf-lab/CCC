import type { SectorId } from "@/data/types";
import type { OperationalCategory } from "./taxonomy";
import type { OperatorId } from "./taxonomy";

export interface ProjectProfile {
  id: string;
  canonicalName: string;
  /** Maps to local scan slug when present */
  localSlug: string | null;
  description: string;
  tagline: string;
  sectors: SectorId[];
  category: OperationalCategory;
  /** 1 (low) – 5 (critical) */
  continuityPriority: number;
  operatorIds: OperatorId[];
  stack: string[];
  deploymentCapable: boolean;
  repoExpected: boolean;
  systemsAffected: string[];
}

export const PROJECT_PROFILES: ProjectProfile[] = [
  {
    id: "ccc",
    canonicalName: "CCC",
    localSlug: "ccc",
    description:
      "Continuity Command Center — operational projection layer over projects, systems, and workflows.",
    tagline: "Continuity Command Center",
    sectors: ["core", "forge", "observatory"],
    category: "command",
    continuityPriority: 5,
    operatorIds: ["nexus-7", "fab-0", "deep-1"],
    stack: ["Next.js", "TypeScript", "Tailwind"],
    deploymentCapable: true,
    repoExpected: true,
    systemsAffected: ["command-ui", "continuity-ingestion", "thinkcore-projection"],
  },
  {
    id: "liahona",
    canonicalName: "Liahona.ai",
    localSlug: "liahona",
    description: "Guidance-layer intelligence initiative aligned with ThinkCore continuity.",
    tagline: "Guidance-layer intelligence",
    sectors: ["core", "relay", "observatory"],
    category: "intelligence",
    continuityPriority: 4,
    operatorIds: ["nexus-7", "bcast-1"],
    stack: ["AI", "TypeScript"],
    deploymentCapable: true,
    repoExpected: true,
    systemsAffected: ["guidance-models", "projection", "continuity-docs"],
  },
  {
    id: "thinkcore",
    canonicalName: "ThinkCore",
    localSlug: "thinkcore",
    description: "Core platform and projection substrate; parent context for CCC.",
    tagline: "Core platform substrate",
    sectors: ["core", "relay", "forge", "runtime"],
    category: "platform",
    continuityPriority: 5,
    operatorIds: ["nexus-7", "fab-0", "bcast-1"],
    stack: ["Web", "API", "Infrastructure"],
    deploymentCapable: true,
    repoExpected: true,
    systemsAffected: ["platform-core", "dns", "deployment-rail"],
  },
  {
    id: "kindex",
    canonicalName: "KINDEX",
    localSlug: "second-brain",
    description: "Knowledge index and retrieval across journals and architecture docs.",
    tagline: "Knowledge index layer",
    sectors: ["archive", "observatory"],
    category: "archive",
    continuityPriority: 3,
    operatorIds: ["deep-1"],
    stack: ["Markdown", "Index"],
    deploymentCapable: false,
    repoExpected: false,
    systemsAffected: ["vault-index", "memory-lattice"],
  },
  {
    id: "nlo",
    canonicalName: "NLO",
    localSlug: null,
    description:
      "Netherite Legends Odyssey — live Minecraft ecosystem (SMP, PvP, factions, economy).",
    tagline: "Netherite Legends Odyssey",
    sectors: ["relay", "runtime", "forge"],
    category: "game-runtime",
    continuityPriority: 4,
    operatorIds: ["fab-0", "bcast-1"],
    stack: ["Minecraft Java 1.21", "Server"],
    deploymentCapable: true,
    repoExpected: true,
    systemsAffected: ["game-server", "community-relay", "economy-runtime"],
  },
  {
    id: "second-brain",
    canonicalName: "Second Brain",
    localSlug: "second-brain",
    description: "Obsidian vault and Markdown continuity substrate for long-horizon memory.",
    tagline: "Obsidian continuity vault",
    sectors: ["archive", "core"],
    category: "knowledge",
    continuityPriority: 4,
    operatorIds: ["deep-1", "nexus-7"],
    stack: ["Obsidian", "Markdown", "Templater"],
    deploymentCapable: false,
    repoExpected: false,
    systemsAffected: ["vault", "journals", "architecture-docs"],
  },
];

const profileById = new Map(PROJECT_PROFILES.map((p) => [p.id, p]));
const profileBySlug = new Map(
  PROJECT_PROFILES.filter((p) => p.localSlug).map((p) => [p.localSlug!, p]),
);

export function getProjectProfile(id: string): ProjectProfile | undefined {
  return profileById.get(id);
}

export function getProfileByLocalSlug(slug: string): ProjectProfile | undefined {
  return profileBySlug.get(slug);
}
