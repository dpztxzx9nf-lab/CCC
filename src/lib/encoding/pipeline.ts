import type { ClassifiedChange } from "@/lib/archivist/classify-change";
import type { ContinuityEvent } from "@/lib/continuity/events/types";
import type { OperationalEvent } from "@/lib/operations/events";
import { sanitizeContinuityPayload } from "./normalize";
import { sanitizeContinuityText } from "./sanitize";

/** Before classification / consolidation — normalize watcher-derived labels */
export function sanitizeClassifiedChange(change: ClassifiedChange): ClassifiedChange {
  return {
    ...change,
    label: sanitizeContinuityText(change.label),
  };
}

/** Before continuity rail event persistence */
export function sanitizeContinuityEvent(event: ContinuityEvent): ContinuityEvent {
  return sanitizeContinuityPayload(event);
}

/** Before operational event persistence */
export function sanitizeOperationalEvent(event: OperationalEvent): OperationalEvent {
  const meta = event.metadata ?? {};
  const cleanedMeta: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    cleanedMeta[k] =
      typeof v === "string" ? sanitizeContinuityText(v) : v;
  }

  return {
    ...event,
    project: sanitizeContinuityText(event.project),
    summary: sanitizeContinuityText(event.summary),
    metadata: cleanedMeta as OperationalEvent["metadata"],
  };
}
