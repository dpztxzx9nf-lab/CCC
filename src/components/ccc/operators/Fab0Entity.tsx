"use client";

import type { InhabitantBehavior } from "@/data/inhabitant-types";
import type { Operator } from "@/data/types";

export function Fab0Entity({
  operator,
  behavior,
}: {
  operator: Operator;
  behavior: InhabitantBehavior;
}) {
  return (
    <div
      className="op-fab"
      data-intensity={behavior.intensity}
      data-posture={behavior.posture}
      data-status={operator.status}
      aria-hidden
    >
      <span className="op-fab__crane" />
      <span className="op-fab__head" />
      <span className="op-fab__chest">
        <span className="op-fab__core" />
      </span>
      <span className="op-fab__arm op-fab__arm--l">
        <span className="op-fab__tool" />
      </span>
      <span className="op-fab__arm op-fab__arm--r">
        <span className="op-fab__tool" />
      </span>
      <span className="op-fab__treads" />
      <span className="op-fab__spark op-fab__spark--a" />
      <span className="op-fab__spark op-fab__spark--b" />
      <span className="op-fab__shadow" />
    </div>
  );
}
