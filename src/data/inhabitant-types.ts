/** Client-safe inhabitant behavior — derived from operational topology */

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
  /** Percent within sector room (0–100) */
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
  crossSectorHint: string | null;
}
