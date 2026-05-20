"use client";

import type { OperationalSnapshot, SnapshotMeta } from "@/data/operational-types";
import type { CCCData } from "@/data/types";
import type { ContinuityEventView } from "@/lib/continuity/events/types";
import { resolveOperatorPlacement } from "@/lib/facility/ecology-resolve";
import type { DiscreteBurstState } from "@/lib/operations/discrete-burst";
import { computeDiscreteBurstState } from "@/lib/operations/discrete-burst";

import { useEffect, useMemo, useRef, useState } from "react";

function placementSignature(data: CCCData, operational: OperationalSnapshot | null): string {
  return [...data.operators]
    .map((op) => `${op.id}:${resolveOperatorPlacement(op, operational).currentChamberId}`)
    .sort()
    .join("|");
}

interface Inputs {
  data: CCCData;
  operational: OperationalSnapshot | null;
  continuityEvents: ContinuityEventView[];
  snapshotMeta: SnapshotMeta | null;
}

export interface DiscreteActivityBindings {
  facilityNow: number;
  discreteBurst: DiscreteBurstState;
}

/** Wall clock + discrete activity windows for truthful operational pulses (client only). */
export function useDiscreteActivityBindings({
  data,
  operational,
  continuityEvents,
  snapshotMeta,
}: Inputs): DiscreteActivityBindings {
  const placementSig = useMemo(
    () => placementSignature(data, operational),
    [data, operational],
  );
  const prevPlacement = useRef<string | null>(null);
  const [placementBumpAt, setPlacementBumpAt] = useState<number | null>(null);

  useEffect(() => {
    if (prevPlacement.current !== null && prevPlacement.current !== placementSig) {
      setPlacementBumpAt(Date.now());
    }
    prevPlacement.current = placementSig;
  }, [placementSig]);

  const prevScan = useRef<string | undefined>(undefined);
  const [scanBumpAt, setScanBumpAt] = useState<number | null>(null);

  useEffect(() => {
    const src = operational?.source;
    const scannedAt = operational?.scannedAt;
    if (src === "mock" || !scannedAt) {
      prevScan.current = scannedAt;
      return;
    }
    if (prevScan.current !== undefined && prevScan.current !== scannedAt) {
      setScanBumpAt(Date.now());
    }
    prevScan.current = scannedAt;
  }, [operational?.scannedAt, operational?.source]);

  const [facilityNow, setFacilityNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setFacilityNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const discreteBurst = useMemo(
    () =>
      computeDiscreteBurstState(facilityNow, {
        continuityEvents,
        snapshotGeneratedAt: snapshotMeta?.generatedAt,
        placementBumpAt,
        scanBumpAt,
        suppressDiscreteMock: operational?.source === "mock",
      }),
    [
      facilityNow,
      continuityEvents,
      snapshotMeta?.generatedAt,
      placementBumpAt,
      scanBumpAt,
      operational?.source,
    ],
  );

  return { facilityNow, discreteBurst };
}
