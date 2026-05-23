import { countExistingMarkers } from "@/lib/localData/ecosystemMarkers";
import type { LiahonaObservation } from "./types";

const RUNTIME_MARKERS = [
  "src/runtime",
  "src/execution",
  "src/ports",
  "ecosystem.config.cjs",
  "ecosystem.config.js",
];

const SOURCE_MARKERS = [
  "src/sources",
  "src/sources/canonical",
  "src/sources/continuity",
  "src/sources/live",
  "src/sources/runtime",
];

const GROUNDING_MARKERS = [
  "docs",
  "README.md",
  "src/grounding",
  "src/source-grounding",
  "grounding",
  "corpus",
];

const MEMORY_MARKERS = [
  "src/canonical",
  "src/canonical/corpora",
  "src/continuity",
  "src/continuity/scopes",
  "data",
  "legacy-archive",
];

const PROJECTION_MARKERS = [
  "src/projection",
  "src/projection/artifact",
  "src/delivery",
];

const DISCORD_MARKERS = ["src/projection/discord"];

const DEPLOY_MARKERS = [
  ".github/workflows",
  "vercel.json",
  "scripts",
  "dev-portal",
];

const GOVERNANCE_MARKERS = [
  "authority",
  "governance",
  "policy",
  "policies",
  "config",
  "src/config",
];

export async function observeLiahonaFilesystem(
  projectPath: string,
): Promise<LiahonaObservation> {
  return {
    runtimeMarkerCount: await countExistingMarkers(
      projectPath,
      RUNTIME_MARKERS,
    ),
    sourcesMarkerCount: await countExistingMarkers(
      projectPath,
      SOURCE_MARKERS,
    ),
    groundingMarkerCount: await countExistingMarkers(
      projectPath,
      GROUNDING_MARKERS,
    ),
    memoryMarkerCount: await countExistingMarkers(projectPath, MEMORY_MARKERS),
    projectionMarkerCount: await countExistingMarkers(
      projectPath,
      PROJECTION_MARKERS,
    ),
    discordMarkerCount: await countExistingMarkers(
      projectPath,
      DISCORD_MARKERS,
    ),
    deployMarkerCount: await countExistingMarkers(projectPath, DEPLOY_MARKERS),
    governanceMarkerCount: await countExistingMarkers(
      projectPath,
      GOVERNANCE_MARKERS,
    ),
  };
}
