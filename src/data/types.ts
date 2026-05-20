/** Data layer types — UI imports these; future JSON/Markdown loaders implement CCCDataSource */

import type {
  ChamberId,
  OperationalDomain,
  OperationalDomainId,
  PhysicalChamber,
} from "@/data/ecology";

/** @deprecated Use OperationalDomainId — domains are abstract, not physical */
export type SectorId = OperationalDomainId;

export type { ChamberId, OperationalDomainId, OperationalDomain, PhysicalChamber };

/** @deprecated Use PhysicalChamber */
export type Sector = PhysicalChamber;

export type SystemStatus = "nominal" | "elevated" | "degraded" | "offline";

export interface Station {
  id: string;
  name: string;
  /** Chamber where this station is installed */
  chamberId: ChamberId;
  /** Primary operational domain for the station's function */
  domainId: OperationalDomainId;
  /** @deprecated use domainId */
  sectorId: OperationalDomainId;
  description: string;
}

export interface Operator {
  id: string;
  callsign: string;
  designation: string;
  role: string;
  currentActivity: string;
  /** Primary operational domain (abstract responsibility) */
  primaryDomain: OperationalDomainId;
  /** Home chamber in the megastructure */
  homeChamberId: ChamberId;
  /** @deprecated use primaryDomain */
  sectorId: OperationalDomainId;
  status: SystemStatus;
  dossier: OperatorDossier;
}

export interface OperatorDossier {
  summary: string;
  objectives: string[];
  linkedProjectIds: string[];
  lastSync: string;
}

export interface Project {
  id: string;
  name: string;
  tagline: string;
  status: string;
  /** Operational domains this project touches */
  domainIds: OperationalDomainId[];
  /** @deprecated use domainIds */
  sectorIds: OperationalDomainId[];
  description: string;
  highlights: string[];
  ecosystem?: ProjectEcosystem;
}

export interface ProjectEcosystem {
  platform: string;
  version?: string;
  url?: string;
  modes: string[];
  tagline: string;
  metrics: { label: string; value: string }[];
}

export interface TelemetryMetric {
  id: string;
  label: string;
  value: string;
  hint?: string;
}

export interface CCCData {
  domains: OperationalDomain[];
  chambers: PhysicalChamber[];
  /** @deprecated use chambers */
  sectors: PhysicalChamber[];
  operators: Operator[];
  stations: Station[];
  projects: Project[];
  telemetry: TelemetryMetric[];
  systemStatus: SystemStatus;
  demoLabel: string;
}

export interface CCCDataSource {
  load(): Promise<CCCData>;
}
