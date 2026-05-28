import type { Project } from "../types";

export const mockProjects: Project[] = [
  {
    id: "liahona",
    name: "Liahona.ai",
    tagline: "Reflective orientation artifact",
    status: "active",
    domainIds: ["core", "relay", "observatory"],
    sectorIds: ["core", "relay", "observatory"],
    description:
      "Quiet symbolic interface for source-grounded reflection, continuity checkpoints, and artifact-centered orientation.",
    highlights: ["Artifact-first public surface", "Reflective source boundaries mapped"],
  },
  {
    id: "thinkcore",
    name: "ThinkCore",
    tagline: "AI systems lab and public ecosystem",
    status: "active",
    domainIds: ["core", "relay", "forge", "runtime"],
    sectorIds: ["core", "relay", "forge", "runtime"],
    description:
      "Umbrella public identity for ThinkCore research, studio projects, media, and live ecosystem routes.",
    highlights: ["thinkcore.io public home", "Sibling layers clearly routed"],
  },
  {
    id: "ccc",
    name: "CCC",
    tagline: "Continuity Command Center",
    status: "active",
    domainIds: ["core", "forge", "observatory"],
    sectorIds: ["core", "forge", "observatory"],
    description:
      "Operational command layer for live telemetry, diagnostics, workflow state, and project handoffs.",
    highlights: ["Operational facility shell", "Mock telemetry demo labeled"],
  },
  {
    id: "field-systems",
    name: "Field Systems",
    tagline: "Scout-oriented offline intelligence",
    status: "active",
    domainIds: ["core", "archive"],
    sectorIds: ["core", "archive"],
    description:
      "Portable offline AI, navigation, survival knowledge, and operational resilience. Wilderness and self-reliance intelligence — practical, not doomsday-themed.",
    highlights: ["SCOUT-6 primary operator", "Offline packs in Archive"],
  },
  {
    id: "nlo",
    name: "NLO",
    tagline: "Netherite Legends Odyssey",
    status: "live",
    domainIds: ["relay", "runtime", "forge"],
    sectorIds: ["relay", "runtime", "forge"],
    description:
      "Live Minecraft server ecosystem — SMP, PvP, factions, and player economy on Java 1.21.11. Climb the bounty board or build your wealth.",
    highlights: ["nlo.gg", "FAB-0 deployment watch", "BCAST-1 community relay"],
    ecosystem: {
      platform: "Minecraft Java",
      version: "1.21.11",
      url: "https://nlo.gg",
      modes: ["SMP", "PvP", "Factions", "Player economy"],
      tagline: "Climb the bounty board or build your wealth.",
      metrics: [
        { label: "Players online", value: "47" },
        { label: "Faction territories", value: "12" },
        { label: "Bounty contracts", value: "8 active" },
        { label: "Economy volume (24h)", value: "1.2M emeralds" },
      ],
    },
  },
  {
    id: "kindex",
    name: "KINDEX",
    tagline: "Knowledge index and retrieval layer",
    status: "planning",
    domainIds: ["archive", "observatory"],
    sectorIds: ["archive", "observatory"],
    description:
      "Structured knowledge indexing across journals, architecture docs, and templated notes — future Markdown import target.",
    highlights: ["DEEP-1 archivist link", "Import adapters planned"],
  },
];
