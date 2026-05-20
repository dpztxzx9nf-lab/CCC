"use client";

import type { InhabitantBehavior } from "@/data/inhabitant-types";
import type { Operator } from "@/data/types";

export function Nexus7Entity({
  operator,
  behavior,
}: {
  operator: Operator;
  behavior: InhabitantBehavior;
}) {
  return (
    <div
      className="op-nexus"
      data-intensity={behavior.intensity}
      data-posture={behavior.posture}
      data-status={operator.status}
      aria-hidden
    >
      <span className="op-nexus__halo" />
      <span className="op-nexus__bridge" />
      <span className="op-nexus__crown" />
      <span className="op-nexus__head">
        <span className="op-nexus__visor" />
      </span>
      <span className="op-nexus__mantle" />
      <span className="op-nexus__torso">
        <span className="op-nexus__core" />
      </span>
      <span className="op-nexus__arm op-nexus__arm--l" />
      <span className="op-nexus__arm op-nexus__arm--r" />
      <span className="op-nexus__pillar" />
      <span className="op-nexus__shadow" />
    </div>
  );
}
