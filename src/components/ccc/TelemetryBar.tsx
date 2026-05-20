"use client";

import { useMemo } from "react";
import { useCCC } from "@/context/CCCContext";
import { buildSubstrateLedgerSlots } from "@/lib/substrate/substrateLedger";
import {
  HUMAN_ORIENTATIONS,
  type HumanOrientationId,
} from "@/lib/human-orientation";

export function TelemetryBar() {
  const {
    data,
    operational,
    snapshotMeta,
    continuityEvents,
    loading,
    operationalLoading,
    error,
    humanOrientation,
    setHumanOrientation,
  } = useCCC();

  const ledgerSlots = useMemo(
    () =>
      buildSubstrateLedgerSlots(
        operational,
        snapshotMeta,
        continuityEvents.length,
      ),
    [operational, snapshotMeta, continuityEvents.length],
  );

  const busy = operationalLoading || loading;

  if (error) {
    return (
      <header className="border-b border-ccc-danger/40 bg-ccc-danger/10 px-3 py-3 md:px-4">
        <p className="text-sm font-medium text-ccc-danger">Data load error</p>
        <p className="mt-1 text-sm text-ccc-muted">{error}</p>
      </header>
    );
  }

  if (busy && !operational) {
    return (
      <header className="border-b border-ccc-border/50 bg-ccc-surface/80 px-3 py-3 md:px-4">
        <p className="text-sm text-ccc-muted">Refreshing substrate instrumentation…</p>
      </header>
    );
  }

  const statusTone =
    data.systemStatus === "nominal"
      ? "ccc-telemetry-status--nominal"
      : data.systemStatus === "elevated"
        ? "ccc-telemetry-status--elevated"
        : "ccc-telemetry-status--critical";

  return (
    <header className="relative z-10 border-b border-ccc-border/40 bg-ccc-surface/90 backdrop-blur-md">
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2 px-3 py-2 md:px-4 md:py-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-3">
          <span className="font-mono text-xs font-semibold tracking-widest text-ccc-accent">
            CCC
          </span>
          <span
            className={`ccc-telemetry-status ${statusTone}`}
            aria-label={`System ${data.systemStatus}`}
            title={data.systemStatus}
          />
          <div
            className="ccc-substrate-ledger ccc-telemetry-strip ccc-scroll flex min-w-0 flex-1 gap-x-4 gap-y-1 overflow-x-auto"
            aria-label="Substrate instrumentation ledger"
          >
            {ledgerSlots.map((slot) => (
              <div
                key={slot.id}
                className={`ccc-substrate-slot ccc-telemetry-item shrink-0`}
                title={slot.hint ? `${slot.label} · ${slot.hint}` : slot.label}
              >
                <span className="ccc-telemetry-label">{slot.label}</span>
                <span
                  className={`ccc-substrate-slot__value ccc-telemetry-value${slot.resolved ? "" : " ccc-substrate-slot__value--pending"}`}
                >
                  {slot.value}
                </span>
                {slot.hint != null ? (
                  <span className="sr-only">{slot.hint}</span>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 border-t border-ccc-border/30 pt-2 md:border-t-0 md:pt-0 md:pl-2 md:border-l md:border-ccc-border/30">
          <label className="sr-only" htmlFor="ccc-human-orientation">
            Intentional operational orientation
          </label>
          <select
            id="ccc-human-orientation"
            className="ccc-human-orient"
            value={humanOrientation}
            onChange={(e) =>
              setHumanOrientation(e.target.value as HumanOrientationId)
            }
            title="Intentional facility orientation — light bias toward domains, not a role"
          >
            {HUMAN_ORIENTATIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
}
