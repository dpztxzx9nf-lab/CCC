import type { OperationalDomainId } from "@/data/ecology";
import type { OperatorId } from "@/lib/operations/taxonomy";

/** Truthful substrate — shared continuity event, before sector lens */
export type SubstrateSignalKind =
  | "standby"
  | "typescript_change"
  | "file_change"
  | "markdown_change"
  | "structure_detected"
  | "deployment"
  | "continuity_signal"
  | "sector_heat"
  | "runtime_signal"
  | "communications"
  | "architecture"
  | "observability"
  | "project_activity"
  | "generic_signal";

export interface ClassifiedSubstrateSignal {
  kind: SubstrateSignalKind;
  /** Raw project name when present in activity */
  projectName: string | null;
  /** Normalized signal fragment from scan */
  signalFragment: string | null;
}

export interface InterpretationPhrase {
  activity: string;
  cause: string | null;
}

export interface OperatorInterpretationProfile {
  domain: OperationalDomainId;
  operationalLens: string;
  priorities: readonly string[];
  vocabulary: readonly string[];
  phrases: Record<SubstrateSignalKind, InterpretationPhrase>;
}

const SECTOR_PROFILES: Record<OperationalDomainId, OperatorInterpretationProfile> = {
  forge: {
    domain: "forge",
    operationalLens: "Construction, builds, and engineering pressure",
    priorities: [
      "construction",
      "builds",
      "infrastructure changes",
      "runtime modification",
      "engineering pressure",
    ],
    vocabulary: [
      "building",
      "fabrication",
      "runtime modification",
      "compilation",
      "infrastructure pressure",
    ],
    phrases: {
      standby: { activity: "Forge lane idle", cause: null },
      typescript_change: {
        activity: "Build pressure increasing",
        cause: "Engineering substrate shifting — TypeScript surface",
      },
      file_change: {
        activity: "Fabrication workload detected",
        cause: "Build pressure increasing",
      },
      markdown_change: {
        activity: "Implementation docs in flux",
        cause: "Build-adjacent documentation changing",
      },
      structure_detected: {
        activity: "Forge structure on record",
        cause: "Project topology affecting build graph",
      },
      deployment: {
        activity: "Deployment rail active",
        cause: "Release pathway under modification",
      },
      continuity_signal: {
        activity: "Forge continuity cross-check",
        cause: "Upstream continuity affecting build lane",
      },
      sector_heat: {
        activity: "Forge sector heat elevated",
        cause: "Infrastructure pressure rising in sector",
      },
      runtime_signal: {
        activity: "Runtime modification detected",
        cause: "Live runtime coupling build output",
      },
      communications: {
        activity: "Build comms channel active",
        cause: "Outward projection tied to forge work",
      },
      architecture: {
        activity: "Structural engineering review",
        cause: "Architecture signals pressing forge lane",
      },
      observability: {
        activity: "Build observability sweep",
        cause: "Telemetry reflecting fabrication load",
      },
      project_activity: {
        activity: "Active forge initiative",
        cause: "Project signals increasing build pressure",
      },
      generic_signal: {
        activity: "Forge activity detected",
        cause: "Operational signals on fabrication substrate",
      },
    },
  },
  archive: {
    domain: "archive",
    operationalLens: "Continuity, preservation, and record consolidation",
    priorities: [
      "continuity",
      "preservation",
      "records",
      "markdown",
      "consolidation",
    ],
    vocabulary: [
      "continuity",
      "consolidation",
      "synchronization",
      "archival pressure",
      "record updates",
    ],
    phrases: {
      standby: { activity: "Archive lane quiet", cause: null },
      typescript_change: {
        activity: "Record corpus updating",
        cause: "Continuity records shifting — typed sources",
      },
      file_change: {
        activity: "Archival pressure rising",
        cause: "Continuity records shifting",
      },
      markdown_change: {
        activity: "Markdown continuity in motion",
        cause: "Record consolidation underway",
      },
      structure_detected: {
        activity: "Archive structure indexed",
        cause: "Corpus topology re-indexing",
      },
      deployment: {
        activity: "Archive deploy trace logged",
        cause: "Deployment events entering record stream",
      },
      continuity_signal: {
        activity: "Archive continuity active",
        cause: "Continuity substrate pulse detected",
      },
      sector_heat: {
        activity: "Archive sector heat registered",
        cause: "Archival pressure elevated in sector",
      },
      runtime_signal: {
        activity: "Runtime records cross-linked",
        cause: "Runtime events entering archive stream",
      },
      communications: {
        activity: "Record propagation channel active",
        cause: "Outbound continuity projection updating",
      },
      architecture: {
        activity: "Continuity architecture review",
        cause: "Structural continuity signals accumulating",
      },
      observability: {
        activity: "Archive observability pass",
        cause: "Indexing pressure on historical records",
      },
      project_activity: {
        activity: "Archive initiative active",
        cause: "Project continuity records shifting",
      },
      generic_signal: {
        activity: "Archive continuity active",
        cause: "Record updates on continuity substrate",
      },
    },
  },
  observatory: {
    domain: "observatory",
    operationalLens: "Indexing, semantic analysis, and observational sweep",
    priorities: [
      "indexing",
      "semantic analysis",
      "scanning",
      "observability",
      "interpretation",
    ],
    vocabulary: [
      "scanning",
      "observational sweep",
      "semantic activity",
      "signal analysis",
      "indexing pressure",
    ],
    phrases: {
      standby: { activity: "Observatory sweep idle", cause: null },
      typescript_change: {
        activity: "Semantic surface changing",
        cause: "Semantic activity detected — typed codebase",
      },
      file_change: {
        activity: "Observational sweep active",
        cause: "Semantic activity detected",
      },
      markdown_change: {
        activity: "Corpus semantics shifting",
        cause: "Indexing pressure on documentation layer",
      },
      structure_detected: {
        activity: "Observatory structure indexed",
        cause: "Topology reinterpretation in progress",
      },
      deployment: {
        activity: "Deployment pattern under observation",
        cause: "Release topology entering scan scope",
      },
      continuity_signal: {
        activity: "Continuity pattern analysis",
        cause: "Cross-domain signals under interpretation",
      },
      sector_heat: {
        activity: "Observatory heat spike",
        cause: "Elevated signal density in sector",
      },
      runtime_signal: {
        activity: "Runtime observability sweep",
        cause: "Live systems under semantic scan",
      },
      communications: {
        activity: "Projection pattern analysis",
        cause: "Outbound signal pathways monitored",
      },
      architecture: {
        activity: "Architecture observability",
        cause: "Structural signals under analysis",
      },
      observability: {
        activity: "Observational sweep active",
        cause: "Signal analysis pressure elevated",
      },
      project_activity: {
        activity: "Initiative under observation",
        cause: "Project semantics shifting in scan",
      },
      generic_signal: {
        activity: "Observational sweep active",
        cause: "Semantic activity on continuity substrate",
      },
    },
  },
  relay: {
    domain: "relay",
    operationalLens: "Deployment, routing, and external projection",
    priorities: [
      "deployment",
      "routing",
      "publishing",
      "network propagation",
      "external projection",
    ],
    vocabulary: [
      "uplink",
      "deployment",
      "routing",
      "propagation",
      "transmission",
    ],
    phrases: {
      standby: { activity: "Relay channel standby", cause: null },
      typescript_change: {
        activity: "Uplink source changing",
        cause: "Deployment pathways affected — typed stack",
      },
      file_change: {
        activity: "Transmission substrate active",
        cause: "Deployment pathways affected",
      },
      markdown_change: {
        activity: "Publishing corpus updating",
        cause: "Outbound record propagation underway",
      },
      structure_detected: {
        activity: "Relay topology mapped",
        cause: "Routing graph adjusting to structure",
      },
      deployment: {
        activity: "Deployment rail engaged",
        cause: "Release propagation in progress",
      },
      continuity_signal: {
        activity: "Relay continuity sync",
        cause: "Continuity feed affecting transmission",
      },
      sector_heat: {
        activity: "Relay sector heat elevated",
        cause: "Propagation pressure rising",
      },
      runtime_signal: {
        activity: "Runtime uplink activity",
        cause: "Live services affecting relay routes",
      },
      communications: {
        activity: "Broadcast hub active",
        cause: "External projection channel live",
      },
      architecture: {
        activity: "Routing architecture review",
        cause: "Topology shift affecting relay paths",
      },
      observability: {
        activity: "Relay observability pass",
        cause: "Transmission telemetry elevated",
      },
      project_activity: {
        activity: "Initiative projection active",
        cause: "Project pathways affecting relay",
      },
      generic_signal: {
        activity: "Relay continuity active",
        cause: "Operational signals on transmission substrate",
      },
    },
  },
  core: {
    domain: "core",
    operationalLens: "Orchestration, coordination, and initiative topology",
    priorities: [
      "orchestration",
      "coordination",
      "initiative topology",
      "ecosystem state",
      "strategic pressure",
    ],
    vocabulary: [
      "orchestration",
      "coordination",
      "topology",
      "initiative convergence",
      "operational alignment",
    ],
    phrases: {
      standby: { activity: "Command topology steady", cause: null },
      typescript_change: {
        activity: "Initiative topology evolving",
        cause: "Operational topology evolving — engineering surface",
      },
      file_change: {
        activity: "Ecosystem state shifting",
        cause: "Operational topology evolving",
      },
      markdown_change: {
        activity: "Strategic record alignment",
        cause: "Continuity alignment across initiatives",
      },
      structure_detected: {
        activity: "Command topology mapped",
        cause: "Initiative structure rebalancing",
      },
      deployment: {
        activity: "Cross-initiative deployment",
        cause: "Release topology affecting command plane",
      },
      continuity_signal: {
        activity: "Command continuity active",
        cause: "Continuity convergence across sectors",
      },
      sector_heat: {
        activity: "Strategic pressure elevated",
        cause: "Multi-sector heat on command substrate",
      },
      runtime_signal: {
        activity: "Runtime orchestration active",
        cause: "Live systems affecting initiative topology",
      },
      communications: {
        activity: "Coordination channel live",
        cause: "Projection aligning initiative narrative",
      },
      architecture: {
        activity: "Architecture orchestration",
        cause: "Structural signals driving alignment",
      },
      observability: {
        activity: "Command observability sweep",
        cause: "Ecosystem telemetry under coordination",
      },
      project_activity: {
        activity: "Initiative convergence active",
        cause: "Project signals reshaping topology",
      },
      generic_signal: {
        activity: "Command continuity active",
        cause: "Operational alignment shifting",
      },
    },
  },
  runtime: {
    domain: "runtime",
    operationalLens: "Live services, APIs, and production continuity",
    priorities: [
      "runtime",
      "services",
      "APIs",
      "production load",
      "live continuity",
    ],
    vocabulary: [
      "runtime",
      "live grid",
      "service pressure",
      "production load",
      "operational continuity",
    ],
    phrases: {
      standby: { activity: "Runtime lane idle", cause: null },
      typescript_change: {
        activity: "Service surface changing",
        cause: "Live runtime coupling typed changes",
      },
      file_change: {
        activity: "Runtime continuity active",
        cause: "Production substrate shifting",
      },
      markdown_change: {
        activity: "Runtime docs updating",
        cause: "Operational records affecting live grid",
      },
      structure_detected: {
        activity: "Runtime topology mapped",
        cause: "Service graph adjusting",
      },
      deployment: {
        activity: "Production deployment active",
        cause: "Live pathway under modification",
      },
      continuity_signal: {
        activity: "Runtime continuity sweep",
        cause: "Continuity feed affecting live services",
      },
      sector_heat: {
        activity: "Runtime sector heat elevated",
        cause: "Production load rising",
      },
      runtime_signal: {
        activity: "Live grid diagnostics",
        cause: "Runtime signals elevated on substrate",
      },
      communications: {
        activity: "Runtime comms bridge active",
        cause: "Outbound paths tied to live services",
      },
      architecture: {
        activity: "Runtime architecture review",
        cause: "Structural change on production plane",
      },
      observability: {
        activity: "Runtime observability sweep",
        cause: "Live telemetry pressure elevated",
      },
      project_activity: {
        activity: "Runtime initiative active",
        cause: "Project load on production substrate",
      },
      generic_signal: {
        activity: "Runtime continuity active",
        cause: "Operational signals on live substrate",
      },
    },
  },
};

