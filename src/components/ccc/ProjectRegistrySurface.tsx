"use client";

import { memo, useCallback, useEffect, useState } from "react";
import type { OperationalDomainId } from "@/data/ecology";
import { DOMAIN_BY_ID, OPERATIONAL_DOMAINS } from "@/data/ecology";
import { useCCC } from "@/context/CCCContext";
import type { EnrichedRegistryProject } from "@/lib/projects/registry/toProfile";
import { PROJECT_REGISTRY_STATUSES } from "@/lib/projects/registry/schema";
import type { ProjectRegistryStatus } from "@/lib/projects/registry/schema";

type RegistryPayload = {
  projects: EnrichedRegistryProject[];
  archived: EnrichedRegistryProject[];
};

const EMPTY_FORM: {
  name: string;
  tagline: string;
  description: string;
  status: ProjectRegistryStatus;
  domainIds: OperationalDomainId[];
  linkedPaths: string;
  urls: string;
  localSlug: string;
} = {
  name: "",
  tagline: "",
  description: "",
  status: "active",
  domainIds: ["core"],
  linkedPaths: "",
  urls: "",
  localSlug: "",
};

export const ProjectRegistrySurface = memo(function ProjectRegistrySurface() {
  const { openProject, refreshProjects, operationalLoading } = useCCC();
  const [projects, setProjects] = useState<EnrichedRegistryProject[]>([]);
  const [archived, setArchived] = useState<EnrichedRegistryProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/projects?includeArchived=true", {
        cache: "no-store",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as RegistryPayload;
      setProjects(data.projects);
      setArchived(data.archived);
      await refreshProjects();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load registry");
    } finally {
      setLoading(false);
    }
  }, [refreshProjects]);

  useEffect(() => {
    void load();
  }, [load]);

  const startCreate = () => {
    setCreating(true);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const startEdit = (p: EnrichedRegistryProject) => {
    setCreating(false);
    setEditingId(p.id);
    setForm({
      name: p.name,
      tagline: p.tagline,
      description: p.description,
      status: p.registryStatus,
      domainIds: [...p.domainIds],
      linkedPaths: p.linkedPaths.join("\n"),
      urls: p.urls.join("\n"),
      localSlug: p.localSlug ?? "",
    });
  };

  const cancelForm = () => {
    setCreating(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const submitForm = async () => {
    if (!form.name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const body = {
        name: form.name.trim(),
        tagline: form.tagline,
        description: form.description,
        status: form.status,
        domainIds: form.domainIds,
        linkedPaths: form.linkedPaths
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        urls: form.urls
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        localSlug: form.localSlug.trim() || null,
      };

      const res = await fetch(
        creating ? "/api/projects" : `/api/projects/${editingId}`,
        {
          method: creating ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(errBody.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as RegistryPayload;
      setProjects(data.projects);
      setArchived(data.archived);
      await refreshProjects();
      cancelForm();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const runAction = async (id: string, action: "archive" | "restore" | "delete") => {
    if (action === "delete") {
      const confirmed = window.confirm(
        `Permanently delete "${id}" from the registry? This cannot be undone. Prefer Archive to hide a project.`,
      );
      if (!confirmed) return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: action === "delete" ? "DELETE" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: action === "delete" ? undefined : JSON.stringify({ action }),
      });
      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(errBody.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as RegistryPayload;
      setProjects(data.projects);
      setArchived(data.archived);
      await refreshProjects();
      if (editingId === id) cancelForm();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const toggleDomain = (id: OperationalDomainId) => {
    setForm((f) => ({
      ...f,
      domainIds: f.domainIds.includes(id)
        ? f.domainIds.filter((d) => d !== id)
        : [...f.domainIds, id],
    }));
  };

  const formOpen = creating || editingId != null;

  return (
    <section
      className="ccc-projects-surface ccc-scroll flex min-h-0 flex-1 flex-col"
      aria-label="Projects registry"
    >
      <header className="ccc-projects-surface__header shrink-0 border-b border-ccc-border/50 px-4 py-4 md:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-ccc-accent-dim">
              Ecosystem registry
            </p>
            <h2 className="mt-1 text-lg font-semibold text-ccc-text">Projects</h2>
            <p className="mt-1 max-w-prose text-sm text-ccc-muted">
              Canonical projects persist in{" "}
              <code className="font-mono text-ccc-text/80">data/projects/registry.json</code>.
              Local scan activity enriches entries when paths or slugs match — it does not
              remove registry projects.
            </p>
          </div>
          <button
            type="button"
            className="ccc-registry-btn ccc-registry-btn--primary ccc-tap-target"
            onClick={startCreate}
            disabled={busy || formOpen}
          >
            Add project
          </button>
        </div>
        {error ? <p className="mt-2 text-sm text-ccc-danger">{error}</p> : null}
        {operationalLoading ? (
          <p className="mt-2 font-mono text-[10px] text-ccc-muted">
            Operational scan in progress…
          </p>
        ) : null}
      </header>

      {formOpen ? (
        <div className="ccc-registry-form shrink-0 border-b border-ccc-border/50 px-4 py-4 md:px-5">
          <h3 className="text-sm font-semibold text-ccc-text">
            {creating ? "New project" : `Edit ${form.name}`}
          </h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="ccc-registry-field">
              <span>Name</span>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </label>
            <label className="ccc-registry-field">
              <span>Status</span>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    status: e.target.value as typeof f.status,
                  }))
                }
              >
                {PROJECT_REGISTRY_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="ccc-registry-field md:col-span-2">
              <span>Tagline</span>
              <input
                value={form.tagline}
                onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
              />
            </label>
            <label className="ccc-registry-field md:col-span-2">
              <span>Description</span>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </label>
            <label className="ccc-registry-field">
              <span>Local slug (scan match)</span>
              <input
                value={form.localSlug}
                onChange={(e) =>
                  setForm((f) => ({ ...f, localSlug: e.target.value }))
                }
                placeholder="e.g. thinkcore"
              />
            </label>
            <fieldset className="ccc-registry-field">
              <legend>Domains</legend>
              <div className="mt-1 flex flex-wrap gap-2">
                {OPERATIONAL_DOMAINS.map((d) => (
                  <label key={d.id} className="ccc-registry-check">
                    <input
                      type="checkbox"
                      checked={form.domainIds.includes(d.id)}
                      onChange={() => toggleDomain(d.id)}
                    />
                    {d.name}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="ccc-registry-field md:col-span-2">
              <span>Linked paths (one per line)</span>
              <textarea
                rows={2}
                value={form.linkedPaths}
                onChange={(e) =>
                  setForm((f) => ({ ...f, linkedPaths: e.target.value }))
                }
              />
            </label>
            <label className="ccc-registry-field md:col-span-2">
              <span>URLs (one per line)</span>
              <textarea
                rows={2}
                value={form.urls}
                onChange={(e) => setForm((f) => ({ ...f, urls: e.target.value }))}
              />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="ccc-registry-btn ccc-registry-btn--primary"
              onClick={() => void submitForm()}
              disabled={busy || !form.name.trim()}
            >
              {busy ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              className="ccc-registry-btn"
              onClick={cancelForm}
              disabled={busy}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {loading ? (
        <p className="px-4 py-6 text-sm text-ccc-muted md:px-5">Loading registry…</p>
      ) : (
        <ul className="ccc-projects-surface__grid flex-1 gap-3 px-3 py-4 md:grid md:grid-cols-2 md:px-5 lg:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              busy={busy}
              onOpen={() => openProject(project.id)}
              onEdit={() => startEdit(project)}
              onArchive={() => void runAction(project.id, "archive")}
            />
          ))}
        </ul>
      )}

      {archived.length > 0 ? (
        <footer className="shrink-0 border-t border-ccc-border/50 px-4 py-3 md:px-5">
          <button
            type="button"
            className="ccc-registry-btn text-xs"
            onClick={() => setShowArchived((v) => !v)}
          >
            {showArchived ? "Hide" : "Show"} archived ({archived.length})
          </button>
          {showArchived ? (
            <ul className="mt-3 space-y-2">
              {archived.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded border border-ccc-border/40 px-3 py-2 text-sm"
                >
                  <span className="text-ccc-muted">{p.name}</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="ccc-registry-btn text-xs"
                      onClick={() => void runAction(p.id, "restore")}
                      disabled={busy}
                    >
                      Restore
                    </button>
                    <button
                      type="button"
                      className="ccc-registry-btn text-xs text-ccc-danger"
                      onClick={() => void runAction(p.id, "delete")}
                      disabled={busy}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </footer>
      ) : null}
    </section>
  );
});

function ProjectCard({
  project,
  busy,
  onOpen,
  onEdit,
  onArchive,
}: {
  project: EnrichedRegistryProject;
  busy: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onArchive: () => void;
}) {
  const domains = project.domainIds
    .map((id) => DOMAIN_BY_ID[id]?.name ?? id)
    .join(" · ");

  return (
    <li className="ccc-projects-surface__card ccc-registry-card">
      <div className="flex items-start gap-2">
        <span
          className={`ccc-project-chip__dot mt-1.5 shrink-0 ccc-registry-status--${project.displayStatus}`}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onOpen}
            className="block w-full text-left font-semibold text-ccc-text hover:text-ccc-accent"
          >
            {project.name}
          </button>
          <p className="mt-0.5 text-xs text-ccc-muted">{project.tagline}</p>
          {domains ? (
            <p className="mt-2 font-mono text-[10px] uppercase tracking-wide text-ccc-accent-dim">
              {domains}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="ccc-registry-badge">{project.displayStatus}</span>
            {project.activityDetected ? (
              <span className="ccc-registry-badge ccc-registry-badge--detected">
                detected
              </span>
            ) : null}
            {project.activityLevel && project.activityLevel !== "idle" ? (
              <span className="ccc-registry-badge">{project.activityLevel} load</span>
            ) : null}
          </div>
          {project.linkedPaths.length > 0 ? (
            <p className="mt-2 truncate font-mono text-[10px] text-ccc-muted">
              {project.linkedPaths[0]}
              {project.linkedPaths.length > 1
                ? ` +${project.linkedPaths.length - 1}`
                : ""}
            </p>
          ) : null}
          {project.topSignal ? (
            <p className="mt-1 text-[10px] text-ccc-muted">{project.topSignal}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="ccc-registry-btn text-xs"
              onClick={onEdit}
              disabled={busy}
            >
              Edit
            </button>
            <button
              type="button"
              className="ccc-registry-btn text-xs"
              onClick={onArchive}
              disabled={busy}
            >
              Archive
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}
