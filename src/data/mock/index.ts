import type { CCCData } from "../types";
import { OPERATIONAL_DOMAINS, PHYSICAL_CHAMBERS } from "@/data/ecology";
import { mockOperators } from "./operators";
import { loadRegistryProjectsForData } from "@/lib/projects/loadRegistryForData";
import { mockStations } from "./stations";
import { mockTelemetry } from "./telemetry";

const chambers = PHYSICAL_CHAMBERS;
const registryProjects = loadRegistryProjectsForData();

export const mockCCCData: CCCData = {
  domains: OPERATIONAL_DOMAINS,
  chambers,
  sectors: chambers,
  operators: mockOperators,
  stations: mockStations,
  projects: registryProjects,
  telemetry: mockTelemetry,
  systemStatus: "nominal",
  demoLabel: "MOCK / DEMO DATA",
};

export async function loadMockData(): Promise<CCCData> {
  return mockCCCData;
}
