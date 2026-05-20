"use client";

import { useCCC } from "@/context/CCCContext";

export function OperationalTopologyPanel() {
  const { operational, operationalLoading } = useCCC();

  if (operationalLoading) {
    return (
      <section className="rounded-xl border border-ccc-border bg-ccc-surface/60 p-4">
        <p className="text-sm text-ccc-muted">Mapping operational topology…</p>
      </section>
    );
  }

  if (!operational) return null;

  return (
    <section className="rounded-xl border border-ccc-accent/25 bg-ccc-surface/80 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-ccc-text">Operational topology</h2>
        <span
          className={
            operational.enabled
              ? "rounded border border-ccc-accent/40 bg-ccc-accent/10 px-2 py-0.5 text-xs font-medium text-ccc-accent"
              : "rounded border border-ccc-warn/50 bg-ccc-warn/10 px-2 py-0.5 text-xs font-medium text-ccc-warn"
          }
        >
          {operational.label}
        </span>
      </div>

      {!operational.enabled && operational.message && (
        <p className="mt-2 text-sm text-ccc-muted">{operational.message}</p>
      )}

      <ul className="mt-3 space-y-2">
        {operational.projects.map((p) => (
          <li
            key={p.projectId}
            className="flex flex-wrap items-center justify-between gap-2 rounded border border-ccc-border/80 px-2 py-1.5 text-sm"
          >
            <span className="font-medium text-ccc-text">{p.canonicalName}</span>
            <span className="text-xs text-ccc-muted">
              {p.detected ? p.activityLevel : "offline"} · {p.activityScore}
            </span>
          </li>
        ))}
      </ul>

      {operational.enabled && operational.signals.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-ccc-muted">
            Continuity signals
          </h3>
          <ul className="mt-2 space-y-1.5">
            {operational.signals.slice(0, 8).map((s) => (
              <li key={s.id} className="text-xs text-ccc-text">
                <span className="text-ccc-accent">{s.label}</span>
                <span className="text-ccc-muted"> — {s.value}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
