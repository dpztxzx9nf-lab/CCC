"use client";

import type { InhabitantBehavior } from "@/data/inhabitant-types";
import type { Operator } from "@/data/types";
import { Bcast1Entity } from "./operators/Bcast1Entity";
import { Deep1Entity } from "./operators/Deep1Entity";
import { Fab0Entity } from "./operators/Fab0Entity";
import { Nexus7Entity } from "./operators/Nexus7Entity";
import { Scout6Entity } from "./operators/Scout6Entity";

interface OperatorEntityProps {
  operator: Operator;
  behavior: InhabitantBehavior;
}

export function OperatorEntity({ operator, behavior }: OperatorEntityProps) {
  switch (operator.id) {
    case "nexus-7":
      return <Nexus7Entity operator={operator} behavior={behavior} />;
    case "fab-0":
      return <Fab0Entity operator={operator} behavior={behavior} />;
    case "deep-1":
      return <Deep1Entity operator={operator} behavior={behavior} />;
    case "bcast-1":
      return <Bcast1Entity operator={operator} behavior={behavior} />;
    case "scout-6":
      return <Scout6Entity operator={operator} behavior={behavior} />;
    default:
      return <Nexus7Entity operator={operator} behavior={behavior} />;
  }
}
