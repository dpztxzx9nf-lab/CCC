import type { SectorId, SystemStatus } from "@/data/types";

/** Operational category — how a project participates in continuity */
export type OperationalCategory =
  | "command"
  | "platform"
  | "intelligence"
  | "knowledge"
  | "game-runtime"
  | "archive";

/** Classified activity kinds mapped to sectors */
export type ActivityKind =
  | "documentation"
  | "continuity"
  | "architecture"
  | "forge"
  | "runtime"
  | "deployment"
  | "archive"
  | "communications"
  | "observability";

export type ActivityLevel = "low" | "medium" | "high" | "idle";

export type OperatorState = "focused" | "distributed" | "idle" | "elevated";

export const OPERATOR_IDS = [
  "nexus-7",
  "fab-0",
  "bcast-1",
  "scout-6",
  "deep-1",
] as const;

export type OperatorId = (typeof OPERATOR_IDS)[number];

export const ALL_SECTOR_IDS: SectorId[] = [
  "core",
  "archive",
  "forge",
  "observatory",
  "relay",
  "runtime",
];

/** Which sectors each activity kind contributes to */
export const ACTIVITY_SECTOR_MAP: Record<ActivityKind, SectorId[]> = {
  documentation: ["core", "archive"],
  continuity: ["archive", "core"],
  architecture: ["core", "observatory"],
  forge: ["forge", "runtime"],
  runtime: ["runtime", "forge"],
  deployment: ["forge", "runtime", "relay"],
  archive: ["archive"],
  communications: ["relay"],
  observability: ["observatory"],
};

export function activityToStatus(score: number): SystemStatus {
  if (score >= 75) return "elevated";
  if (score >= 40) return "nominal";
  if (score > 0) return "nominal";
  return "nominal";
}

export function scoreToActivityLevel(score: number): ActivityLevel {
  if (score >= 60) return "high";
  if (score >= 25) return "medium";
  if (score > 0) return "low";
  return "idle";
}
