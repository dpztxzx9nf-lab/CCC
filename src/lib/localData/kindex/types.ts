import type { RawScannedProject } from "@/lib/localData/scanners";
import type { DiscordContinuityObservation } from "./discord";

export const KINDEX_ECOSYSTEM_ID = "kindex" as const;

export interface KindexScope {
  ecosystemId: typeof KINDEX_ECOSYSTEM_ID;
  /** Canonical continuity project id for metadata */
  projectId: string;
  members: RawScannedProject[];
  anchor: RawScannedProject | null;
}

export interface KindexObservation {
  ontologyMarkerCount: number;
  docsMarkerCount: number;
  indexArtifactCount: number;
  messageMarkerCount: number;
  runtimeMarkerCount: number;
  publicMarkerCount: number;
  discordContinuity: DiscordContinuityObservation;
  crossLinkageHits: number;
}

export interface KindexAggregate {
  totalMarkdown: number;
  totalRecentActivity: number;
  totalActivityScore: number;
  memberCount: number;
  obsidianVaultCount: number;
  hasGitActivity: boolean;
  recentCodeEdits: number;
  recentMarkdownEdits: number;
}
