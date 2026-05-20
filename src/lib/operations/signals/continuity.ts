import type { LocalProjectSummary } from "@/lib/localData/types";
import type { ClassifiedSignal } from "../classification";

export function classifyContinuity(
  summary: LocalProjectSummary,
  projectId: string,
): ClassifiedSignal[] {
  const signals: ClassifiedSignal[] = [];

  if (summary.recentMarkdownEdits >= 5) {
    signals.push({
      id: `${projectId}-cont-md-heavy`,
      kind: "continuity",
      label: "Many markdown edits",
      value: `${summary.recentMarkdownEdits} notes updated (7d)`,
      weight: 18,
      projectId,
    });
  } else if (summary.recentMarkdownEdits > 0) {
    signals.push({
      id: `${projectId}-cont-md`,
      kind: "continuity",
      label: "Markdown activity",
      value: `${summary.recentMarkdownEdits} note updates (7d)`,
      weight: 10,
      projectId,
    });
  } else if (summary.markdownCount >= 20) {
    signals.push({
      id: `${projectId}-cont-md-vol`,
      kind: "archive",
      label: "Markdown corpus",
      value: `${summary.markdownCount} notes indexed`,
      weight: 8,
      projectId,
    });
  }

  if (summary.hasGitRepo) {
    signals.push({
      id: `${projectId}-cont-git`,
      kind: "continuity",
      label: "Git repository",
      value: "Version-controlled continuity",
      weight: 9,
      projectId,
    });
  }

  return signals;
}
