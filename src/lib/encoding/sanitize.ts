import { repairMojibake, stripResidualMojibake } from "./mojibake";

const DASH_LIKE = /[\u2010\u2011\u2012\u2013\u2014\u2015\u2212\uFE58\uFE63\uFF0D]/g;
const ARROW_RIGHT = /[\u2192\u21D2\u27A1\u27F6\uFFEB\u27A4]/g;
const ARROW_LEFT = /[\u2190\u21D0\u27F5\uFFED]/g;
const MIDDLE_DOT = /\u00B7/g;
const BULLET = /\u2022/g;

/**
 * Persistence-safe continuity text: repair mojibake, NFC, ASCII punctuation only.
 * — -> -, → -> ->, · -> -, smart quotes -> straight ASCII.
 */
export function sanitizeContinuityText(text: string): string {
  if (!text || typeof text !== "string") return text;

  let out = repairMojibake(text);
  out = stripResidualMojibake(out);

  try {
    out = out.normalize("NFC");
  } catch {
    /* older runtimes */
  }

  out = out
    .replace(DASH_LIKE, "-")
    .replace(ARROW_RIGHT, "->")
    .replace(ARROW_LEFT, "<-")
    .replace(MIDDLE_DOT, "-")
    .replace(BULLET, "*")
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/\u2026/g, "...")
    .replace(/\u00A0/g, " ");

  // Strip any remaining non-ASCII (mojibake tails, stray combining marks)
  out = out.replace(/[^\t\n\r\x20-\x7E]/g, (ch) => {
    const cp = ch.codePointAt(0) ?? 0;
    return cp > 0x7e ? "" : ch;
  });

  return out;
}
