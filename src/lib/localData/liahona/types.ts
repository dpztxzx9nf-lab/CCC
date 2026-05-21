import type { RawScannedProject } from "@/lib/localData/scanners";

export const LIAHONA_ECOSYSTEM_ID = "liahona" as const;

export interface LiahonaObservation {
  runtimeMarkerCount: number;
  sourcesMarkerCount: number;
  memoryMarkerCount: number;
  projectionMarkerCount: number;
  discordMarkerCount: number;
  deployMarkerCount: number;
}
