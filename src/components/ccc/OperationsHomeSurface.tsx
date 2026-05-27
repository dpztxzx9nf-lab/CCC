"use client";

import { memo, useMemo } from "react";
import { useCCC } from "@/context/CCCContext";
import type { ContinuityEventView } from "@/lib/continuity/events/types";
import { compactTelemetryLines, formatBytes } from "@/lib/telemetry/format";
import { TelemetryBar } from "./TelemetryBar";

const DEPLOYMENT_EVENT_KINDS = new Set([
  "deploy_published",
  "deploy_blocked",
  "deployment_success",
  "deployment_failure",
  "repo_push",
]);

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.slice(0, 16);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function isDeploymentEvent(event: ContinuityEventView): boolean {
  if (DEPLOYMENT_EVENT_KINDS.has(event.kind)) return true;
  const text = `${event.title} ${event.summary}`.toLowerCase();
  return /\b(deploy|deployment|release|build|push)\b/.test(text);
}

function isDecisionEvent(event: ContinuityEventView): boolean {
  const text = `${event.title} ${event.summary}`.toLowerCase();
  return /\b(decision|dec-|accepted|architecture decision)\b/.test(text);
}

function sourceLabel(source: string | null | undefined): string {
  if (!source) return "unavailable";
  if (source === "mock") return "fallback";
  return source;
}

