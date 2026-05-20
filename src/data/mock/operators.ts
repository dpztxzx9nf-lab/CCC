import type { Operator } from "../types";
import { ECOLOGY_BY_OPERATOR } from "@/data/ecology";

function withEcology(
  op: Omit<Operator, "primaryDomain" | "homeChamberId" | "sectorId"> & {
    primaryDomain?: Operator["primaryDomain"];
    homeChamberId?: Operator["homeChamberId"];
  },
): Operator {
  const eco = ECOLOGY_BY_OPERATOR[op.id];
  const primaryDomain = op.primaryDomain ?? eco?.primaryDomain ?? "core";
  const homeChamberId = op.homeChamberId ?? eco?.homeChamberId ?? "nexus-prime";
  return {
    ...op,
    primaryDomain,
    homeChamberId,
    sectorId: primaryDomain,
  };
}

export const mockOperators: Operator[] = [
  withEcology({
    id: "nexus-7",
    callsign: "NEXUS-7",
    designation: "Continuity Architect",
    role: "Architecture / continuity governance",
    currentActivity: "Reviewing cross-project dependency map",
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
  }),
  withEcology({
    id: "fab-0",
    callsign: "FAB-0",
    designation: "Forge Lead",
    role: "Implementation / deployments",
    currentActivity: "Staging CCC v0.1 build pipeline",
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
  }),
  withEcology({
    id: "bcast-1",
    callsign: "BCAST-1",
    designation: "Relay Officer",
    role: "Communications / projection",
    currentActivity: "Drafting ThinkCore projection brief",
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
  }),
  withEcology({
    id: "scout-6",
    callsign: "SCOUT-6",
    designation: "Field Liaison",
    role: "Field Systems / offline intelligence",
    currentActivity: "Indexing offline navigation reference set",
    status: "nominal",
    dossier: {
      summary:
        "Scout-oriented operator for portable offline AI, navigation, survival knowledge, and operational resilience.",
      objectives: [
        "Expand offline knowledge packs",
        "Test portable inference on field hardware",
        "Cross-link Field Systems docs to Archive",
      ],
      linkedProjectIds: ["field-systems"],
      lastSync: "2026-05-18T22:10:00Z",
    },
  }),
  withEcology({
    id: "deep-1",
    callsign: "ARCHIVIST-0",
    designation: "Archivist",
    role: "Archive / memory / continuity",
    currentActivity: "Reconciling journal tags with project logs",
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
  }),
];
