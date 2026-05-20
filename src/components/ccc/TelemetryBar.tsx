"use client";

import { useCCC } from "@/context/CCCContext";
import { StatusBadge } from "./StatusBadge";

export function TelemetryBar() {
  const { data, loading, error } = useCCC();

  if (error) {
    return (
      <header className="border-b border-ccc-danger/40 bg-ccc-danger/10 px-3 py-3 md:px-4">
        <p className="text-sm font-medium text-ccc-danger">Data load error</p>
        <p className="mt-1 text-sm text-ccc-muted">{error}</p>
      </header>
    );
  }

  if (loading) {
    return (
      <header className="border-b border-ccc-border/50 bg-ccc-surface/80 px-3 py-3 md:px-4">
        <p className="text-sm text-ccc-muted">Refreshing telemetry…</p>
      </header>
    );
  }

  return (
    <header className="relative z-10 border-b border-ccc-border/40 bg-ccc-surface/90 backdrop-blur-md">
      <div className="flex flex-col gap-2 px-3 py-2 md:px-4 md:py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold tracking-widest text-ccc-accent">
              CCC
            </span>
            <span className="hidden text-sm text-ccc-muted sm:inline">
              Continuity Command Center
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-ccc-warn/90">{data.demoLabel}</span>
            <StatusBadge status={data.systemStatus} />
          </div>
        </div>
        <div className="ccc-telemetry-strip ccc-scroll flex gap-4 overflow-x-auto pb-0.5 md:flex-wrap md:overflow-visible">
          {data.telemetry.map((m) => (
            <div key={m.id} className="ccc-telemetry-item shrink-0">
              <span className="ccc-telemetry-label">{m.label}</span>
              <span className="ccc-telemetry-value">
                {m.value}
                {m.hint && <span className="ccc-telemetry-hint"> ({m.hint})</span>}
              </span>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}
