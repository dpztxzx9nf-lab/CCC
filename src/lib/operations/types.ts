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
  | "latest_commit_detected"
  | "recent_commit_detected"
  | "remote_detected"
  | "repo_ahead"
  | "repo_behind"
  | "git_code_changed"
  | "git_deployment_changed"
  | "git_infrastructure_changed"
  | "git_docs_continuity_changed";

export type HistoricalOperationalSignalType =
  | "historical_recurring_sector_activity"
  | "historical_long_running_pressure"
  | "historical_repeated_system_involvement"
  | "historical_continuity_density_trend"
  | "historical_deployment_build_cycle"
  | "historical_sustained_runtime_instability";

export type OperationalSignalType =
  | GitOperationalSignalType
  | HistoricalOperationalSignalType
  | string;

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
