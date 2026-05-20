import { sanitizeContinuityPayload } from "./normalize";

/**
 * Parse UTF-8 JSON and normalize continuity string fields (repairs legacy mojibake on read).
 */
export function parseUtf8ContinuityJson<T = unknown>(raw: string): T {
  const data: unknown = JSON.parse(raw);
  return sanitizeContinuityPayload(data) as T;
}
