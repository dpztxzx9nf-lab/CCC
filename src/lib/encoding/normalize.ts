import { repairMojibake } from "./mojibake";
import { sanitizeContinuityText } from "./sanitize";

export interface NormalizeContinuityTextOptions {
  /** When false, repair mojibake + NFC only (no ASCII folding) */
  asciiSafe?: boolean;
}

const DASH_LIKE = /[\u2010\u2011\u2012\u2013\u2014\u2015\u2212\uFE58\uFE63\uFF0D]/g;
const ARROW_RIGHT = /[\u2192\u21D2\u27A1\u27F6\uFFEB]/g;
const ARROW_LEFT = /[\u2190\u21D0\u27F5\uFFED]/g;

/**
 * Optional Unicode-canonical form (non-persistence). Persistence uses sanitizeContinuityText.
 */
export function normalizeContinuityText(
  text: string,
  options: NormalizeContinuityTextOptions = { asciiSafe: true },
): string {
  if (!text || typeof text !== "string") return text;
  if (options.asciiSafe !== false) return sanitizeContinuityText(text);

  let out = repairMojibake(text);
  try {
    out = out.normalize("NFC");
  } catch {
    /* older runtimes */
  }
  out = out.replace(DASH_LIKE, "\u2014");
  out = out.replace(ARROW_RIGHT, "\u2192");
  out = out.replace(ARROW_LEFT, "\u2190");
  return out;
}

/**
 * Deep-normalize continuity JSON payloads before persistence or projection merge.
 */
export function sanitizeContinuityPayload<T>(value: T): T {
  if (value === null || value === undefined) return value;

  if (typeof value === "string") {
    return sanitizeContinuityText(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeContinuityPayload(item)) as T;
  }

  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = sanitizeContinuityPayload(v);
    }
    return out as T;
  }

  return value;
}
