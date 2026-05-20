import type { LocalProjectSummary } from "@/lib/localData/types";
import type { ClassifiedSignal } from "../classification";

export function classifyForge(
  summary: LocalProjectSummary,
  projectId: string,
): ClassifiedSignal[] {
  const signals: ClassifiedSignal[] = [];

  if (summary.recentCodeEdits >= 10) {
    signals.push({
      id: `${projectId}-forge-code-heavy`,
      kind: "forge",
      label: "Heavy code activity",
      value: `${summary.recentCodeEdits} TS/JS edits (7d)`,
      weight: 20,
      projectId,
    });
  } else if (summary.recentCodeEdits > 0) {
    signals.push({
      id: `${projectId}-forge-code`,
      kind: "forge",
      label: "Recent TS/JS edits",
      value: `${summary.recentCodeEdits} code files (7d)`,
      weight: 14,
      projectId,
    });
  }

  return signals;
}
