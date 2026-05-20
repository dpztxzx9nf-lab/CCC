import type { CCCData } from "../types";
import { OPERATIONAL_DOMAINS, PHYSICAL_CHAMBERS } from "@/data/ecology";
import { mockOperators } from "./operators";
import { mockProjects } from "./projects";
import { mockStations } from "./stations";
import { mockTelemetry } from "./telemetry";

const chambers = PHYSICAL_CHAMBERS;

export const mockCCCData: CCCData = {
  domains: OPERATIONAL_DOMAINS,
  chambers,
  sectors: chambers,
  operators: mockOperators,
  stations: mockStations,
  projects: mockProjects,
  telemetry: mockTelemetry,
  systemStatus: "nominal",
  demoLabel: "MOCK / DEMO DATA",
};

export async function loadMockData(): Promise<CCCData> {
  return mockCCCData;
}
