import type { OperationalSnapshot } from "@/data/operational-types";
import type { ActivityKind } from "@/lib/operations/taxonomy";
import { getProjectProfiles } from "@/lib/operations/projectProfiles";
import type { Operator } from "@/data/types";
import type { ChamberId, OperationalDomainId, OperatorPlacement } from "@/data/ecology";
import {
  CHAMBER_TO_DOMAIN,
  DOMAIN_TO_HOME_CHAMBER,
  ECOLOGY_BY_OPERATOR,
} from "@/data/ecology";

function ownedProjectIds(operatorId: string): string[] {
  return getProjectProfiles()
    .filter((p) => p.operatorIds.includes(operatorId as never))
    .map((p) => p.id);
}

function topActivityKind(
  operatorId: string,
  operational: OperationalSnapshot | null,
): ActivityKind | null {
  if (!operational?.enabled) return null;
  const projects = ownedProjectIds(operatorId);
  const kindWeight: Partial<Record<ActivityKind, number>> = {};

  for (const sig of operational.signals) {
    if (!projects.includes(sig.projectId)) continue;
    kindWeight[sig.kind] = (kindWeight[sig.kind] ?? 0) + 1;
  }

  const entries = Object.entries(kindWeight);
  if (entries.length === 0) return null;
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0] as ActivityKind;
}

function domainScore(
  operational: OperationalSnapshot | null,
  domainId: OperationalDomainId,
): number {
  return operational?.sectorHeat.find((h) => h.sectorId === domainId)?.activityScore ?? 0;
}

function chamberForDomain(domainId: OperationalDomainId): ChamberId {
  return DOMAIN_TO_HOME_CHAMBER[domainId];
}

/** Resolve where an operator is physically located (may differ from home chamber). */
export function resolveCurrentChamber(
  operator: Operator,
  operational: OperationalSnapshot | null,
): ChamberId {
  const ecology = ECOLOGY_BY_OPERATOR[operator.id];
  const home = ecology?.homeChamberId ?? DOMAIN_TO_HOME_CHAMBER[operator.primaryDomain];
  const workload =
    operational?.operators.find((o) => o.operatorId === operator.id)?.workload ?? 0;
  const top = topActivityKind(operator.id, operational);

  switch (operator.id) {
    case "fab-0": {
      const runtimeScore = domainScore(operational, "runtime");
      const forgeScore = domainScore(operational, "forge");
      if (
        workload >= 38 ||
        top === "deployment" ||
        runtimeScore >= 42 ||
        (runtimeScore > forgeScore + 12 && workload >= 18)
      ) {
        return chamberForDomain("runtime");
      }
      return chamberForDomain("forge");
    }
    case "bcast-1": {
      if (workload >= 28 && domainScore(operational, "core") >= 35) {
        return chamberForDomain("core");
      }
      return chamberForDomain("relay");
    }
    case "scout-6": {
      if (
        workload >= 14 ||
        domainScore(operational, "observatory") >= 30 ||
        top === "observability"
      ) {
        return chamberForDomain("observatory");
      }
      return home;
    }
    case "nexus-7":
      return chamberForDomain("core");
    case "deep-1":
      return chamberForDomain("archive");
    default:
      return home;
  }
}

export function resolveOperatorPlacement(
  operator: Operator,
  operational: OperationalSnapshot | null,
): OperatorPlacement {
  const ecology = ECOLOGY_BY_OPERATOR[operator.id];
  const primaryDomain =
    ecology?.primaryDomain ?? operator.primaryDomain ?? operator.sectorId;
  const homeChamberId =
    ecology?.homeChamberId ??
    operator.homeChamberId ??
    DOMAIN_TO_HOME_CHAMBER[primaryDomain];
  const currentChamberId = resolveCurrentChamber(operator, operational);
  const isTransit = currentChamberId !== homeChamberId;

  return {
    operatorId: operator.id,
    primaryDomain,
    homeChamberId,
    currentChamberId,
    isTransit,
    transitFromChamberId: isTransit ? homeChamberId : null,
  };
}

export function domainForChamber(chamberId: ChamberId): OperationalDomainId {
  return CHAMBER_TO_DOMAIN[chamberId];
}

/** @deprecated Domains were previously called sectors in placement APIs */
export function resolvePhysicalSector(
  operator: Operator,
  operational: OperationalSnapshot | null,
): OperationalDomainId {
  return domainForChamber(resolveCurrentChamber(operator, operational));
}
