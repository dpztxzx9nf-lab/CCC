import type {
  ChamberId,
  OperationalDomain,
  OperationalDomainId,
  OperatorEcology,
  PhysicalChamber,
} from "./types";

export const OPERATIONAL_DOMAINS: OperationalDomain[] = [
  {
    id: "core",
    name: "Core",
    description:
      "Continuity governance, strategic alignment, and command routing across active threads.",
    status: "nominal",
  },
  {
    id: "archive",
    name: "Archive",
    description:
      "Memory, journals, architecture docs, and long-horizon project continuity.",
    status: "nominal",
  },
  {
    id: "forge",
    name: "Forge",
    description:
      "Implementation, builds, deployments, and materialization of designs into systems.",
    status: "nominal",
  },
  {
    id: "observatory",
    name: "Observatory",
    description:
      "Telemetry, analytics, cost signals, and ecosystem health across projects.",
    status: "elevated",
  },
  {
    id: "relay",
    name: "Relay",
    description:
      "Communications, projection, publishing, and outward-facing continuity.",
    status: "nominal",
  },
  {
    id: "runtime",
    name: "Runtime",
    description:
      "Active services, APIs, game servers, and production workloads.",
    status: "nominal",
  },
];

export const PHYSICAL_CHAMBERS: PhysicalChamber[] = [
  {
    id: "nexus-prime",
    name: "Nexus Prime",
    codename: "NEXUS PRIME",
    primaryDomain: "core",
    description:
      "Command spine of the megastructure — governance consoles and continuity routing.",
    status: "nominal",
    operatorIds: ["nexus-7"],
    stationIds: ["continuity-desk", "governance-console"],
  },
  {
    id: "deep-stack",
    name: "Deep Stack",
    codename: "DEEP STACK",
    primaryDomain: "archive",
    description:
      "Vault tiers, memory lattice, and long-horizon continuity storage.",
    status: "nominal",
    operatorIds: ["deep-1"],
    stationIds: ["vault-indexer", "memory-lattice"],
  },
  {
    id: "foundry",
    name: "Foundry",
    codename: "FOUNDRY",
    primaryDomain: "forge",
    description:
      "Build benches, deploy rails, and materialization of designs into running systems.",
    status: "nominal",
    operatorIds: ["fab-0"],
    stationIds: ["build-forge", "deploy-rail"],
  },
  {
    id: "observation-deck",
    name: "Observation Deck",
    codename: "OBSERVATION DECK",
    primaryDomain: "observatory",
    description: "Metrics arrays, cost scanners, and observatory analysis decks.",
    status: "elevated",
    operatorIds: ["scout-6"],
    stationIds: ["metrics-array", "cost-scanner"],
  },
  {
    id: "signal-bridge",
    name: "Signal Bridge",
    codename: "SIGNAL BRIDGE",
    primaryDomain: "relay",
    description:
      "Broadcast hub, projection deck, and outward continuity uplinks.",
    status: "nominal",
    operatorIds: ["bcast-1"],
    stationIds: ["broadcast-hub", "projection-deck"],
  },
  {
    id: "live-grid",
    name: "Live Grid",
    codename: "LIVE GRID",
    primaryDomain: "runtime",
    description:
      "Runtime monitors, API gateways, and live production workloads.",
    status: "nominal",
    operatorIds: [],
    stationIds: ["runtime-monitor", "api-gateway"],
  },
];

export const OPERATOR_ECOLOGY: OperatorEcology[] = [
  { operatorId: "nexus-7", primaryDomain: "core", homeChamberId: "nexus-prime" },
  { operatorId: "deep-1", primaryDomain: "archive", homeChamberId: "deep-stack" },
  { operatorId: "fab-0", primaryDomain: "forge", homeChamberId: "foundry" },
  { operatorId: "bcast-1", primaryDomain: "relay", homeChamberId: "signal-bridge" },
  { operatorId: "scout-6", primaryDomain: "observatory", homeChamberId: "observation-deck" },
];

export const DOMAIN_TO_HOME_CHAMBER: Record<OperationalDomainId, ChamberId> = {
  core: "nexus-prime",
  archive: "deep-stack",
  forge: "foundry",
  observatory: "observation-deck",
  relay: "signal-bridge",
  runtime: "live-grid",
};

export const CHAMBER_TO_DOMAIN: Record<ChamberId, OperationalDomainId> = {
  "nexus-prime": "core",
  "deep-stack": "archive",
  foundry: "forge",
  "observation-deck": "observatory",
  "signal-bridge": "relay",
  "live-grid": "runtime",
};

export const CHAMBER_GRID_AREA: Record<ChamberId, string> = {
  "nexus-prime": "core",
  "signal-bridge": "relay",
  foundry: "forge",
  "observation-deck": "observatory",
  "deep-stack": "archive",
  "live-grid": "runtime",
};

export const CHAMBER_ORDER: ChamberId[] = [
  "nexus-prime",
  "signal-bridge",
  "foundry",
  "observation-deck",
  "deep-stack",
  "live-grid",
];

export const CHAMBER_BY_ID = Object.fromEntries(
  PHYSICAL_CHAMBERS.map((c) => [c.id, c]),
) as Record<ChamberId, PhysicalChamber>;

export const DOMAIN_BY_ID = Object.fromEntries(
  OPERATIONAL_DOMAINS.map((d) => [d.id, d]),
) as Record<OperationalDomainId, OperationalDomain>;

export const ECOLOGY_BY_OPERATOR = Object.fromEntries(
  OPERATOR_ECOLOGY.map((e) => [e.operatorId, e]),
) as Record<string, OperatorEcology>;
