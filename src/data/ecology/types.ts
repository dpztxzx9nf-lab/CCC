import type { SystemStatus } from "@/data/types";

/** Abstract operational function — not a physical location */
export type OperationalDomainId =
  | "core"
  | "archive"
  | "forge"
  | "observatory"
  | "relay"
  | "runtime";

/** Physical megastructure chamber — actual occupancy location */
export type ChamberId =
  | "nexus-prime"
  | "deep-stack"
  | "foundry"
  | "observation-deck"
  | "signal-bridge"
  | "live-grid";

export interface OperationalDomain {
  id: OperationalDomainId;
  name: string;
  description: string;
  status: SystemStatus;
}

export interface PhysicalChamber {
  id: ChamberId;
  /** Facility name (e.g. Foundry) */
  name: string;
  /** Deck / wing label shown in facility chrome */
  codename: string;
  primaryDomain: OperationalDomainId;
  description: string;
  status: SystemStatus;
  /** Operators with home assignment in this chamber */
  operatorIds: string[];
  stationIds: string[];
}

/** Operator ↔ domain ↔ chamber relationships */
export interface OperatorEcology {
  operatorId: string;
  primaryDomain: OperationalDomainId;
  homeChamberId: ChamberId;
}

export interface OperatorPlacement {
  operatorId: string;
  primaryDomain: OperationalDomainId;
  homeChamberId: ChamberId;
  currentChamberId: ChamberId;
  isTransit: boolean;
  transitFromChamberId: ChamberId | null;
}
