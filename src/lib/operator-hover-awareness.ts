import type { InhabitantBehavior } from "@/data/inhabitant-types";
import type { OperationalSnapshot } from "@/data/operational-types";
import type { Operator } from "@/data/types";
import type { OperatorPlacement } from "@/data/ecology";
import { CHAMBER_BY_ID } from "@/data/ecology";
import type { OperatorHoverAwareness } from "@/lib/operator-interaction";
import {
  chamberToSectorTone,
  formatOperatorHoverMetrics,
  formatOperatorHoverState,
  operatorHoverHasLiveSignal,
} from "@/lib/operator-hover-language";
import {
  classifySubstrateSignal,
  interpretHoverAwareness,
} from "@/lib/operator-interpretation";

export function buildOperatorHoverAwareness(
  operator: Operator,
  behavior: InhabitantBehavior,
  placement: OperatorPlacement,
  operational: OperationalSnapshot | null,
  facilityNow: number,
): OperatorHoverAwareness {
  const derived = operational?.operators.find((o) => o.operatorId === operator.id);
  const chamber = CHAMBER_BY_ID[placement.currentChamberId];
  const chamberLabel = chamber?.codename ?? placement.currentChamberId;
  const sectorTone = chamberToSectorTone(placement.currentChamberId);

  const rawTask = derived?.currentActivity ?? behavior.stateLabel;
  const classified = classifySubstrateSignal(
    derived?.lastSignal ?? null,
    rawTask,
    derived?.activeProjectName ?? null,
  );
  const interpreted = interpretHoverAwareness(
    operator.id,
    placement.primaryDomain,
    classified,
    chamberLabel,
  );
  const activity = interpreted.activity;
  const cause = interpreted.cause;
  const metrics = formatOperatorHoverMetrics({
    facilityNow,
    scannedAt: operational?.scannedAt ?? null,
    lastSync: operator.dossier.lastSync,
    workload: derived?.workload ?? 0,
    operationalEnabled: operational?.enabled ?? false,
    hasSnapshot: Boolean(operational?.snapshotMeta),
  });

  return {
    stateLabel: formatOperatorHoverState(behavior.posture),
    activity,
    cause,
    metrics,
    sectorTone,
    hasLiveSignal: operatorHoverHasLiveSignal(activity),
  };
}
