/** Client-safe event list helpers (no Node fs imports). */

export function recentEvents<T extends { occurredAt: string }>(
  events: T[],
  limit = 24,
): T[] {
  return [...events]
    .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))
    .slice(0, limit);
}