/** Operator-level lens refinements — same substrate, role-specific emphasis */
const OPERATOR_REFINEMENTS: Partial<
  Record<OperatorId, Partial<Record<SubstrateSignalKind, Partial<InterpretationPhrase>>>>
> = {
  "fab-0": {
    typescript_change: {
      activity: "Build pressure increasing",
      cause: "Compilation surface shifting",
    },
    deployment: {
      cause: "Deploy rail responding to substrate change",
    },
  },
  "deep-1": {
    file_change: {
      cause: "Continuity records shifting",
    },
    markdown_change: {
      activity: "Vault consolidation active",
    },
  },
  "bcast-1": {
    file_change: {
      cause: "Deployment pathways affected",
    },
    communications: {
      activity: "Broadcast propagation live",
    },
  },
  "scout-6": {
    file_change: {
      cause: "Semantic activity detected",
    },
    observability: {
      activity: "Field observability sweep",
    },
  },
  "nexus-7": {
    file_change: {
      cause: "Operational topology evolving",
    },
    sector_heat: {
      activity: "Strategic pressure across topology",
    },
  },
};

export function getOperatorInterpretationProfile(
  operatorId: string,
  primaryDomain: OperationalDomainId,
): OperatorInterpretationProfile {
  return SECTOR_PROFILES[primaryDomain] ?? SECTOR_PROFILES.core;
}

