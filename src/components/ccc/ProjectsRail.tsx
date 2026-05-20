"use client";

import { useCCC } from "@/context/CCCContext";
export function ProjectsRail() {
  const { data, loading, openProject } = useCCC();

  if (loading) return null;

  return (
    <section className="border-t border-ccc-border bg-ccc-surface/90">
      <div className="px-3 py-2 md:px-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-ccc-muted">
          Active projects
        </h2>
      </div>
      <div className="ccc-scroll flex gap-3 overflow-x-auto px-3 pb-3 md:px-4">
        {data.projects.map((project) => (
          <button
            key={project.id}
            type="button"
            onClick={() => openProject(project.id)}
            className="ccc-tap-target flex min-w-[11rem] max-w-[14rem] shrink-0 flex-col rounded-lg border border-ccc-border bg-ccc-surface-raised px-3 py-3 text-left transition-colors hover:border-ccc-accent/40 active:bg-ccc-accent/5"
          >
            <span className="text-sm font-semibold text-ccc-text">{project.name}</span>
            <span className="mt-1 line-clamp-2 text-xs text-ccc-muted">{project.tagline}</span>
            <span className="mt-2 inline-flex">
              <span className="rounded border border-ccc-border px-2 py-0.5 text-xs capitalize text-ccc-accent">
                {project.status}
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
