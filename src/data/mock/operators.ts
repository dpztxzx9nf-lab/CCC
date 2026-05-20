import type { Operator } from "../types";

export const mockOperators: Operator[] = [
  {
    id: "nexus-7",
    callsign: "NEXUS-7",
    designation: "Continuity Architect",
    role: "Architecture / continuity governance",
    currentActivity: "Reviewing cross-project dependency map",
    sectorId: "core",
    status: "nominal",
    dossier: {
      summary:
        "Primary governance operator for strategic alignment, architecture decisions, and continuity across Obsidian, Git, and Kanban substrates.",
      objectives: [
        "Maintain architecture doc coherence",
        "Route priority shifts between projects",
        "Audit continuity gaps weekly",
      ],
      linkedProjectIds: ["thinkcore", "ccc", "liahona"],
      lastSync: "2026-05-19T08:42:00Z",
    },
  },
  {
    id: "fab-0",
    callsign: "FAB-0",
    designation: "Forge Lead",
    role: "Implementation / deployments",
    currentActivity: "Staging CCC v0.1 build pipeline",
    sectorId: "forge",
    status: "nominal",
    dossier: {
      summary:
        "Owns implementation velocity, CI/CD, and deployment health for web apps, APIs, and game server infrastructure.",
      objectives: [
        "Ship CCC first stable release",
        "Monitor NLO server patch cadence",
        "Reduce deploy friction on ThinkCore",
      ],
      linkedProjectIds: ["ccc", "thinkcore", "nlo"],
      lastSync: "2026-05-19T09:15:00Z",
    },
  },
  {
    id: "bcast-1",
    callsign: "BCAST-1",
    designation: "Relay Officer",
    role: "Communications / projection",
    currentActivity: "Drafting ThinkCore projection brief",
    sectorId: "relay",
    status: "nominal",
    dossier: {
      summary:
        "Manages outward communications, publishing workflows, and narrative projection for active initiatives.",
      objectives: [
        "Align public-facing copy with continuity docs",
        "Coordinate NLO community signals",
        "Prepare Liahona launch comms",
      ],
      linkedProjectIds: ["thinkcore", "liahona", "nlo"],
      lastSync: "2026-05-19T07:30:00Z",
    },
  },
  {
    id: "scout-6",
    callsign: "SCOUT-6",
    designation: "Field Liaison",
    role: "Field Systems / offline intelligence",
    currentActivity: "Indexing offline navigation reference set",
    sectorId: "core",
    status: "nominal",
    dossier: {
      summary:
        "Scout-oriented operator for portable offline AI, navigation, survival knowledge, and operational resilience — wilderness intelligence without prepper theatrics.",
      objectives: [
        "Expand offline knowledge packs",
        "Test portable inference on field hardware",
        "Cross-link Field Systems docs to Archive",
      ],
      linkedProjectIds: ["field-systems"],
      lastSync: "2026-05-18T22:10:00Z",
    },
  },
  {
    id: "deep-1",
    callsign: "DEEP-1",
    designation: "Archivist",
    role: "Archive / memory / continuity",
    currentActivity: "Reconciling journal tags with project logs",
    sectorId: "archive",
    status: "nominal",
    dossier: {
      summary:
        "Steward of long-term memory: journals, logs, templated notes, and historical project threads from Obsidian vaults.",
      objectives: [
        "Normalize log schemas across projects",
        "Surface stale continuity threads",
        "Prepare Markdown import adapters",
      ],
      linkedProjectIds: ["ccc", "kindex", "thinkcore"],
      lastSync: "2026-05-19T06:00:00Z",
    },
  },
];
