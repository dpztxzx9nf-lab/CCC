/**
 * Canonical project identity contract (types only — Phase 0).
 */

export interface ProjectIdentity {
  projectId: string;
  displayName: string;
  localSlug: string | null;
  scanKeys: string[];
  linkedPaths: string[];
}
