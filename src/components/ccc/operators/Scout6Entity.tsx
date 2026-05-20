"use client";

import type { InhabitantBehavior } from "@/data/inhabitant-types";
import type { Operator } from "@/data/types";

export function Scout6Entity({
  operator,
  behavior,
}: {
  operator: Operator;
  behavior: InhabitantBehavior;
}) {
  return (
    <div
      className="op-scout"
      data-intensity={behavior.intensity}
      data-posture={behavior.posture}
      data-status={operator.status}
      aria-hidden
    >
      <span className="op-scout__scanner" />
      <span className="op-scout__visor" />
      <span className="op-scout__pack" />
      <span className="op-scout__chest" />
      <span className="op-scout__arm op-scout__arm--l" />
      <span className="op-scout__arm op-scout__arm--r" />
      <span className="op-scout__leg op-scout__leg--l" />
      <span className="op-scout__leg op-scout__leg--r" />
      <span className="op-scout__shadow" />
    </div>
  );
}
