"use client";

import type { InhabitantBehavior } from "@/data/inhabitant-types";
import type { Operator } from "@/data/types";

interface OperatorEntityProps {
  operator: Operator;
  behavior: InhabitantBehavior;
}

const ROLE_CLASS: Record<string, string> = {
  "nexus-7": "ccc-agent--nexus",
  "fab-0": "ccc-agent--fab",
  "bcast-1": "ccc-agent--bcast",
  "scout-6": "ccc-agent--scout",
  "deep-1": "ccc-agent--deep",
};

export function OperatorEntity({ operator, behavior }: OperatorEntityProps) {
  const roleClass = ROLE_CLASS[operator.id] ?? "ccc-agent--default";

  return (
    <div
      className={`ccc-agent ${roleClass}`}
      data-intensity={behavior.intensity}
      data-posture={behavior.posture}
      data-status={operator.status}
      aria-hidden
    >
      <span className="ccc-agent__shadow" />
      <span className="ccc-agent__accent" />
      <span className="ccc-agent__head">
        <span className="ccc-agent__visor" />
      </span>
      <span className="ccc-agent__torso">
        <span className="ccc-agent__core" />
      </span>
      <span className="ccc-agent__arm ccc-agent__arm--left" />
      <span className="ccc-agent__arm ccc-agent__arm--right" />
      <span className="ccc-agent__legs" />
      <span className="ccc-agent__base" />
    </div>
  );
}
