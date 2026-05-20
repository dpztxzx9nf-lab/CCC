"use client";

import { useCCC } from "@/context/CCCContext";
import { StatusBadge } from "./StatusBadge";

export function TelemetryBar() {
  const { data, loading, error } = useCCC();

  if (error) {
    return (
      <header className="border-b border-ccc-danger/50 bg-ccc-danger/10 px-3 py-3 md:px-4">
        <p className="text-sm font-medium text-ccc-danger">Data load error</p>
        <p className="mt-1 text-sm text-ccc-muted">{error}</p>
        <p className="mt-1 text-xs text-ccc-muted">Showing fallback mock data.</p>
      </header>
    );
  }

  if (loading) {
    return (
      <header className="border-b border-ccc-border bg-ccc-surface/90 px-3 py-3 backdrop-blur-sm md:px-4">
        <p className="text-sm text-ccc-muted">Refreshing telemetry…</p>
      </header>
    );
  }

  return (
    <header className="relative z-10 border-b border-ccc-border bg-ccc-surface/95 backdrop-blur-sm">
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
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded border border-ccc-warn/50 bg-ccc-warn/10 px-2 py-0.5 text-xs font-medium text-ccc-warn">
              {data.demoLabel}
            </span>
            <StatusBadge status={data.systemStatus} />
            <span className="text-xs text-ccc-muted">System</span>
          </div>
        </div>
        <div className="ccc-scroll flex gap-3 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible">
          {data.telemetry.map((m) => (
            <div
              key={m.id}
              className="flex min-w-[7.5rem] shrink-0 flex-col rounded-md border border-ccc-border bg-ccc-surface-raised/80 px-3 py-2"
            >
              <span className="text-xs text-ccc-muted">{m.label}</span>
              <span className="text-base font-semibold tabular-nums text-ccc-text">
                {m.value}
                {m.hint && (
                  <span className="ml-1 text-xs font-normal text-ccc-warn">
                    ({m.hint})
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}
