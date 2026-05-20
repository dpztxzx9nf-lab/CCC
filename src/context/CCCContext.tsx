"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { OperationalSnapshot, SnapshotMeta } from "@/data/operational-types";
import type { ContinuityEventView } from "@/lib/continuity/events/types";
import type { CCCData, Operator, Project, Sector, SectorId } from "@/data/types";
import { recentEvents } from "@/lib/continuity/events/recent";
import { getCCCDataSync } from "@/lib/data-source";
import { getOperatorsForSector } from "@/lib/operators-for-sector";
import { applyOperationalSnapshot } from "@/lib/operational-source";
import { buildOperationalSnapshot } from "@/lib/operations/operationalState";
import { loadContinuitySnapshot } from "@/lib/snapshot/loadSnapshot";
import { mergeContinuitySnapshot } from "@/lib/snapshot/mergeIntoOperational";

export type PanelKind = "sector" | "operator" | "project";

export interface ActivePanel {
  kind: PanelKind;
  id: string;
}

interface CCCContextValue {
  data: CCCData;
  operational: OperationalSnapshot | null;
  snapshotMeta: SnapshotMeta | null;
  continuityEvents: ContinuityEventView[];
  highlightedSectors: SectorId[];
  setEventHighlight: (event: ContinuityEventView | null) => void;
  loading: boolean;
  operationalLoading: boolean;
  error: string | null;
  activePanel: ActivePanel | null;
  openSector: (id: SectorId) => void;
  openOperator: (id: string) => void;
  openProject: (id: string) => void;
  closePanel: () => void;
  getSector: (id: SectorId) => Sector | undefined;
  getOperator: (id: string) => Operator | undefined;
  getProject: (id: string) => Project | undefined;
  getSectorHeat: (id: SectorId) => OperationalSnapshot["sectorHeat"][0] | undefined;
  getOperatorsForSector: (id: SectorId) => Operator[];
}

const CCCContext = createContext<CCCContextValue | null>(null);

export function CCCProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<CCCData>(getCCCDataSync);
  const [operational, setOperational] = useState<OperationalSnapshot | null>(null);
  const [snapshotMeta, setSnapshotMeta] = useState<SnapshotMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [operationalLoading, setOperationalLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<ActivePanel | null>(null);
  const [continuityEvents, setContinuityEvents] = useState<ContinuityEventView[]>([]);
  const [highlightedSectors, setHighlightedSectors] = useState<SectorId[]>([]);

  const setEventHighlight = useCallback((event: ContinuityEventView | null) => {
    setHighlightedSectors(event?.sectors ?? []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setOperationalLoading(true);

    async function hydrate() {
      const [apiResult, archivist, eventsPayload] = await Promise.all([
        fetch("/api/operational-state", { cache: "no-store" })
          .then(async (res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json() as Promise<OperationalSnapshot>;
          })
          .catch(() => null),
        loadContinuitySnapshot(),
        fetch("/api/continuity-events?limit=48", { cache: "no-store" })
          .then(async (res) => {
            if (!res.ok) return null;
            return res.json() as Promise<{ events?: ContinuityEventView[] }>;
          })
          .catch(() => null),
      ]);

      if (cancelled) return;

      const base = apiResult ?? buildOperationalSnapshot(null);
      const { operational: merged, snapshotMeta: meta } = mergeContinuitySnapshot(
        base,
        archivist,
      );

      const fromApi = eventsPayload?.events?.length
        ? eventsPayload.events
        : apiResult?.continuityEvents ?? merged.continuityEvents ?? [];

      const events = recentEvents(fromApi, 48);

      setOperational({ ...merged, continuityEvents: events });
      setContinuityEvents(events);
      setSnapshotMeta(meta);
      setData(applyOperationalSnapshot(getCCCDataSync(), merged));
      setError(apiResult || archivist ? null : "Operational and snapshot data unavailable");
    }

    hydrate()
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "Operational mapping unavailable";
        setError(message);
        setData(getCCCDataSync());
      })
      .finally(() => {
        if (!cancelled) setOperationalLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const closePanel = useCallback(() => setActivePanel(null), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePanel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closePanel]);

  useEffect(() => {
    if (!activePanel) return;

    const scrollY = window.scrollY;
    const { style } = document.body;
    const prev = {
      position: style.position,
      top: style.top,
      left: style.left,
      right: style.right,
      width: style.width,
      overflow: style.overflow,
    };

    style.position = "fixed";
    style.top = `-${scrollY}px`;
    style.left = "0";
    style.right = "0";
    style.width = "100%";
    style.overflow = "hidden";

    return () => {
      style.position = prev.position;
      style.top = prev.top;
      style.left = prev.left;
      style.right = prev.right;
      style.width = prev.width;
      style.overflow = prev.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [activePanel]);

  const openSector = useCallback((id: SectorId) => {
    setActivePanel({ kind: "sector", id });
  }, []);

  const openOperator = useCallback((id: string) => {
    setActivePanel({ kind: "operator", id });
  }, []);

  const openProject = useCallback((id: string) => {
    setActivePanel({ kind: "project", id });
  }, []);

  const getSector = useCallback(
    (id: SectorId) => data.sectors.find((s) => s.id === id),
    [data],
  );

  const getOperator = useCallback(
    (id: string) => data.operators.find((o) => o.id === id),
    [data],
  );

  const getProject = useCallback(
    (id: string) => data.projects.find((p) => p.id === id),
    [data],
  );

  const getSectorHeat = useCallback(
    (id: SectorId) => operational?.sectorHeat.find((h) => h.sectorId === id),
    [operational],
  );

  const getOperatorsForSectorCb = useCallback(
    (id: SectorId) => getOperatorsForSector(id, data, operational),
    [data, operational],
  );

  const value = useMemo(
    () => ({
      data,
      operational,
      snapshotMeta,
      continuityEvents,
      highlightedSectors,
      setEventHighlight,
      loading,
      operationalLoading,
      error,
      activePanel,
      openSector,
      openOperator,
      openProject,
      closePanel,
      getSector,
      getOperator,
      getProject,
      getSectorHeat,
      getOperatorsForSector: getOperatorsForSectorCb,
    }),
    [
      data,
      operational,
      snapshotMeta,
      continuityEvents,
      highlightedSectors,
      setEventHighlight,
      loading,
      operationalLoading,
      error,
      activePanel,
      openSector,
      openOperator,
      openProject,
      closePanel,
      getSector,
      getOperator,
      getProject,
      getSectorHeat,
      getOperatorsForSectorCb,
    ],
  );

  return <CCCContext.Provider value={value}>{children}</CCCContext.Provider>;
}

export function useCCC(): CCCContextValue {
  const ctx = useContext(CCCContext);
  if (!ctx) throw new Error("useCCC must be used within CCCProvider");
  return ctx;
}
