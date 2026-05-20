/** Stage 1 local continuity ingestion — server-side only */

export type ContinuitySignalKind =
  | "structure_detected"
  | "readme_present"
  | "package_json"
  | "git_repo"
  | "markdown_volume"
  | "recent_activity"
  | "source_summary";

export type SignalSeverity = "info" | "positive" | "warn";

export interface ContinuitySignal {
  id: string;
  kind: ContinuitySignalKind;
  label: string;
  value: string;
  severity: SignalSeverity;
  projectSlug: string;
}

export type GitRepoStatus = "present" | "absent" | "unavailable";

export interface LocalProjectSummary {
  slug: string;
  displayName: string;
  detected: boolean;
  hasReadme: boolean;
  hasPackageJson: boolean;
  hasGitRepo: boolean;
  gitStatus: GitRepoStatus;
  packageName: string | null;
  markdownCount: number;
  fileCount: number;
  subfolderCount: number;
  lastModified: string | null;
  recentActivityCount: number;
  recentMarkdownEdits: number;
  recentCodeEdits: number;
  readmeRecentlyModified: boolean;
  summary: string;
}

export interface LocalContinuityTotals {
  projects: number;
  detectedProjects: number;
  markdownFiles: number;
  recentActivityCount: number;
  sourcesScanned: number;
}

export interface LocalContinuityReport {
  enabled: boolean;
  label: string;
  scannedAt: string;
  sources: LocalProjectSummary[];
  signals: ContinuitySignal[];
  totals: LocalContinuityTotals;
  message?: string;
}
