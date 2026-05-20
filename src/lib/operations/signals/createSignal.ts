import { createHash, randomUUID } from "crypto";
import type {
  OperationalSignal,
  OperationalSignalSeverity,
  OperationalSignalType,
  Sector,
} from "../types";

export interface CreateSignalInput {
  source: string;
  sector: Sector;
  type: OperationalSignalType;
  severity: OperationalSignalSeverity;
  metadata?: Record<string, unknown>;
  /** ISO timestamp; defaults to now */
  timestamp?: string;
  /**
   * Stable key segment for id (e.g. project id).
   * Same source+type+key yields the same id across a scan cycle.
   */
  stableKey?: string;
}

function stableSignalId(
  source: string,
  type: string,
  stableKey: string,
): string {
  const digest = createHash("sha256")
    .update(`${source}\0${type}\0${stableKey}`)
    .digest("hex")
    .slice(0, 16);
  return `sig-${digest}`;
}

/** Build a normalized operational signal with stable-ish id and ISO timestamp */
export function createSignal(input: CreateSignalInput): OperationalSignal {
  const timestamp = input.timestamp ?? new Date().toISOString();
  const stableKey = input.stableKey ?? randomUUID();
  const id = stableSignalId(input.source, input.type, stableKey);

  return {
    id,
    timestamp,
    source: input.source,
    sector: input.sector,
    type: input.type,
    severity: input.severity,
    metadata: { ...input.metadata },
  };
}
