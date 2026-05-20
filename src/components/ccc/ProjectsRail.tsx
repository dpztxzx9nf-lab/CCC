"use client";

import { useCCC } from "@/context/CCCContext";

export function ProjectsRail() {
  const { data, loading, openProject } = useCCC();

  if (loading) return null;

  return (
    <section className="ccc-projects-rail border-t border-ccc-border/50 bg-ccc-surface/80">
      <div className="ccc-scroll ccc-scroll--strip-h flex gap-2 overflow-x-auto px-3 py-2.5 md:px-4">
        {data.projects.map((project) => (
          <button
            key={project.id}
            type="button"
            onClick={() => openProject(project.id)}
            className={`ccc-project-chip ccc-tap-target ccc-project-chip--${project.status}`}
            aria-label={`${project.name}, ${project.status}`}
          >
            <span className="ccc-project-chip__dot" aria-hidden />
            <span className="ccc-project-chip__name">{project.name}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
