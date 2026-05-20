"use client";

import { useCCC } from "@/context/CCCContext";

export function OperationalTopologyPanel() {
  const { operational, operationalLoading } = useCCC();

  if (operationalLoading) {
    return (
      <section className="ccc-sidebar-panel p-3">
        <p className="text-sm text-ccc-muted">Mapping operational topology…</p>
      </section>
    );
  }

  if (!operational) return null;

  return (
    <section className="ccc-sidebar-panel p-3">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <h2 className="shrink-0 text-sm font-semibold text-ccc-text">Topology</h2>
        <span className="min-w-0 truncate text-right text-[10px] uppercase tracking-wide text-ccc-muted">
          {operational.label}
        </span>
      </div>

      {!operational.enabled && operational.message && (
        <p className="mt-2 text-xs text-ccc-muted">{operational.message}</p>
      )}

      <ul className="mt-2 space-y-1">
        {operational.projects.map((p) => (
          <li
            key={p.projectId}
            className="flex min-w-0 items-center justify-between gap-2 py-1 text-xs"
          >
            <span className="min-w-0 truncate text-ccc-text">{p.canonicalName}</span>
            <span
              className={
                p.activityLevel === "high"
                  ? "shrink-0 text-ccc-warn"
                  : p.activityLevel === "idle"
                    ? "shrink-0 text-ccc-muted"
                    : "shrink-0 text-ccc-accent"
              }
            >
              {p.detected ? p.activityLevel : "—"}
            </span>
          </li>
        ))}
      </ul>

      {operational.enabled && operational.signals.length > 0 && (
        <details className="mt-3 min-w-0 text-xs">
          <summary className="cursor-pointer text-ccc-muted">Signals</summary>
          <ul className="mt-2 space-y-1 text-ccc-muted">
            {operational.signals.slice(0, 6).map((s) => (
              <li key={s.id} className="min-w-0 break-words">
                <span className="text-ccc-accent">{s.label}</span> — {s.value}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
