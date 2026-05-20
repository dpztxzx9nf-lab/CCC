import type { Station } from "../types";

export const mockStations: Station[] = [
  { id: "continuity-desk", name: "Continuity Desk", sectorId: "core", description: "Strategic routing and priority board." },
  { id: "governance-console", name: "Governance Console", sectorId: "core", description: "Architecture review and policy checks." },
  { id: "vault-indexer", name: "Vault Indexer", sectorId: "archive", description: "Obsidian vault indexing and link graph." },
  { id: "memory-lattice", name: "Memory Lattice", sectorId: "archive", description: "Long-horizon memory threading." },
  { id: "build-forge", name: "Build Forge", sectorId: "forge", description: "Compile, test, and artifact staging." },
  { id: "deploy-rail", name: "Deploy Rail", sectorId: "forge", description: "Release train and environment promotion." },
  { id: "metrics-array", name: "Metrics Array", sectorId: "observatory", description: "Ecosystem telemetry aggregation." },
  { id: "cost-scanner", name: "Cost Scanner", sectorId: "observatory", description: "API and token spend tracking." },
  { id: "broadcast-hub", name: "Broadcast Hub", sectorId: "relay", description: "Outbound comms and publishing." },
  { id: "projection-deck", name: "Projection Deck", sectorId: "relay", description: "Public narrative and launch surfaces." },
  { id: "runtime-monitor", name: "Runtime Monitor", sectorId: "runtime", description: "Live service health and uptime." },
  { id: "api-gateway", name: "API Gateway", sectorId: "runtime", description: "API routing and rate observability." },
];
