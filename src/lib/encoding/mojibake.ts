/** Common UTF-8-as-Latin-1/CP1252 corruption fragments → intended Unicode */
const MOJIBAKE_FRAGMENTS: ReadonlyArray<[string, string]> = [
  ["â€”", "\u2014"],
  ["â€“", "\u2013"],
  ["â€˜", "\u2018"],
  ["â€™", "\u2019"],
  ["â€œ", "\u201C"],
  ["â€\u009D", "\u201D"],
  ["â€\x9D", "\u201D"],
  ["â€¢", "\u2022"],
  ["â†’", "\u2192"],
  ["â†\u0090", "\u2190"],
  ["â†\x90", "\u2190"],
  ["Â·", "\u00B7"],
  ["Â©", "\u00A9"],
  ["Â®", "\u00AE"],
  ["Ã—", "\u00D7"],
  ["Ã©", "\u00E9"],
  ["Ã¨", "\u00E8"],
  ["Ã¼", "\u00FC"],
  ["Ã¶", "\u00F6"],
  ["Ã¤", "\u00E4"],
];

const MOJIBAKE_HINT = /[\u00C2\u00E2\u00C3][\u0080-\u00BF]|â€|â†|Â./;

/**
 * Recover text when UTF-8 bytes were interpreted as Latin-1 (common on Windows).
 */
export function tryFixLatin1Utf8Misread(text: string): string {
  if (!MOJIBAKE_HINT.test(text)) return text;
  try {
    const fixed = Buffer.from(text, "latin1").toString("utf8");
    if (fixed.includes("\uFFFD")) return text;
    return fixed;
  } catch {
    return text;
  }
}

export function replaceMojibakeFragments(text: string): string {
  let out = text;
  for (const [bad, good] of MOJIBAKE_FRAGMENTS) {
    if (out.includes(bad)) out = out.split(bad).join(good);
  }
  return out;
}

export function repairMojibake(text: string): string {
  let out = tryFixLatin1Utf8Misread(text);
  out = replaceMojibakeFragments(out);
  if (MOJIBAKE_HINT.test(out)) {
    out = replaceMojibakeFragments(tryFixLatin1Utf8Misread(out));
  }
  return out;
}

/** Residual corruption fragments → ASCII (after latin1 repair) */
const MOJIBAKE_ASCII_FRAGMENTS: ReadonlyArray<[string, string]> = [
  ["â€”", "-"],
  ["â€“", "-"],
  ["â€˜", "'"],
  ["â€™", "'"],
  ["â€œ", '"'],
  ["â€\u009D", '"'],
  ["â€\x9D", '"'],
  ["â€¢", "*"],
  ["â†’", "->"],
  ["â†\u0090", "<-"],
  ["â†\x90", "<-"],
  ["Â·", "-"],
  ["Â ", " "],
];

export function stripResidualMojibake(text: string): string {
  let out = text;
  for (const [bad, good] of MOJIBAKE_ASCII_FRAGMENTS) {
    if (out.includes(bad)) out = out.split(bad).join(good);
  }
  return out;
}
