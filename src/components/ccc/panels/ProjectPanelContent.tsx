"use client";

import type { Project } from "@/data/types";
import { useCCC } from "@/context/CCCContext";

interface ProjectPanelContentProps {
  project: Project;
}

export function ProjectPanelContent({ project }: ProjectPanelContentProps) {
  const { data } = useCCC();

  const sectors =
    data?.sectors.filter((s) => project.sectorIds.includes(s.id)) ?? [];

  return (
    <div className="space-y-6">
      <p className="text-sm leading-relaxed text-ccc-text">{project.description}</p>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-ccc-muted">
          Highlights
        </h3>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-ccc-text">
          {project.highlights.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-ccc-muted">
          Sectors
        </h3>
        <ul className="mt-2 flex flex-wrap gap-2">
          {sectors.map((s) => (
            <li
              key={s.id}
              className="rounded border border-ccc-border px-2 py-1 text-xs text-ccc-muted"
            >
              {s.name}
            </li>
          ))}
        </ul>
      </section>

      {project.ecosystem && (
        <section className="rounded-lg border border-ccc-accent/30 bg-ccc-accent/5 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-ccc-accent">
            Live ecosystem
          </h3>
          <p className="mt-1 text-xs text-ccc-warn">Mock / demo metrics</p>
          <p className="mt-2 text-sm font-medium text-ccc-text">
            {project.ecosystem.platform}
            {project.ecosystem.version && ` · ${project.ecosystem.version}`}
          </p>
          {project.ecosystem.url && (
            <a
              href={project.ecosystem.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-sm text-ccc-accent hover:underline"
            >
              {project.ecosystem.url.replace(/^https?:\/\//, "")}
            </a>
          )}
          <p className="mt-2 text-sm text-ccc-muted">{project.ecosystem.tagline}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {project.ecosystem.modes.map((mode) => (
              <span
                key={mode}
                className="rounded border border-ccc-border px-2 py-0.5 text-xs text-ccc-text"
              >
                {mode}
              </span>
            ))}
          </div>
          <dl className="mt-4 grid gap-2 sm:grid-cols-2">
            {project.ecosystem.metrics.map((m) => (
              <div
                key={m.label}
                className="rounded border border-ccc-border bg-ccc-surface/80 px-3 py-2"
              >
                <dt className="text-xs text-ccc-muted">{m.label}</dt>
                <dd className="text-sm font-semibold tabular-nums text-ccc-text">
                  {m.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  );
}
