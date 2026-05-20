"use client";

import type { InhabitantBehavior } from "@/data/inhabitant-types";
import type { Operator } from "@/data/types";

export function Bcast1Entity({
  operator,
  behavior,
}: {
  operator: Operator;
  behavior: InhabitantBehavior;
}) {
  return (
    <div
      className="op-bcast"
      data-intensity={behavior.intensity}
      data-posture={behavior.posture}
      data-status={operator.status}
      aria-hidden
    >
      <span className="op-bcast__dish" />
      <span className="op-bcast__signal op-bcast__signal--a" />
      <span className="op-bcast__signal op-bcast__signal--b" />
      <span className="op-bcast__mast" />
      <span className="op-bcast__head">
        <span className="op-bcast__emitter" />
      </span>
      <span className="op-bcast__spine" />
      <span className="op-bcast__leg op-bcast__leg--l" />
      <span className="op-bcast__leg op-bcast__leg--r" />
      <span className="op-bcast__shadow" />
    </div>
  );
}