/** Classify raw scan text into a shared substrate event (truthful, not invented). */
export function classifySubstrateSignal(
  lastSignal: string | null,
  rawActivity: string,
  projectName: string | null,
): ClassifiedSubstrateSignal {
  const combined = `${lastSignal ?? ""} ${rawActivity}`.trim().toLowerCase();

  if (
    /^standby\s*[-–—]\s*no local activity/i.test(rawActivity) ||
    /no active local signals/i.test(rawActivity) ||
    /owned sectors/i.test(rawActivity)
  ) {
    return { kind: "standby", projectName: null, signalFragment: null };
  }

  if (/typescript|\.ts\b|tsx|compilation/i.test(combined)) {
    return {
      kind: "typescript_change",
      projectName,
      signalFragment: lastSignal,
    };
  }

  if (/\.md\b|markdown|journal|vault|log schema/i.test(combined)) {
    return {
      kind: "markdown_change",
      projectName,
      signalFragment: lastSignal,
    };
  }

  if (/deploy|deployment|release|uplink/i.test(combined)) {
    return {
      kind: "deployment",
      projectName,
      signalFragment: lastSignal,
    };
  }

  if (/continuity|archive|reconcil|vault sync/i.test(combined)) {
    return {
      kind: "continuity_signal",
      projectName,
      signalFragment: lastSignal,
    };
  }

  if (/runtime|live grid|api gateway|production|service/i.test(combined)) {
    return {
      kind: "runtime_signal",
      projectName,
      signalFragment: lastSignal,
    };
  }

  if (/communicat|broadcast|projection|relay|publish/i.test(combined)) {
    return {
      kind: "communications",
      projectName,
      signalFragment: lastSignal,
    };
  }

  if (/architect|dependency|governance/i.test(combined)) {
    return {
      kind: "architecture",
      projectName,
      signalFragment: lastSignal,
    };
  }

  if (/observ|semantic|index|scan/i.test(combined)) {
    return {
      kind: "observability",
      projectName,
      signalFragment: lastSignal,
    };
  }

  if (/structure detected/i.test(combined)) {
    return {
      kind: "structure_detected",
      projectName,
      signalFragment: lastSignal,
    };
  }

  if (/sector heat/i.test(combined)) {
    return {
      kind: "sector_heat",
      projectName,
      signalFragment: lastSignal,
    };
  }

  if (/recent file activity|file changed/i.test(combined)) {
    return {
      kind: "file_change",
      projectName,
      signalFragment: lastSignal,
    };
  }

  if (projectName || /^[^:]+:\s*.+/.test(rawActivity.trim())) {
    const match = rawActivity.match(/^([^:]+):\s*(.+)$/);
    return {
      kind: "project_activity",
      projectName: projectName ?? match?.[1]?.trim() ?? null,
      signalFragment: lastSignal ?? match?.[2]?.trim() ?? null,
    };
  }

  if (lastSignal?.trim()) {
    return {
      kind: "generic_signal",
      projectName,
      signalFragment: lastSignal.trim(),
    };
  }

  return { kind: "generic_signal", projectName, signalFragment: null };
}

