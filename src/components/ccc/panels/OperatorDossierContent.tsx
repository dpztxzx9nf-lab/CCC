"use client";

import type { Operator } from "@/data/types";
import { useCCC } from "@/context/CCCContext";
import { StatusBadge } from "../StatusBadge";

interface OperatorDossierContentProps {
  operator: Operator;
}

export function OperatorDossierContent({ operator }: OperatorDossierContentProps) {
  const { data, openProject } = useCCC();
  const { dossier } = operator;

  const linkedProjects =
    data?.projects.filter((p) => dossier.linkedProjectIds.includes(p.id)) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <StatusBadge status={operator.status} />
        <p className="mt-2 text-sm text-ccc-muted">{operator.role}</p>
        <p className="mt-3 text-sm leading-relaxed text-ccc-text">{dossier.summary}</p>
        <p className="mt-2 text-xs text-ccc-muted">
          Last sync: {new Date(dossier.lastSync).toLocaleString()}
        </p>
      </div>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-ccc-muted">
          Current activity
        </h3>
        <p className="mt-2 text-sm text-ccc-text">{operator.currentActivity}</p>
      </section>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-ccc-muted">
          Objectives
        </h3>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-ccc-text">
          {dossier.objectives.map((obj) => (
            <li key={obj}>{obj}</li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-ccc-muted">
          Linked projects
        </h3>
        <ul className="mt-2 space-y-2">
          {linkedProjects.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => openProject(p.id)}
                className="ccc-tap-target text-left text-sm font-medium text-ccc-accent hover:underline"
              >
                {p.name}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
