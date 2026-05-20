import type { CCCData } from "../types";
import { mockOperators } from "./operators";
import { mockProjects } from "./projects";
import { mockSectors } from "./sectors";
import { mockStations } from "./stations";
import { mockTelemetry } from "./telemetry";

export const mockCCCData: CCCData = {
  sectors: mockSectors,
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
