"use client";

import type { OperatorDisplayInfo } from "@/lib/operator-display";

interface OperatorHoverCardProps {
  info: OperatorDisplayInfo;
  visible: boolean;
}

export function OperatorHoverCard({ info, visible }: OperatorHoverCardProps) {
  return (
    <div
      className={`ccc-operator-hover${visible ? " ccc-operator-hover--visible" : ""}`}
      role="tooltip"
      aria-hidden={!visible}
    >
      <p className="ccc-operator-hover__name">{info.callsign}</p>
      <dl className="ccc-operator-hover__meta">
        <div>
          <dt>Sector</dt>
          <dd>{info.sectorLabel}</dd>
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
