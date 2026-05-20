import type { LocalProjectSummary } from "@/lib/localData/types";
import type { ClassifiedSignal } from "../classification";

export function classifyRuntime(
  summary: LocalProjectSummary,
  projectId: string,
  deploymentCapable: boolean,
): ClassifiedSignal[] {
  const signals: ClassifiedSignal[] = [];

  if (summary.hasPackageJson) {
    signals.push({
      id: `${projectId}-runtime-pkg`,
      kind: "runtime",
      label: "package.json detected",
      value: summary.packageName ?? "Runtime-capable project",
      weight: 11,
      projectId,
    });
  }

  if (deploymentCapable && summary.hasPackageJson && summary.recentCodeEdits > 0) {
    signals.push({
      id: `${projectId}-deploy-activity`,
      kind: "deployment",
      label: "Deployment activity",
      value: "Build + package manifest active",
      weight: 15,
      projectId,
    });
  }

  return signals;
}
