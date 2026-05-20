import type { Project } from "../types";

export const mockProjects: Project[] = [
  {
    id: "liahona",
    name: "Liahona.ai",
    tagline: "Guidance-layer intelligence initiative",
    status: "active",
    domainIds: ["core", "relay", "observatory"],
    sectorIds: ["core", "relay", "observatory"],
    description:
      "Strategic AI guidance project aligned with ThinkCore continuity — architecture and projection in early operational phase.",
    highlights: ["Continuity docs linked", "Launch comms in Relay queue"],
  },
  {
    id: "thinkcore",
    name: "ThinkCore",
    tagline: "Core platform and projection substrate",
    status: "active",
    domainIds: ["core", "relay", "forge", "runtime"],
    sectorIds: ["core", "relay", "forge", "runtime"],
    description:
      "Central platform for systems, workflows, and outward projection — parent context for CCC deployment at ccc.thinkcore.io.",
    highlights: ["ccc.thinkcore.io target", "Multi-sector operators assigned"],
  },
  {
    id: "ccc",
    name: "CCC",
    tagline: "Continuity Command Center",
    status: "active",
    domainIds: ["core", "forge", "observatory"],
    sectorIds: ["core", "forge", "observatory"],
    description:
      "Living operational projection layer — this interface. Sci-fi continuity command center for projects, systems, workflows, and goals.",
    highlights: ["v0.1 stable shell", "Mock telemetry — demo labeled"],
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