function Section({
  title,
  meta,
  children,
}: {
  title: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded border border-ccc-border/60 bg-ccc-surface/80 p-3 md:p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-ccc-text">{title}</h2>
        {meta ? (
          <span className="font-mono text-[10px] uppercase tracking-wide text-ccc-muted">
            {meta}
          </span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-ccc-muted">{children}</p>;
}

export const OperationsHomeSurface = memo(function OperationsHomeSurface() {
  const {
    data,
    operational,
    operationalLoading,
    continuityEvents,
    facilityTelemetry,
    enrichedProjects,
    openProject,
  } = useCCC();

  const deploymentEvents = useMemo(
    () => continuityEvents.filter(isDeploymentEvent).slice(0, 5),
    [continuityEvents],
  );

  const decisionEvents = useMemo(
    () => continuityEvents.filter(isDecisionEvent).slice(0, 5),
    [continuityEvents],
  );

  const activeSystems = useMemo(() => {
    if (operational?.projects?.length) {
      return operational.projects
        .filter((p) => p.detected || p.activityLevel !== "idle")
        .slice(0, 8);
    }

    if (enrichedProjects.length) {
      return enrichedProjects
        .filter((p) => !p.archived)
        .slice(0, 8)
        .map((p) => ({
          projectId: p.id,
          canonicalName: p.name,
          detected: p.activityDetected,
          activityScore: 0,
          activityLevel: p.activityLevel ?? "idle",
          topSignal: p.topSignal,
          sectors: p.domainIds,
          category: p.registryStatus,
          continuityPriority: 0,
        }));
    }

    return data.projects.slice(0, 8).map((p) => ({
      projectId: p.id,
      canonicalName: p.name,
      detected: false,
      activityScore: 0,
      activityLevel: "idle",
      topSignal: p.status,
      sectors: p.domainIds,
      category: p.status,
      continuityPriority: 0,
    }));
  }, [data.projects, enrichedProjects, operational]);

  const telemetryLines = facilityTelemetry
    ? compactTelemetryLines(facilityTelemetry)
    : [];
  const runtime = facilityTelemetry?.runtime;
  const runningServices =
    runtime?.processes.filter((process) => process.status === "online") ?? [];
  const healthMeta = operational
    ? `${sourceLabel(operational.source)} data`
    : operationalLoading
      ? "loading"
      : "unavailable";

  return (
    <div className="ccc-operations-home flex min-h-0 flex-1 flex-col">
      <TelemetryBar />

      <main className="ccc-scroll flex-1 px-3 py-4 md:px-5 md:py-5">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 md:gap-4">
          <header className="border-b border-ccc-border/50 pb-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ccc-accent-dim">
              Private continuity + operations
            </p>
            <h1 className="mt-1 text-xl font-semibold text-ccc-text">
              CCC Operations
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-ccc-muted">
              Local operational truth for systems, deployments, continuity,
              workflows, services, decisions, and health. Operators remain
              secondary workflow components.
            </p>
          </header>

          <Section title="Active Systems" meta={healthMeta}>
            {operationalLoading && !operational ? (
              <EmptyState>Loading operational project state.</EmptyState>
            ) : activeSystems.length === 0 ? (
              <EmptyState>No active systems are available from current data.</EmptyState>
            ) : (
              <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                {activeSystems.map((project) => (
                  <li
                    key={project.projectId}
                    className="rounded border border-ccc-border/50 bg-ccc-bg/40 p-3"
                  >
                    <button
                      type="button"
                      className="block w-full text-left text-sm font-semibold text-ccc-text hover:text-ccc-accent"
                      onClick={() => openProject(project.projectId)}
                    >
                      {project.canonicalName}
                    </button>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-wide text-ccc-muted">
                      {project.detected ? "detected" : "registry"} /{" "}
                      {project.activityLevel}
                    </p>
                    {project.topSignal ? (
                      <p className="mt-2 text-xs text-ccc-muted">
                        {project.topSignal}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Recent Deployments" meta="continuity events">
            {deploymentEvents.length === 0 ? (
              <EmptyState>
                No deployment or release events are present in the current
                continuity stream.
              </EmptyState>
            ) : (
              <ul className="space-y-2">
                {deploymentEvents.map((event) => (
                  <li
                    key={event.id}
                    className="border-b border-ccc-border/40 pb-2 last:border-0 last:pb-0"
                  >
                    <p className="text-sm font-medium text-ccc-text">{event.title}</p>
                    <p className="mt-0.5 text-xs text-ccc-muted">{event.summary}</p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-wide text-ccc-muted">
                      {formatTime(event.occurredAt)} / {event.kind} / {event.source}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Continuity Stream" meta={`${continuityEvents.length} events`}>
            {continuityEvents.length === 0 ? (
              <EmptyState>No persisted continuity events are currently loaded.</EmptyState>
            ) : (
              <ul className="space-y-2">
                {continuityEvents.slice(0, 8).map((event) => (
                  <li
                    key={event.id}
                    className="flex gap-3 border-b border-ccc-border/40 pb-2 last:border-0 last:pb-0"
                  >
                    <time className="w-24 shrink-0 font-mono text-[10px] text-ccc-muted">
                      {formatTime(event.occurredAt)}
                    </time>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ccc-text">
                        {event.title}
                      </p>
                      <p className="mt-0.5 text-xs text-ccc-muted">{event.summary}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Workflow State" meta={operational ? operational.label : "unavailable"}>
            {!operational ? (
              <EmptyState>Operational workflow state is unavailable.</EmptyState>
            ) : operational.signals.length === 0 ? (
              <EmptyState>No workflow signals are currently available.</EmptyState>
            ) : (
              <ul className="grid gap-2 md:grid-cols-2">
                {operational.signals.slice(0, 8).map((signal) => (
                  <li
                    key={signal.id}
                    className="rounded border border-ccc-border/50 bg-ccc-bg/40 p-3"
                  >
                    <p className="text-sm font-medium text-ccc-text">{signal.label}</p>
                    <p className="mt-1 text-xs text-ccc-muted">{signal.value}</p>
                    <p className="mt-2 font-mono text-[10px] uppercase tracking-wide text-ccc-muted">
                      {signal.kind} / {signal.projectId}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section
            title="Running Services"
            meta={runtime?.pm2Available ? "pm2 telemetry" : "unavailable"}
          >
            {!runtime ? (
              <EmptyState>Runtime telemetry is unavailable.</EmptyState>
            ) : !runtime.pm2Available ? (
              <EmptyState>PM2 telemetry is unavailable in this environment.</EmptyState>
            ) : runningServices.length === 0 ? (
              <EmptyState>No online PM2 services were reported.</EmptyState>
            ) : (
              <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {runningServices.map((process) => (
                  <li
                    key={`${process.name}-${process.pmId ?? "unknown"}`}
                    className="rounded border border-ccc-border/50 bg-ccc-bg/40 p-3"
                  >
                    <p className="text-sm font-medium text-ccc-text">{process.name}</p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-wide text-ccc-accent">
                      {process.status}
                    </p>
                    <p className="mt-2 text-xs text-ccc-muted">
                      Restarts {process.restartCount ?? "unknown"} / Memory{" "}
                      {process.memoryMb != null
                        ? `${process.memoryMb.toFixed(1)} MB`
                        : "unknown"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Recent Decisions" meta="continuity events only">
            {decisionEvents.length === 0 ? (
              <EmptyState>
                No decision records are present in the current continuity stream.
              </EmptyState>
            ) : (
              <ul className="space-y-2">
                {decisionEvents.map((event) => (
                  <li
                    key={event.id}
                    className="border-b border-ccc-border/40 pb-2 last:border-0 last:pb-0"
                  >
                    <p className="text-sm font-medium text-ccc-text">{event.title}</p>
                    <p className="mt-0.5 text-xs text-ccc-muted">{event.summary}</p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-wide text-ccc-muted">
                      {formatTime(event.occurredAt)} / {event.source}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Operational Health" meta={data.systemStatus}>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded border border-ccc-border/50 bg-ccc-bg/40 p-3">
                <p className="text-xs text-ccc-muted">System status</p>
                <p className="mt-1 text-sm font-semibold capitalize text-ccc-text">
                  {data.systemStatus}
                </p>
              </div>
              <div className="rounded border border-ccc-border/50 bg-ccc-bg/40 p-3">
                <p className="text-xs text-ccc-muted">Operational source</p>
                <p className="mt-1 text-sm font-semibold text-ccc-text">
                  {sourceLabel(operational?.source)}
                </p>
              </div>
              <div className="rounded border border-ccc-border/50 bg-ccc-bg/40 p-3">
                <p className="text-xs text-ccc-muted">Snapshot</p>
                <p className="mt-1 text-sm font-semibold text-ccc-text">
                  {facilityTelemetry
                    ? formatBytes(facilityTelemetry.snapshot.bytes)
                    : "unavailable"}
                </p>
              </div>
              <div className="rounded border border-ccc-border/50 bg-ccc-bg/40 p-3">
                <p className="text-xs text-ccc-muted">Continuity events</p>
                <p className="mt-1 text-sm font-semibold text-ccc-text">
                  {facilityTelemetry
                    ? facilityTelemetry.events.count
                    : continuityEvents.length}
                </p>
              </div>
            </div>

            {telemetryLines.length > 0 ? (
              <ul className="mt-3 grid gap-2 md:grid-cols-2">
                {telemetryLines.map((line) => (
                  <li key={line.label} className="text-xs text-ccc-muted">
                    <span className="font-medium text-ccc-text">{line.label}</span>
                    {": "}
                    <span>{line.value}</span>
                    {line.hint ? <span> / {line.hint}</span> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-ccc-muted">
                Detailed telemetry is unavailable.
              </p>
            )}
          </Section>
        </div>
      </main>
    </div>
  );
});
