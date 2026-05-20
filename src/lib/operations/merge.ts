import type { OperationalSnapshot } from "@/data/operational-types";
import type {
  CCCData,
  Operator,
  Sector,
  SystemStatus,
  TelemetryMetric,
} from "@/data/types";
import { PROJECT_PROFILES } from "./projectProfiles";

/** Client-safe merge — no filesystem imports */
export function mergeOperationalIntoCCCData(
  base: CCCData,
  snapshot: OperationalSnapshot,
): CCCData {
  if (!snapshot.enabled) {
    return { ...base, demoLabel: snapshot.label };
  }

  const heatBySector = new Map(snapshot.sectorHeat.map((h) => [h.sectorId, h]));
  const opById = new Map(snapshot.operators.map((o) => [o.operatorId, o]));
  const projectById = new Map(snapshot.projects.map((p) => [p.projectId, p]));

  const sectors: Sector[] = base.sectors.map((sector) => {
    const heat = heatBySector.get(sector.id);
    if (!heat) return sector;
    const activeOps = snapshot.operators
      .filter((o) => o.workload > 0)
      .map((o) => o.operatorId);
    return {
      ...sector,
      status: heat.status,
      operatorIds: [
        ...new Set([
          ...sector.operatorIds,
          ...activeOps.filter((id) => {
            const op = opById.get(id);
            return op?.activeProjectId
              ? PROJECT_PROFILES.find((p) => p.id === op.activeProjectId)?.sectors.includes(
                  sector.id,
                )
              : false;
          }),
        ]),
      ],
    };
  });

  const operators: Operator[] = base.operators.map((op) => {
    const derived = opById.get(op.id);
    if (!derived) return op;
    const activeProfile = derived.activeProjectId
      ? PROJECT_PROFILES.find((p) => p.id === derived.activeProjectId)
      : undefined;
    return {
      ...op,
      currentActivity: derived.currentActivity,
      status: derived.status as SystemStatus,
      sectorId: activeProfile?.sectors[0] ?? op.sectorId,
      dossier: {
        ...op.dossier,
        lastSync: snapshot.scannedAt,
      },
    };
  });

  const projects = base.projects.map((project) => {
    const derived = projectById.get(project.id);
    if (!derived) return project;
    const highlights = [
      derived.topSignal,
      `Activity: ${derived.activityLevel} (${derived.activityScore})`,
      derived.detected ? "Local source detected" : "Profile only",
    ].filter(Boolean) as string[];

    return {
      ...project,
      status: derived.activityLevel === "idle" ? project.status : "active",
      highlights: derived.detected ? highlights : project.highlights,
    };
  });

  const telemetry: TelemetryMetric[] = snapshot.telemetry.map((t) => ({
    id: t.id,
    label: t.label,
    value: t.value,
    hint: t.hint,
  }));

  return {
    ...base,
    sectors,
    operators,
    projects,
    telemetry,
    systemStatus: snapshot.systemStatus,
    demoLabel: snapshot.label,
  };
}
