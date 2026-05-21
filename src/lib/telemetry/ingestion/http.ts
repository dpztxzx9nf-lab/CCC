const DEFAULT_TIMEOUT_MS = 8_000;

export interface SafeFetchResult {
  ok: boolean;
  status: number;
  body: string;
  error?: string;
}

/** Server-side fetch with timeout; never throws. */
export async function safeFetch(
  url: string,
  init?: RequestInit & { timeoutMs?: number },
): Promise<SafeFetchResult> {
  const timeoutMs = init?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
    });
    const body = await res.text();
    return { ok: res.ok, status: res.status, body };
  } catch (err) {
    const message = err instanceof Error ? err.message : "fetch failed";
    return { ok: false, status: 0, body: "", error: message };
  } finally {
    clearTimeout(timer);
  }
}

export function parseJsonBody(body: string): unknown | null {
  const trimmed = body.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return null;
  }
}
