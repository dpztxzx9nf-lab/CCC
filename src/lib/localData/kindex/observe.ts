import path from "path";
import {
  countExistingMarkers,
  detectCrossProjectLinkage,
} from "@/lib/localData/ecosystemMarkers";
import type { KindexAggregate, KindexObservation, KindexScope } from "./types";

const ONTOLOGY_MARKERS = [
  "ontology",
  "Ontology",
  "adr",
  "ADR",
  "Architecture",
  "architecture",
  "Continuity",
  "continuity",
  "docs/ontology",
  "docs/architecture",
];

const DOCS_MARKERS = ["docs", "Docs", "README.md", "index.md"];

const INDEX_ARTIFACT_MARKERS = [
  "prisma",
  "schema.sql",
  "indexer",
  "metrics",
  "import",
  "scanner",
];

const MESSAGE_MARKERS = [
  "discord",
  "Discord",
  "forums",
  "Forums",
  "messages",
  "Messages",
];

const RUNTIME_MARKERS = [
  "bot",
  "Bot",
  "runtime",
  "src/runtime",
  "ecosystem.config.cjs",
  "ecosystem.config.js",
  "pm2",
];

const PUBLIC_MARKERS = [
  "announcements",
  "Announcements",
  "public",
  "Public",
  "comms",
  "communication",
];

const CROSS_LINK_HINTS = [
  "thinkcore",
  "ccc",
  "liahona",
  "continuity",
  "kindex",
  "secondbrain",
  "archive",
];

export async function observeKindexFilesystem(
  scope: KindexScope,
): Promise<KindexObservation> {
  const roots = [
    ...new Set(
      scope.members.map((m) => m.path).filter((p) => p.length > 0),
    ),
  ];

  if (roots.length === 0) {
    return {
      ontologyMarkerCount: 0,
      docsMarkerCount: 0,
      indexArtifactCount: 0,
      messageMarkerCount: 0,
      runtimeMarkerCount: 0,
      publicMarkerCount: 0,
      crossLinkageHits: 0,
    };
  }

  let ontologyMarkerCount = 0;
  let docsMarkerCount = 0;
  let indexArtifactCount = 0;
  let messageMarkerCount = 0;
  let runtimeMarkerCount = 0;
  let publicMarkerCount = 0;
  let crossLinkageHits = 0;

  for (const root of roots) {
    ontologyMarkerCount += await countExistingMarkers(root, ONTOLOGY_MARKERS);
    docsMarkerCount += await countExistingMarkers(root, DOCS_MARKERS);
    indexArtifactCount += await countExistingMarkers(
      root,
      INDEX_ARTIFACT_MARKERS,
    );
    messageMarkerCount += await countExistingMarkers(root, MESSAGE_MARKERS);
    runtimeMarkerCount += await countExistingMarkers(root, RUNTIME_MARKERS);
    publicMarkerCount += await countExistingMarkers(root, PUBLIC_MARKERS);
    crossLinkageHits += await detectCrossProjectLinkage(root, CROSS_LINK_HINTS);
  }

  return {
    ontologyMarkerCount,
    docsMarkerCount,
    indexArtifactCount,
    messageMarkerCount,
    runtimeMarkerCount,
    publicMarkerCount,
    crossLinkageHits,
  };
}

export function aggregateKindexScope(scope: KindexScope): KindexAggregate {
  const members = scope.members;
  return {
    totalMarkdown: members.reduce((n, p) => n + p.markdownCount, 0),
    totalRecentActivity: members.reduce((n, p) => n + p.recentActivityCount, 0),
    totalActivityScore: members.reduce((n, p) => n + p.activityScore, 0),
    memberCount: members.length,
    obsidianVaultCount: members.filter((p) => p.obsidianVault).length,
    hasGitActivity: members.some(
      (p) => p.hasGit && (p.recentCodeEdits > 0 || p.recentActivityCount > 0),
    ),
    recentCodeEdits: members.reduce((n, p) => n + p.recentCodeEdits, 0),
    recentMarkdownEdits: members.reduce((n, p) => n + p.recentMarkdownEdits, 0),
  };
}
