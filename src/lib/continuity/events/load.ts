import type { ContinuityEvent, ContinuityEventLog } from "./types";
import { CONTINUITY_EVENTS_VERSION } from "./types";

const EVENTS_URL = "/continuity-events.json";

function isContinuityEventLog(data: unknown): data is ContinuityEventLog {
  if (!data || typeof data !== "object") return false;
  const o = data as Record<string, unknown>;
  return (
    o.version === CONTINUITY_EVENTS_VERSION &&
    o.agent === "ARCHIVIST-0" &&
    typeof o.updatedAt === "string" &&
    Array.isArray(o.events)
  );
}

export async function loadContinuityEvents(
  baseUrl = "",
): Promise<ContinuityEvent[]> {
  try {
    const path = baseUrl
      ? `${baseUrl.replace(/\/$/, "")}${EVENTS_URL}`
      : EVENTS_URL;
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) return [];
    const data: unknown = await res.json();
    if (isContinuityEventLog(data)) return data.events;
  } catch {
    /* unavailable */
  }
  return [];
}
