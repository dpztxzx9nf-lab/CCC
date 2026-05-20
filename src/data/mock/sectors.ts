import type { Sector } from "../types";

export const mockSectors: Sector[] = [
  {
    id: "core",
    name: "Core",
    codename: "NEXUS PRIME",
    description:
      "Continuity governance, strategic alignment, and command routing for all active threads.",
    status: "nominal",
    operatorIds: ["nexus-7"],
    stationIds: ["continuity-desk", "governance-console"],
  },
  {
    id: "archive",
    name: "Archive",
    codename: "DEEP STACK",
    description:
      "Memory, journals, architecture docs, and long-horizon project continuity from Obsidian substrate.",
    status: "nominal",
    operatorIds: ["deep-1"],
    stationIds: ["vault-indexer", "memory-lattice"],
  },
  {
    id: "forge",
    name: "Forge",
    codename: "FAB YARD",
    description:
      "Implementation, builds, deployments, and materialization of designs into running systems.",
    status: "nominal",
    operatorIds: ["fab-0"],
    stationIds: ["build-forge", "deploy-rail"],
  },
  {
    id: "observatory",
    name: "Observatory",
    codename: "SKY DECK",
    description:
      "Telemetry, analytics, cost signals, and ecosystem health across projects and runtimes.",
    status: "elevated",
    operatorIds: [],
    stationIds: ["metrics-array", "cost-scanner"],
  },
  {
    id: "relay",
    name: "Relay",
    codename: "SIGNAL BRIDGE",
    description:
      "Communications, projection, publishing, and outward-facing continuity for ThinkCore and allies.",
    status: "nominal",
    operatorIds: ["bcast-1"],
    stationIds: ["broadcast-hub", "projection-deck"],
  },
  {
    id: "runtime",
    name: "Runtime",
    codename: "LIVE GRID",
    description:
      "Active services, APIs, game servers, and operational workloads in production.",
    status: "nominal",
    operatorIds: ["fab-0"],
    stationIds: ["runtime-monitor", "api-gateway"],
  },
];