function mergePhrase(
  base: InterpretationPhrase,
  refinement?: Partial<InterpretationPhrase>,
): InterpretationPhrase {
  if (!refinement) return base;
  return {
    activity: refinement.activity ?? base.activity,
    cause: refinement.cause !== undefined ? refinement.cause : base.cause,
  };
}

export function interpretHoverAwareness(
  operatorId: string,
  primaryDomain: OperationalDomainId,
  classified: ClassifiedSubstrateSignal,
  chamberLabel: string,
): { activity: string; cause: string | null } {
  const profile = getOperatorInterpretationProfile(operatorId, primaryDomain);
  const base = profile.phrases[classified.kind] ?? profile.phrases.generic_signal;
  const refinement = OPERATOR_REFINEMENTS[operatorId as OperatorId]?.[classified.kind];
  let phrase = mergePhrase(base, refinement);

  if (classified.kind === "sector_heat") {
    phrase = {
      ...phrase,
      activity: phrase.activity.replace(/sector/i, `${chamberLabel} sector`),
    };
  }

  if (classified.kind === "project_activity" && classified.projectName) {
    const proj = classified.projectName;
    phrase = {
      activity: `${proj} — ${phrase.activity}`,
      cause: phrase.cause?.replace(/\bProject\b/g, proj) ?? phrase.cause,
    };
  }

  if (
    classified.kind === "generic_signal" &&
    classified.signalFragment &&
    phrase.cause
  ) {
    const frag = classified.signalFragment.replace(/_/g, " ").replace(/\s*\([^)]*\)\s*$/, "");
    phrase = {
      activity: phrase.activity,
      cause: `${phrase.cause} (${frag})`,
    };
  }

  return phrase;
}
