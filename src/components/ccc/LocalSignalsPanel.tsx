"use client";

import { useEffect, useState } from "react";
import { useSurfaceNavigation } from "@/context/SurfaceNavigationContext";
import type { LocalContinuityReport } from "@/lib/localData/types";

const PRIMARY_SOURCE_SLUGS = [
  "ccc",
  "liahona",
  "thinkcore",
  "second-brain",
  "archive",
] as const;

function Indicator({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={
        ok
          ? "rounded border border-ccc-accent/40 bg-ccc-accent/10 px-1.5 py-0.5 text-xs text-ccc-accent"
          : "rounded border border-ccc-border px-1.5 py-0.5 text-xs text-ccc-muted"
      }
      title={label}
    >
      {label}
    </span>
  );
}

export function LocalSignalsPanel() {
  const { goToOps } = useSurfaceNavigation();
  const [report, setReport] = useState<LocalContinuityReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/local-continuity")
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { message?: string };
          throw new Error(body.message ?? `HTTP ${res.status}`);
        }
        return res.json() as Promise<LocalContinuityReport>;
      })
      .then((data) => {
        if (!cancelled) {
          setReport(data);
          setFetchError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setFetchError(
            err instanceof Error ? err.message : "Failed to load local signals",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const nestedSources =
    report?.sources.filter(
      (s) =>
        !PRIMARY_SOURCE_SLUGS.includes(
          s.slug as (typeof PRIMARY_SOURCE_SLUGS)[number],
        ) && s.detected,
    ) ?? [];

  return (
    <section className="ccc-sidebar-panel ccc-sidebar-panel--warn p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-ccc-text">Local Signals</h2>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium uppercase tracking-wide text-ccc-warn">
            LOCAL DEV DATA
          </span>
          <button
            type="button"
            className="ccc-surface-ops-link"
            title="Dev portal — swipe left from facility or open here"
            onClick={goToOps}
          >
            Ops
          </button>
        </div>
      </div>

      {loading && (
        <p className="mt-2 text-sm text-ccc-muted">Scanning local continuity sources…</p>
      )}

      {fetchError && (
        <p className="mt-2 text-sm text-ccc-danger">{fetchError}</p>
      )}

      {!loading && report && !report.enabled && (
        <p className="mt-2 text-sm text-ccc-muted">
          {report.message ??
            "Local ingestion is off in production — mock operational data remains active."}
        </p>
      )}

      {!loading && report?.enabled && (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-ccc-muted">
            Scanned {report.totals.sourcesScanned} of {report.totals.projects}{" "}
            configured sources · {report.totals.markdownFiles} markdown files ·{" "}
            {report.totals.recentActivityCount} recent file updates (7d)
          </p>

          <ul className="space-y-3">
            {report.sources
              .filter((s) =>
                PRIMARY_SOURCE_SLUGS.includes(
                  s.slug as (typeof PRIMARY_SOURCE_SLUGS)[number],
                ),
              )
              .map((source) => (
                <li
                  key={source.slug}
                  className="border-b border-ccc-border/40 py-2 last:border-0"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium text-ccc-text">
                      {source.displayName}
                    </span>
                    <span
                      className={
                        source.detected
                          ? "text-xs text-ccc-accent"
                          : "text-xs text-ccc-muted"
                      }
                    >
                      {source.detected ? "detected" : "not found"}
                    </span>
                  </div>
                  {source.detected && (
                    <>
                      <p className="mt-1 text-xs text-ccc-muted">{source.summary}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <Indicator ok={source.hasReadme} label="README" />
                        <Indicator ok={source.hasPackageJson} label="package.json" />
                        <Indicator ok={source.hasGitRepo} label="git" />
                      </div>
                      <p className="mt-2 text-xs tabular-nums text-ccc-muted">
                        {source.markdownCount} md · {source.recentActivityCount} recent
                        · {source.fileCount} files
                        {source.lastModified && (
                          <>
                            {" "}
                            · last change{" "}
                            {new Date(source.lastModified).toLocaleDateString()}
                          </>
                        )}
                      </p>
                    </>
                  )}
                </li>
              ))}
          </ul>

          {nestedSources.length > 0 && (
            <details className="text-sm text-ccc-muted">
              <summary className="cursor-pointer">Nested project folders</summary>
              <ul className="mt-2 space-y-1 pl-2">
                {nestedSources.map((s) => (
                  <li key={s.slug}>
                    {s.displayName} — {s.markdownCount} md, {s.recentActivityCount}{" "}
                    recent
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </section>
  );
}
