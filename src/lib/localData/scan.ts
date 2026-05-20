import { LOCAL_SOURCE_ROOTS, RECENT_ACTIVITY_MS } from "./config";
import { formatDisplayName, listProjectFolder, pathExists } from "./adapters/folders";
import { detectGitRepo } from "./adapters/git";
import { walkProjectTree } from "./adapters/markdown";
import {
  detectReadme,
  isReadmeRecentlyModified,
  readPackageJson,
} from "./adapters/packageJson";
import { isLocalIngestionEnabled } from "./is-enabled";
import type {
  ContinuitySignal,
  LocalContinuityReport,
  LocalProjectSummary,
} from "./types";

interface ScanTarget {
  slug: string;
  displayName: string;
  absolutePath: string;
}

async function scanSingleProject(target: ScanTarget): Promise<{
  summary: LocalProjectSummary;
  signals: ContinuitySignal[];
}> {
  const { slug, displayName, absolutePath } = target;
  const exists = await pathExists(absolutePath);

  if (!exists) {
    return {
      summary: {
        slug,
        displayName,
        detected: false,
        hasReadme: false,
        hasPackageJson: false,
        hasGitRepo: false,
        gitStatus: "unavailable",
        packageName: null,
        markdownCount: 0,
        fileCount: 0,
        subfolderCount: 0,
        lastModified: null,
        recentActivityCount: 0,
        recentMarkdownEdits: 0,
        recentCodeEdits: 0,
        readmeRecentlyModified: false,
        summary: "Source path not found on this machine",
      },
      signals: [
        {
          id: `${slug}-missing`,
          kind: "structure_detected",
          label: "Source missing",
          value: `${displayName} not detected locally`,
          severity: "warn",
          projectSlug: slug,
        },
      ],
    };
  }

  const [hasReadme, pkg, gitStatus, walk, folders, readmeRecent] =
    await Promise.all([
      detectReadme(absolutePath),
      readPackageJson(absolutePath),
      detectGitRepo(absolutePath),
      walkProjectTree(absolutePath, RECENT_ACTIVITY_MS),
      listProjectFolder(absolutePath),
      isReadmeRecentlyModified(absolutePath, RECENT_ACTIVITY_MS),
    ]);

  const hasGitRepo = gitStatus === "present";
  const packageName = pkg.name ?? null;

  const summaryParts: string[] = [];
  if (hasReadme) summaryParts.push("README");
  if (pkg.present) summaryParts.push("package.json");
  if (hasGitRepo) summaryParts.push("git");
  if (walk.markdownCount > 0) {
    summaryParts.push(`${walk.markdownCount} markdown notes`);
  }
  if (walk.recentActivityCount > 0) {
    summaryParts.push(`${walk.recentActivityCount} recent file updates`);
  }

  const summary: LocalProjectSummary = {
    slug,
    displayName,
    detected: true,
    hasReadme,
    hasPackageJson: pkg.present,
    hasGitRepo,
    gitStatus,
    packageName,
    markdownCount: walk.markdownCount,
    fileCount: walk.fileCount,
    subfolderCount: folders?.subfolderCount ?? 0,
    lastModified: walk.lastModified?.toISOString() ?? null,
    recentActivityCount: walk.recentActivityCount,
    recentMarkdownEdits: walk.recentMarkdownEdits,
    recentCodeEdits: walk.recentCodeEdits,
    readmeRecentlyModified: readmeRecent,
    summary:
      summaryParts.length > 0
        ? summaryParts.join(" · ")
        : "Project folder detected — limited continuity markers",
  };

  const signals: ContinuitySignal[] = [];

  signals.push({
    id: `${slug}-structure`,
    kind: "structure_detected",
    label: "Structure",
    value: "Project folder readable",
    severity: "positive",
    projectSlug: slug,
  });

  if (hasReadme) {
    signals.push({
      id: `${slug}-readme`,
      kind: "readme_present",
      label: "README",
      value: "Present",
      severity: "positive",
      projectSlug: slug,
    });
  }

  if (pkg.present) {
    signals.push({
      id: `${slug}-pkg`,
      kind: "package_json",
      label: "package.json",
      value: packageName ?? "Present",
      severity: "positive",
      projectSlug: slug,
    });
  }

  signals.push({
    id: `${slug}-git`,
    kind: "git_repo",
    label: "Git repository",
    value: hasGitRepo ? "Detected (.git)" : "Not detected",
    severity: hasGitRepo ? "positive" : "info",
    projectSlug: slug,
  });

  if (walk.markdownCount > 0) {
    signals.push({
      id: `${slug}-md`,
      kind: "markdown_volume",
      label: "Markdown notes",
      value: String(walk.markdownCount),
      severity: "info",
      projectSlug: slug,
    });
  }

  if (walk.recentActivityCount > 0) {
    signals.push({
      id: `${slug}-recent`,
      kind: "recent_activity",
      label: "Recent activity (7d)",
      value: `${walk.recentActivityCount} files`,
      severity: "positive",
      projectSlug: slug,
    });
  }

  signals.push({
    id: `${slug}-summary`,
    kind: "source_summary",
    label: "Source summary",
    value: summary.summary,
    severity: "info",
    projectSlug: slug,
  });

  return { summary, signals };
}

function childSlug(parentSlug: string, childName: string): string {
  return `${parentSlug}--${childName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

/** Read-only scan of configured local continuity sources */
export async function scanLocalContinuity(): Promise<LocalContinuityReport> {
  const scannedAt = new Date().toISOString();

  if (!isLocalIngestionEnabled()) {
    return {
      enabled: false,
      label: "LOCAL DEV DATA",
      scannedAt,
      sources: [],
      signals: [],
      totals: {
        projects: LOCAL_SOURCE_ROOTS.length,
        detectedProjects: 0,
        markdownFiles: 0,
        recentActivityCount: 0,
        sourcesScanned: 0,
      },
      message: "Local ingestion disabled in this environment (using mock data).",
    };
  }

  const targets: ScanTarget[] = [];

  for (const source of LOCAL_SOURCE_ROOTS) {
    targets.push({
      slug: source.slug,
      displayName: source.displayName,
      absolutePath: source.root,
    });

    const folders = await listProjectFolder(source.root);
    if (!folders) continue;

    for (const child of folders.childProjectDirs.slice(0, 12)) {
      const hasMarkers =
        (await detectReadme(child.absolutePath)) ||
        (await readPackageJson(child.absolutePath)).present ||
        (await detectGitRepo(child.absolutePath)) === "present";

      if (!hasMarkers) continue;

      targets.push({
        slug: childSlug(source.slug, child.name),
        displayName: `${source.displayName} / ${formatDisplayName(child.name)}`,
        absolutePath: child.absolutePath,
      });
    }
  }

  const sources: LocalProjectSummary[] = [];
  const signals: ContinuitySignal[] = [];

  for (const target of targets) {
    const result = await scanSingleProject(target);
    sources.push(result.summary);
    signals.push(...result.signals);
  }

  const detectedProjects = sources.filter((s) => s.detected).length;
  const markdownFiles = sources.reduce((n, s) => n + s.markdownCount, 0);
  const recentActivityCount = sources.reduce(
    (n, s) => n + s.recentActivityCount,
    0,
  );

  return {
    enabled: true,
    label: "LOCAL DEV DATA",
    scannedAt,
    sources,
    signals,
    totals: {
      projects: LOCAL_SOURCE_ROOTS.length,
      detectedProjects,
      markdownFiles,
      recentActivityCount,
      sourcesScanned: detectedProjects,
    },
  };
}
