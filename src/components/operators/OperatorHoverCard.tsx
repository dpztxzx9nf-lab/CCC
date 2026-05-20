"use client";

import type { OperatorDisplayInfo } from "@/lib/operator-display";

interface OperatorHoverCardProps {
  id: string;
  info: OperatorDisplayInfo;
  visible: boolean;
}

export function OperatorHoverCard({ id, info, visible }: OperatorHoverCardProps) {
  return (
    <div
      id={id}
      className={`ccc-operator-hover${visible ? " ccc-operator-hover--visible" : ""}`}
      role="tooltip"
      aria-hidden={!visible}
    >
      <p className="ccc-operator-hover__name">{info.callsign}</p>
      <dl className="ccc-operator-hover__meta">
        <div>
          <dt>Chamber</dt>
          <dd>{info.chamberLabel}</dd>
        </div>
        {info.isTransit && (
          <div>
            <dt>Home</dt>
            <dd>{info.homeChamberLabel}</dd>
          </div>
        )}
        <div>
          <dt>Domain</dt>
          <dd>{info.domainLabel}</dd>
        </div>
        <div>
          <dt>Task</dt>
          <dd>{info.task}</dd>
        </div>
        <div>
          <dt>Source</dt>
          <dd>{info.activitySource}</dd>
        </div>
      </dl>
    </div>
  );
}
