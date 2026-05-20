/** Client-safe inhabitant behavior — derived from operational topology */

import type { ChamberId, OperationalDomainId } from "@/data/ecology";
import type { OperatorPlacement } from "@/data/ecology";

export type InhabitantPosture =
  | "anchored"
  | "focused"
  | "coordinating"
  | "building"
  | "monitoring"
  | "archiving"
  | "reviewing"
  | "relaying"
  | "scouting";

export type BehaviorIntensity = "calm" | "steady" | "elevated";

export interface InhabitantPosition {
  x: number;
  y: number;
}

export interface InhabitantBehavior {
  operatorId: string;
  posture: InhabitantPosture;
  stateLabel: string;
  purpose: string;
  stationId: string | null;
  stationName: string | null;
  position: InhabitantPosition;
  intensity: BehaviorIntensity;
  /** Home chamber when operator is in transit */
  transitFromChamberId: ChamberId | null;
  /** @deprecated use transitFromChamberId */
  transitFrom: OperationalDomainId | null;
}

export type { OperatorPlacement, ChamberId, OperationalDomainId };
