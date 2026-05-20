import type { Station } from "../types";
import { DOMAIN_TO_HOME_CHAMBER } from "@/data/ecology";

function station(
  id: string,
  name: string,
  domainId: Station["domainId"],
  description: string,
): Station {
  return {
    id,
    name,
    domainId,
    chamberId: DOMAIN_TO_HOME_CHAMBER[domainId],
    sectorId: domainId,
    description,
  };
}

export const mockStations: Station[] = [
  station("continuity-desk", "Continuity Desk", "core", "Strategic routing and priority board."),
  station("governance-console", "Governance Console", "core", "Architecture review and policy checks."),
  station("vault-indexer", "Vault Indexer", "archive", "Obsidian vault indexing and link graph."),
  station("memory-lattice", "Memory Lattice", "archive", "Long-horizon memory threading."),
  station("build-forge", "Build Forge", "forge", "Compile, test, and artifact staging."),
  station("deploy-rail", "Deploy Rail", "forge", "Release train and environment promotion."),
  station("metrics-array", "Metrics Array", "observatory", "Ecosystem telemetry aggregation."),
  station("cost-scanner", "Cost Scanner", "observatory", "API and token spend tracking."),
  station("broadcast-hub", "Broadcast Hub", "relay", "Outbound comms and publishing."),
  station("projection-deck", "Projection Deck", "relay", "Public narrative and launch surfaces."),
  station("runtime-monitor", "Runtime Monitor", "runtime", "Live service health and uptime."),
  station("api-gateway", "API Gateway", "runtime", "API routing and rate observability."),
];
