import type { LocalProjectSummary } from "@/lib/localData/types";
import type { ClassifiedSignal } from "../classification";

export function classifyDocumentation(
  summary: LocalProjectSummary,
  projectId: string,
): ClassifiedSignal[] {
  const signals: ClassifiedSignal[] = [];

  if (summary.readmeRecentlyModified) {
    signals.push({
      id: `${projectId}-doc-readme-recent`,
      kind: "documentation",
      label: "README changed",
      value: "Documentation activity (7d)",
      weight: 12,
      projectId,
    });
  } else if (summary.hasReadme) {
    signals.push({
      id: `${projectId}-doc-readme`,
      kind: "documentation",
      label: "README present",
      value: "Documentation baseline",
      weight: 4,
      projectId,
    });
  }

  return signals;
}
