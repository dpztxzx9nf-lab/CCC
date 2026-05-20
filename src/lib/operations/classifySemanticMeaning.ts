import path from "path";

/** Lightweight semantic buckets for projection + milestones — heuristic only */
export type SemanticMeaning =
  | "architecture_refinement"
  | "ontology_change"
  | "runtime_instability"
  | "deployment_progress"
  | "continuity_consolidation"
  | "documentation_update"
  | "project_emergence"
  | "operational_noise";

/** Keyword / path/extension heuristics */
export function classifySemanticMeaning(filePath: string, summary: string): SemanticMeaning {
  const blob = `${filePath}\n${summary}`.toLowerCase().replace(/\//g, "\\");
  const base = path.basename(filePath).toLowerCase();

  if (/ontology|taxonomy|schema\.|prisma\.|migrate/i.test(blob)) {
    return "ontology_change";
  }
  if (/(architecture|adr[\\/]|foundation|continuity-|mega.?structure)/i.test(blob)) {
    return "architecture_refinement";
  }
  if (
    /\.(tsx?|jsx?|mjs|cjs)$/.test(base) ||
    /(package\.json|tsconfig|vite\.config)/i.test(base)
  ) {
    if (/test|spec|\.stories\./i.test(base)) return "operational_noise";
    return "project_emergence";
  }
  if (/\.mdx?$/.test(base) || /journal|readme|notes/i.test(blob)) {
    return "documentation_update";
  }
  if (/vercel\.json|pm2|ecosystem|dockerfile|\.env/i.test(blob)) {
    return "runtime_instability";
  }
  if (
    /deploy|publish|discord|slack|social|marketing|(^|[\\/])public[\\/]/i.test(blob)
  ) {
    return "deployment_progress";
  }
  if (/continuity-snapshot|continuity-events|archivist/i.test(blob)) {
    return "continuity_consolidation";
  }
  if (/scan|import|index|metrics|analytics|telemetry/i.test(blob)) {
    return operationalNoiseOrObservatory(blob);
  }
  return "operational_noise";
}

function operationalNoiseOrObservatory(blob: string): SemanticMeaning {
  if (/lockfile|node_modules/i.test(blob)) return "operational_noise";
  return "project_emergence";
}
