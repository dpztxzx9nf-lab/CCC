import path from "path";
import {
  ARCHIVIST_LOCKFILES,
  ARCHIVIST_MEANINGFUL_LOG_PATTERNS,
} from "@/lib/localData/archivist-config";
import {
  type SemanticMeaning,
  classifySemanticMeaning,
} from "./classifySemanticMeaning";
import type { OperationalEventType } from "./events";
import type { OperationalEventSeverity } from "./events";

/** Output of significance + semantic pass for normalization */
export interface SignificanceAssessment {
  severity: OperationalEventSeverity;
  confidence: number;
  semanticMeaning: SemanticMeaning;
}

const GENERATED_DIR_HINTS = /\.next|\/dist\/|\/build\/|\/out\/|\/coverage\//i;

const ARCH_DOC_RE =
  /(architecture|ontology|continuity|foundation|adr\/|decision|mega-?structure)/i;

const README_ONLY = /^readme\.md$/i;

function isProbablyCosmeticMarkdown(filePath: string): boolean {
  const base = path.basename(filePath);
  if (README_ONLY.test(base)) return true;
  if (/contributing|changelog|license/i.test(base)) return true;
  return false;
}

function isLockfilePath(filePath: string): boolean {
  return ARCHIVIST_LOCKFILES.has(path.basename(filePath));
}

function isGeneratedAdjacent(filePath: string): boolean {
  return GENERATED_DIR_HINTS.test(filePath);
}

function keywordBoostForHighMeaning(filePath: string, summary: string): number {
  let n = 0;
  const blob = `${filePath}\n${summary}`;
  if (ARCH_DOC_RE.test(blob)) n += 3;
  return n;
}

/** Map raw signal shape + path heuristics to severity / confidence / semantic label */
export function assessSignificance(input: {
  type: OperationalEventType;
  filePath: string | null;
  summary: string;
  lockfileOnlyHint?: boolean;
  failedBuild?: boolean;
  deploySignal?: boolean;
  runtimeSignal?: boolean;
}): SignificanceAssessment {
  const fp = input.filePath ?? "";
  const base = fp ? path.basename(fp) : "";
  const semanticFromPath = classifySemanticMeaning(fp, input.summary);

  if (input.failedBuild) {
    return {
      severity: "high",
      confidence: 0.92,
      semanticMeaning: "runtime_instability",
    };
  }

  if (input.deploySignal) {
    return {
      severity: "high",
      confidence: 0.85,
      semanticMeaning: "deployment_progress",
    };
  }

  if (input.runtimeSignal || /ecosystem\.config|pm2|dockerfile|vercel\.json/i.test(fp)) {
    return {
      severity: input.type === "runtime_signal" ? "high" : "medium",
      confidence: 0.78,
      semanticMeaning: "runtime_instability",
    };
  }

  if (input.lockfileOnlyHint || (fp && isLockfilePath(fp))) {
    return {
      severity: "low",
      confidence: 0.55,
      semanticMeaning: "operational_noise",
    };
  }

  if (fp && isGeneratedAdjacent(fp)) {
    return {
      severity: "low",
      confidence: 0.45,
      semanticMeaning: "operational_noise",
    };
  }

  let severity: OperationalEventSeverity = "medium";
  let confidence = 0.62;

  switch (input.type) {
    case "build_failure":
      severity = "high";
      confidence = 0.9;
      break;
    case "deployment_signal":
      severity = "high";
      confidence = 0.82;
      break;
    case "build_success":
    case "build_started":
      severity = "medium";
      confidence = 0.68;
      break;
    case "markdown_changed":
      if (isProbablyCosmeticMarkdown(fp)) {
        severity = "low";
        confidence = 0.5;
      } else if (ARCH_DOC_RE.test(fp) || ARCH_DOC_RE.test(input.summary)) {
        severity = "high";
        confidence = 0.8;
      } else {
        severity = "medium";
        confidence = 0.62;
      }
      break;
    case "package_detected":
      severity = "medium";
      confidence = base === "package.json" ? 0.74 : 0.6;
      break;
    case "code_changed":
      severity = "medium";
      confidence = 0.65;
      break;
    case "continuity_update":
    case "semantic_milestone":
      severity = input.type === "semantic_milestone" ? "high" : "medium";
      confidence = 0.72;
      break;
    case "file_changed":
    default:
      severity = "low";
      confidence = 0.52;
  }

  const kw = keywordBoostForHighMeaning(fp, input.summary);
  if (kw >= 3 && severity !== "high") {
    severity = input.type === "markdown_changed" || ARCH_DOC_RE.test(fp) ? "high" : "medium";
    confidence = Math.min(0.95, confidence + 0.12);
  }

  if (
    ARCHIVIST_MEANINGFUL_LOG_PATTERNS.some((re) => re.test(base)) ||
    /error\.log|fail/i.test(fp)
  ) {
    severity = "high";
    confidence = Math.max(confidence, 0.76);
  }

  let semanticMeaning = semanticFromPath;

  if (input.type === "markdown_changed") {
    semanticMeaning =
      ARCH_DOC_RE.test(fp) ? "architecture_refinement" : "documentation_update";
  } else if (input.type === "continuity_update") {
    semanticMeaning = "continuity_consolidation";
  }

  return { severity, confidence, semanticMeaning };
}
