"use client";

import type { InhabitantBehavior } from "@/data/inhabitant-types";
import type { Operator } from "@/data/types";

export function Deep1Entity({
  operator,
  behavior,
}: {
  operator: Operator;
  behavior: InhabitantBehavior;
}) {
  return (
    <div
      className="op-deep"
      data-intensity={behavior.intensity}
      data-posture={behavior.posture}
      data-status={operator.status}
      aria-hidden
    >
      <span className="op-deep__vault-glow" />
      <span className="op-deep__hood" />
      <span className="op-deep__face">
        <span className="op-deep__lens" />
      </span>
      <span className="op-deep__robe">
        <span className="op-deep__tablet op-deep__tablet--l" />
        <span className="op-deep__tablet op-deep__tablet--r" />
        <span className="op-deep__core" />
      </span>
      <span className="op-deep__base" />
      <span className="op-deep__shadow" />
    </div>
  );
}
