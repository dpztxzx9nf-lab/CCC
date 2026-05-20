/** Data layer types — UI imports these; future JSON/Markdown loaders implement CCCDataSource */

export type SectorId =
  | "core"
  | "archive"
  | "forge"
  | "observatory"
  | "relay"
  | "runtime";

export type SystemStatus = "nominal" | "elevated" | "degraded" | "offline";

export interface Sector {
  id: SectorId;
  name: string;
  codename: string;
  description: string;
  status: SystemStatus;
  operatorIds: string[];
  stationIds: string[];
}

export interface Station {
  id: string;
  name: string;
  sectorId: SectorId;
  description: string;
}

export interface Operator {
  id: string;
  callsign: string;
  designation: string;
  role: string;
  currentActivity: string;
  sectorId: SectorId;
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
  sectorIds: SectorId[];
  description: string;
  highlights: string[];
  /** Optional ecosystem block (e.g. NLO live server) */
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
  sectors: Sector[];
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
