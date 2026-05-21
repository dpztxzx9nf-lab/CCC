import {
  RECENT_MAX_AGE_MS,
  RECENT_MAX_ENTRIES,
  USAGE_ENTRIES_MAX,
  type TelemetryRecentEntry,
} from "./schema";

export function trimUsageEntries<T extends { at: string }>(
  entries: T[],
  nowMs = Date.now(),
): T[] {
  const cutoff = nowMs - RECENT_MAX_AGE_MS;
  const withinWindow = entries.filter((entry) => {
    const t = Date.parse(entry.at);
    return Number.isFinite(t) && t >= cutoff;
  });
  if (withinWindow.length <= USAGE_ENTRIES_MAX) return withinWindow;
  return withinWindow.slice(-USAGE_ENTRIES_MAX);
}

export function trimRecentActivity(
  recent: TelemetryRecentEntry[],
  nowMs = Date.now(),
): TelemetryRecentEntry[] {
  const cutoff = nowMs - RECENT_MAX_AGE_MS;
  const withinWindow = recent.filter((entry) => {
    const t = Date.parse(entry.at);
    return Number.isFinite(t) && t >= cutoff;
  });
  if (withinWindow.length <= RECENT_MAX_ENTRIES) return withinWindow;
  return withinWindow.slice(-RECENT_MAX_ENTRIES);
}

export function trimRuntimeRecent<T extends { at: string }>(
  recent: T[],
  nowMs = Date.now(),
): T[] {
  const cutoff = nowMs - RECENT_MAX_AGE_MS;
  const withinWindow = recent.filter((entry) => {
    const t = Date.parse(entry.at);
    return Number.isFinite(t) && t >= cutoff;
  });
  if (withinWindow.length <= RECENT_MAX_ENTRIES) return withinWindow;
  return withinWindow.slice(-RECENT_MAX_ENTRIES);
}
