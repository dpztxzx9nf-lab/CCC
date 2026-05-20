import { mockCCCData } from "@/data/mock";
import type { CCCData, CCCDataSource } from "@/data/types";

/** Default source — swap for JSON/Markdown loaders later without touching UI */
export const defaultDataSource: CCCDataSource = {
  load: async () => mockCCCData,
};

let cached: CCCData | null = null;

/** Synchronous mock data — always available for initial render and fallback */
export function getCCCDataSync(): CCCData {
  return mockCCCData;
}

export async function fetchCCCData(
  source: CCCDataSource = defaultDataSource,
): Promise<CCCData> {
  if (cached) return cached;
  try {
    const loaded = await source.load();
    if (!loaded?.sectors?.length) {
      throw new Error("Data source returned empty sector list");
    }
    cached = loaded;
    return cached;
  } catch (err) {
    console.error("[CCC] fetchCCCData failed, using mock fallback:", err);
    cached = getCCCDataSync();
    return cached;
  }
}

export function clearDataCache(): void {
  cached = null;
}
