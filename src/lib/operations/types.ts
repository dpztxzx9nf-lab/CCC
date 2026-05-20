/** Operational sector vocabulary for continuity signals */
export type Sector =
  | "core"
  | "archive"
  | "forge"
  | "relay"
  | "runtime"
  | "observatory";

export const OPERATIONAL_SECTORS: readonly Sector[] = [
  "core",
  "archive",
  "forge",
  "relay",
  "runtime",
  "observatory",
] as const;

export type OperationalSignalSeverity = "low" | "medium" | "high" | "info";

/** Git-derived continuity signal kinds */
export type GitOperationalSignalType =
  | "repo_dirty"
  | "repo_clean"
  | "branch_detected"
  | "recent_commit_detected"
  | "remote_detected";

export type OperationalSignalType = GitOperationalSignalType | string;

/** Normalized operational signal persisted on continuity snapshot */
export interface OperationalSignal {
  id: string;
  timestamp: string;
  source: string;
  sector: Sector;
  type: OperationalSignalType;
  severity: OperationalSignalSeverity;
  metadata: Record<string, unknown>;
}
