import { sanitizeContinuityText } from "./sanitize";

/** PM2 / Windows terminal-safe log lines */
export function formatContinuityLogLine(text: string): string {
  return sanitizeContinuityText(text);
}
