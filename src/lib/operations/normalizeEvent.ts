import { randomUUID } from "crypto";
import path from "path";
import type { ClassifiedChange } from "@/lib/archivist/classify-change";
import type { SectorId } from "@/data/types";
import type { OperationalEventType, OperationalEvent } from "./events";
import { assessSignificance } from "./significance";

/** Raw scanner / watcher signal prior to normalization */
export type RawOperationalSignal =
  | {
      kind: "classified_change";
      change: ClassifiedChange;
      timestamp?: string;
      lockfileOnlyHint?: boolean;
      failedBuild?: boolean;
    }
  | {
      kind: "deploy_outcome";
      deployed: boolean;
      commitHash: string | null;
      skippedReason: string | null;
      significanceTier?: string;
      timestamp?: string;
    };

function inferOperationalEventType(filePath: string): OperationalEventType {
  const base = path.basename(filePath);
  const lower = filePath.toLowerCase().replace(/\//g, "\\");

  if (/\.mdx?$/i.test(base)) return "markdown_changed";
  if (/\.(tsx?|jsx?|mjs|cjs)$/i.test(base)) return "code_changed";
  if (/package\.json$/i.test(base)) return "package_detected";
  if (/\.git(\\|\/|$)/i.test(lower) || /^\.git/i.test(base)) return "git_detected";
  if (/vercel\.json|ecosystem\.config|dockerfile|compose\.ya?ml$/i.test(base)) {
    return "runtime_signal";
  }
  return "file_changed";
}

/**
 * Path-based sector precedence (operational ingestion rules).
 * Refines / may override coarse classifier sector for projection.
 */
export function inferOperationalSector(filePath: string): SectorId {
  const norm = filePath.replace(/\//g, "\\").toLowerCase();
  const base = path.basename(filePath).toLowerCase();

  if (
    norm.includes("\\ccc\\") ||
    /continuity-|archivist|megastructure/i.test(norm)
  ) {
    return "core";
  }
  if (
    /\.mdx?$/i.test(base) ||
    /journal|secondbrain|vault|obsidian/i.test(norm) ||
    norm.includes("\\archive\\") ||
    /[\\/]docs?[\\/]/i.test(filePath)
  ) {
    return "archive";
  }
  if (
    /\.(tsx?|jsx?|mjs|cjs)$/i.test(base) ||
    /package\.json|tsconfig|next\.config|vite\.config|webpack/i.test(base)
  ) {
    return "forge";
  }
  if (
    /vercel|pm2|ecosystem|dockerfile|docker-compose|\.env|api[\\/]routes/i.test(norm)
  ) {
    return "runtime";
  }
  if (
    norm.includes("\\public\\") ||
    norm.includes("\\.github\\workflows") ||
    norm.includes("\\pages\\") ||
    /discord|publish|deploy|thinkcore/i.test(norm)
  ) {
    return "relay";
  }
  if (/prisma|schema\.sql|migrate|indexer|scanner|metrics|import|\.db/i.test(norm)) {
    return "observatory";
  }

  return "forge";
}

export function normalizeOperationalSignal(signal: RawOperationalSignal): OperationalEvent {
  const ts = signal.timestamp ?? new Date().toISOString();

  if (signal.kind === "deploy_outcome") {
    const summary = signal.deployed
      ? `Deploy published${signal.commitHash ? ` (${signal.commitHash.slice(0, 7)})` : ""}`
      : `Deploy signal held: ${signal.skippedReason ?? "not published"}`;
    const assessment = assessSignificance({
      type: "deployment_signal",
      filePath: null,
      summary,
      deploySignal: true,
      failedBuild: false,
    });

    return {
      id: randomUUID(),
      type: "deployment_signal",
      sector: "relay",
      sectors: signal.deployed ? (["relay", "runtime"] as SectorId[]) : ["relay", "core"],
      severity: assessment.severity,
      confidence: assessment.confidence,
      timestamp: ts,
      source: "archivist:deploy",
      project: "ccc",
      filePath: null,
      summary,
      metadata: {
        semanticMeaning: assessment.semanticMeaning,
        deployed: signal.deployed,
        commitHash: signal.commitHash,
        skippedReason: signal.skippedReason,
        significanceTier: signal.significanceTier,
      },
    };
  }

  const { change, lockfileOnlyHint, failedBuild } = signal;
  const filePath = change.path;
  const opType = inferOperationalEventType(filePath);
  const sector = inferOperationalSector(filePath);
  const sectors = uniqueSectors([sector, change.sector]);
  const summary = `${path.basename(filePath)} — ${opType.replace(/_/g, " ")}`;

  const assessment = assessSignificance({
    type: opType,
    filePath,
    summary,
    lockfileOnlyHint,
    failedBuild,
    runtimeSignal: opType === "runtime_signal",
  });

  const projectName =
    change.projectKey.split(/[/\\]/).filter(Boolean).pop() ?? change.projectKey;

  return {
    id: randomUUID(),
    type: opType,
    sector,
    sectors,
    severity: assessment.severity,
    confidence: assessment.confidence,
    timestamp: ts,
    source: "archivist:watcher",
    project: projectName,
    filePath,
    summary,
    metadata: {
      semanticMeaning: assessment.semanticMeaning,
      classifierSector: change.sector,
      classifierPoints: change.points,
      classifierLabel: change.label,
    },
  };
}

function uniqueSectors(list: SectorId[]): SectorId[] {
  return [...new Set(list)];
}

/** Convenience: map a batch from an ARCHIVIST watch cycle */
export function normalizeClassifiedChanges(
  changes: ClassifiedChange[],
  context?: { lockfileOnly?: boolean; failedBuild?: boolean },
): OperationalEvent[] {
  return changes.map((change) =>
    normalizeOperationalSignal({
      kind: "classified_change",
      change,
      lockfileOnlyHint: context?.lockfileOnly,
      failedBuild: context?.failedBuild,
    }),
  );
}
