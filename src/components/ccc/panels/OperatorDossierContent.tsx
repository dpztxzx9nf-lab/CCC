"use client";

import { useMemo, type ReactNode } from "react";
import type { Operator } from "@/data/types";
import { useCCC } from "@/context/CCCContext";
import { resolveOperatorPlacement } from "@/lib/facility/ecology-resolve";
import { buildOperatorDossierRecord } from "@/lib/operator-dossier-record";
import { computeInhabitantBehavior } from "@/lib/inhabitant-behavior";
import { OperatorContinuityEvents } from "@/components/continuity/OperatorContinuityEvents";
import { StatusBadge } from "../StatusBadge";

interface OperatorDossierContentProps {
  operator: Operator;
}

function DossierSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="ccc-dossier-section">
      <h3 className="ccc-dossier-section__title">{title}</h3>
      <div className="ccc-dossier-section__body">{children}</div>
    </section>
  );
}

/** Continuity record — investigatory, cross-time; not hover awareness. */
export function OperatorDossierContent({ operator }: OperatorDossierContentProps) {
  const { data, openProject, operational, continuityEvents } = useCCC();
  const placement = resolveOperatorPlacement(operator, operational);
  const chamberOps = useMemo(
    () =>
      (data?.operators ?? []).filter(
        (o) =>
          resolveOperatorPlacement(o, operational).currentChamberId ===
          placement.currentChamberId,
      ),
    [data?.operators, operational, placement.currentChamberId],
  );
  const slotIndex = Math.max(
    0,
    chamberOps.findIndex((o) => o.id === operator.id),
  );
  const behavior = useMemo(() => {
    if (!data) {
      return {
        operatorId: operator.id,
        posture: "anchored" as const,
        stateLabel: operator.currentActivity,
        purpose: operator.role,
        stationId: null,
        stationName: null,
        position: { x: 50, y: 50 },
        intensity: "calm" as const,
        transitFromChamberId: null,
        transitFrom: null,
      };
    }
    return computeInhabitantBehavior({
      operator,
      chamberId: placement.currentChamberId,
      primaryDomain: placement.primaryDomain,
      placement,
      slotIndex,
      slotTotal: chamberOps.length || 1,
      data,
      operational,
    });
  }, [
    data,
    operator,
    placement,
    slotIndex,
    chamberOps.length,
    operational,
  ]);

  const linkedProjectNames = useMemo(
    () =>
      data?.projects
        .filter((p) => operator.dossier.linkedProjectIds.includes(p.id))
        .map((p) => p.name) ?? [],
    [data, operator.dossier.linkedProjectIds],
  );

  const record = useMemo(
    () =>
      buildOperatorDossierRecord(
        operator,
        placement,
        behavior,
        operational,
        continuityEvents,
        linkedProjectNames,
      ),
    [
      operator,
      placement,
      behavior,
      operational,
      continuityEvents,
      linkedProjectNames,
    ],
  );

  return (
    <div className="ccc-dossier-record space-y-5">
      <div className="ccc-dossier-record__identity">
        <StatusBadge status={record.status} />
        <p className="mt-2 font-mono text-xs uppercase tracking-widest text-ccc-accent-dim">
          Continuity record
        </p>
        <p className="mt-1 text-sm text-ccc-muted">{record.role}</p>
        <p className="mt-0.5 text-xs text-ccc-muted">{record.designation}</p>
      </div>

      <DossierSection title="Operational assignment">
        <dl className="ccc-dossier-dl">
          <div>
            <dt>Domain</dt>
            <dd>{record.primaryDomain}</dd>
          </div>
          <div>
            <dt>Home sector</dt>
            <dd>{record.homeChamber}</dd>
          </div>
          <div>
            <dt>Present</dt>
            <dd>
              {record.currentChamber}
              {record.isTransit ? " · in transit" : ""}
            </dd>
          </div>
          {record.currentAssignment ? (
            <div>
              <dt>Assignment</dt>
              <dd>{record.currentAssignment}</dd>
            </div>
          ) : null}
        </dl>
        <p className="mt-2 text-xs text-ccc-muted">{record.movementNote}</p>
      </DossierSection>

      <DossierSection title="Semantic record">
        <p className="text-sm leading-relaxed text-ccc-text">
          {record.semanticSummary}
        </p>
        <p className="mt-2 font-mono text-[10px] text-ccc-muted">
          Last sync {new Date(record.lastSync).toLocaleString()}
        </p>
      </DossierSection>

      {record.signalHistory.length > 0 ? (
        <DossierSection title="Signal history">
          <ul className="space-y-2">
            {record.signalHistory.map((sig) => (
              <li key={sig.id} className="ccc-dossier-signal-row">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm text-ccc-text">{sig.label}</span>
                  <time
                    className="shrink-0 font-mono text-[10px] text-ccc-muted"
                    dateTime={sig.at}
                  >
                    {new Date(sig.at).toLocaleString()}
                  </time>
                </div>
                {sig.detail ? (
                  <p className="mt-0.5 text-xs text-ccc-muted">{sig.detail}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </DossierSection>
      ) : null}

      <OperatorContinuityEvents operator={operator} />

      {record.domainPressure ? (
        <DossierSection title="Operational pressure">
          <dl className="ccc-dossier-dl">
            <div>
              <dt>Activity level</dt>
              <dd className="capitalize">{record.domainPressure.activityLevel}</dd>
            </div>
            <div>
              <dt>Operational load</dt>
              <dd>{record.domainPressure.operationalLoad}</dd>
            </div>
            {record.domainPressure.dominantActivity ? (
              <div>
                <dt>Dominant signal</dt>
                <dd>{record.domainPressure.dominantActivity}</dd>
              </div>
            ) : null}
          </dl>
        </DossierSection>
      ) : null}

      {record.telemetryHints.length > 0 ? (
        <DossierSection title="Telemetry relationships">
          <ul className="list-inside list-disc space-y-1 text-sm text-ccc-text">
            {record.telemetryHints.map((hint) => (
              <li key={hint}>{hint}</li>
            ))}
          </ul>
        </DossierSection>
      ) : null}

      <DossierSection title="Initiative participation">
        {record.linkedProjectNames.length > 0 ? (
          <ul className="space-y-2">
            {data?.projects
              .filter((p) => operator.dossier.linkedProjectIds.includes(p.id))
              .map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => openProject(p.id)}
                    className="ccc-tap-target text-left text-sm font-medium text-ccc-accent hover:underline"
                  >
                    {p.name}
                  </button>
                  <p className="text-xs text-ccc-muted">{p.tagline}</p>
                </li>
              ))}
          </ul>
        ) : (
          <p className="text-sm text-ccc-muted">No linked initiatives on record.</p>
        )}
      </DossierSection>

      <DossierSection title="Continuity objectives">
        <ul className="list-inside list-disc space-y-1 text-sm text-ccc-text">
          {record.objectives.map((obj) => (
            <li key={obj}>{obj}</li>
          ))}
        </ul>
      </DossierSection>

      {record.continuityEventCount > 0 ? (
        <p className="font-mono text-[10px] text-ccc-muted">
          {record.continuityEventCount} attributed continuity event
          {record.continuityEventCount === 1 ? "" : "s"} indexed
        </p>
      ) : null}
    </div>
  );
}
