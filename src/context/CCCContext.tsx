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
import type { CCCData, Operator, Project, Sector, SectorId } from "@/data/types";
import { fetchCCCData, getCCCDataSync } from "@/lib/data-source";

export type PanelKind = "sector" | "operator" | "project";

export interface ActivePanel {
  kind: PanelKind;
  id: string;
}

interface CCCContextValue {
  data: CCCData;
  loading: boolean;
  error: string | null;
  activePanel: ActivePanel | null;
  openSector: (id: SectorId) => void;
  openOperator: (id: string) => void;
  openProject: (id: string) => void;
  closePanel: () => void;
  getSector: (id: SectorId) => Sector | undefined;
  getOperator: (id: string) => Operator | undefined;
  getProject: (id: string) => Project | undefined;
}

const CCCContext = createContext<CCCContextValue | null>(null);

export function CCCProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<CCCData>(getCCCDataSync);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<ActivePanel | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchCCCData()
      .then((next) => {
        if (!cancelled) {
          setData(next);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : "Failed to load command data";
          setError(message);
          setData(getCCCDataSync());
        }
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

  const value = useMemo(
    () => ({
      data,
      loading,
      error,
      activePanel,
      openSector,
      openOperator,
      openProject,
      closePanel,
      getSector,
      getOperator,
      getProject,
    }),
    [
      data,
      loading,
      error,
      activePanel,
      openSector,
      openOperator,
      openProject,
      closePanel,
      getSector,
      getOperator,
      getProject,
    ],
  );

  return <CCCContext.Provider value={value}>{children}</CCCContext.Provider>;
}

export function useCCC(): CCCContextValue {
  const ctx = useContext(CCCContext);
  if (!ctx) throw new Error("useCCC must be used within CCCProvider");
  return ctx;
}
