import type { LocalProjectSummary } from "@/lib/localData/types";
import type { ProjectProfile } from "./projectProfiles";
import {
  classifyContinuity,
  classifyDocumentation,
  classifyForge,
  classifyRuntime,
} from "./signals";
import type { ActivityKind } from "./taxonomy";

export interface ClassifiedSignal {
  id: string;
  kind: ActivityKind;
  label: string;
  value: string;
  weight: number;
  projectId: string;
}

export function classifyProjectActivity(
  profile: ProjectProfile,
  summary: LocalProjectSummary | null,
): ClassifiedSignal[] {
  if (!summary || !summary.detected) {
    return [
      {
        id: `${profile.id}-offline`,
        kind: "architecture",
        label: "Profile only",
        value: "No local source detected — topology from seed profile",
        weight: 2,
        projectId: profile.id,
      },
    ];
  }

  return [
    ...classifyDocumentation(summary, profile.id),
    ...classifyContinuity(summary, profile.id),
    ...classifyForge(summary, profile.id),
    ...classifyRuntime(summary, profile.id, profile.deploymentCapable),
  ];
}

export function projectActivityScore(signals: ClassifiedSignal[]): number {
  if (signals.length === 0) return 0;
  const raw = signals.reduce((sum, s) => sum + s.weight, 0);
  return Math.min(100, Math.round(raw * 1.2));
}
