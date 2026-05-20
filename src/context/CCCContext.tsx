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
import type { OperationalSnapshot } from "@/data/operational-types";
import type { CCCData, Operator, Project, Sector, SectorId } from "@/data/types";
import { getCCCDataSync } from "@/lib/data-source";
import { getOperatorsForSector } from "@/lib/operators-for-sector";
import { applyOperationalSnapshot } from "@/lib/operational-source";

export type PanelKind = "sector" | "operator" | "project";

export interface ActivePanel {
  kind: PanelKind;
  id: string;
}

interface CCCContextValue {
  data: CCCData;
  operational: OperationalSnapshot | null;
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
  const [loading, setLoading] = useState(false);
  const [operationalLoading, setOperationalLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<ActivePanel | null>(null);

  useEffect(() => {
    let cancelled = false;
    setOperationalLoading(true);

    fetch("/api/operational-state", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<OperationalSnapshot>;
      })
      .then((snapshot) => {
        if (cancelled) return;
        setOperational(snapshot);
        setData(applyOperationalSnapshot(getCCCDataSync(), snapshot));
        setError(null);
      })
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
    if (activePanel) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
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
    (id: SectorId) => getOperatorsForSector(id, data),
    [data],
  );

  const value = useMemo(
    () => ({
      data,
      operational,
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
