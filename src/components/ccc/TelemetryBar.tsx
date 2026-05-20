"use client";

import { useCCC } from "@/context/CCCContext";

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

  const statusTone =
    data.systemStatus === "nominal"
      ? "ccc-telemetry-status--nominal"
      : data.systemStatus === "elevated"
        ? "ccc-telemetry-status--elevated"
        : "ccc-telemetry-status--critical";

  return (
    <header className="relative z-10 border-b border-ccc-border/40 bg-ccc-surface/90 backdrop-blur-md">
      <div className="flex items-center gap-3 px-3 py-2 md:px-4 md:py-2.5">
        <span className="font-mono text-xs font-semibold tracking-widest text-ccc-accent">
          CCC
        </span>
        <span
          className={`ccc-telemetry-status ${statusTone}`}
          aria-label={`System ${data.systemStatus}`}
          title={data.systemStatus}
        />
        <div
          className="ccc-telemetry-strip ccc-scroll flex flex-1 gap-3 overflow-x-auto md:gap-4"
          aria-label="Operational telemetry"
        >
          {data.telemetry.map((m) => (
            <div
              key={m.id}
              className="ccc-telemetry-item shrink-0"
              title={`${m.label}: ${m.value}`}
            >
              <span className="ccc-telemetry-value">{m.value}</span>
              <span className="sr-only">{m.label}</span>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}
