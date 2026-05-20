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
import type {
  ChamberId,
  OperationalDomain,
  OperationalDomainId,
  PhysicalChamber,
} from "@/data/ecology";
import { CHAMBER_BY_ID, DOMAIN_BY_ID, DOMAIN_TO_HOME_CHAMBER } from "@/data/ecology";
import type { CCCData, Operator, Project, Sector, SectorId } from "@/data/types";
import { recentEvents } from "@/lib/continuity/events/recent";
import { getCCCDataSync } from "@/lib/data-source";
import { getOperatorsForSector } from "@/lib/operators-for-sector";
import { applyOperationalSnapshot } from "@/lib/operational-source";
import { buildOperationalSnapshot } from "@/lib/operations/operationalState";
import { loadContinuitySnapshot } from "@/lib/snapshot/loadSnapshot";
import { mergeContinuitySnapshot } from "@/lib/snapshot/mergeIntoOperational";
import type { DiscreteBurstState } from "@/lib/operations/discrete-burst";
import { useDiscreteActivityBindings } from "@/hooks/useDiscreteActivityBindings";
import type { HumanOrientationId } from "@/lib/human-orientation/types";
import { HUMAN_ORIENTATION_STORAGE_KEY } from "@/lib/human-orientation";

export type PanelKind = "chamber" | "operator" | "project";

export interface ActivePanel {
  kind: PanelKind;
  id: string;
}

interface CCCContextValue {
  data: CCCData;
  operational: OperationalSnapshot | null;
  snapshotMeta: SnapshotMeta | null;
  continuityEvents: ContinuityEventView[];
  /** Client wall clock (1s tick while mounted) for discrete activity windows */
  facilityNow: number;
  /** Event-driven gate for packets / data routes / transient motion */
  discreteBurst: DiscreteBurstState;
  /** Domains highlighted by continuity event hover */
  highlightedDomains: OperationalDomainId[];
  /** @deprecated use highlightedDomains */
  highlightedSectors: OperationalDomainId[];
  setEventHighlight: (event: ContinuityEventView | null) => void;
  loading: boolean;
  operationalLoading: boolean;
  error: string | null;
  activePanel: ActivePanel | null;
  openChamber: (id: ChamberId) => void;
  /** Open home chamber for an operational domain */
  openSector: (domainId: OperationalDomainId) => void;
  openOperator: (id: string) => void;
  openProject: (id: string) => void;
  closePanel: () => void;
  getChamber: (id: ChamberId) => PhysicalChamber | undefined;
  getDomain: (id: OperationalDomainId) => OperationalDomain | undefined;
  /** @deprecated use getChamber — accepts chamber id or domain (resolves home chamber) */
  getSector: (id: SectorId | ChamberId) => PhysicalChamber | undefined;
  getOperator: (id: string) => Operator | undefined;
  getProject: (id: string) => Project | undefined;
  getDomainHeat: (id: OperationalDomainId) => OperationalSnapshot["sectorHeat"][0] | undefined;
  /** @deprecated use getDomainHeat */
  getSectorHeat: (id: OperationalDomainId) => OperationalSnapshot["sectorHeat"][0] | undefined;
  getOperatorsForSector: (id: OperationalDomainId) => Operator[];
  /** Human operator's intentional facility orientation — shallow domain bias only */
  humanOrientation: HumanOrientationId;
  setHumanOrientation: (id: HumanOrientationId) => void;
}

const CCCContext = createContext<CCCContextValue | null>(null);

const VALID_HUMAN_ORIENTATION = new Set<HumanOrientationId>([
  "idle",
  "building",
  "researching",
  "deploying",
  "writing",
  "planning",
  "maintenance",
  "observing",
]);

function parseStoredHumanOrientation(raw: string | null): HumanOrientationId {
  if (!raw || !VALID_HUMAN_ORIENTATION.has(raw as HumanOrientationId))
    return "idle";
  return raw as HumanOrientationId;
}

export function CCCProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<CCCData>(getCCCDataSync);
  const [operational, setOperational] = useState<OperationalSnapshot | null>(null);
  const [snapshotMeta, setSnapshotMeta] = useState<SnapshotMeta | null>(null);
  const [humanOrientation, setHumanOrientationState] =
    useState<HumanOrientationId>("idle");
  const [loading, setLoading] = useState(false);
  const [operationalLoading, setOperationalLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<ActivePanel | null>(null);
  const [continuityEvents, setContinuityEvents] = useState<ContinuityEventView[]>([]);
  const [highlightedDomains, setHighlightedDomains] = useState<OperationalDomainId[]>([]);

  const { facilityNow, discreteBurst } = useDiscreteActivityBindings({
    data,
    operational,
    operationalLoading,
    continuityEvents,
    snapshotMeta,
  });

  const setEventHighlight = useCallback((event: ContinuityEventView | null) => {
    setHighlightedDomains((event?.sectors ?? []) as OperationalDomainId[]);
  }, []);

  useEffect(() => {
    try {
      setHumanOrientationState(
        parseStoredHumanOrientation(localStorage.getItem(HUMAN_ORIENTATION_STORAGE_KEY)),
      );
    } catch {
      setHumanOrientationState("idle");
    }
  }, []);

  const setHumanOrientation = useCallback((id: HumanOrientationId) => {
    setHumanOrientationState(id);
    try {
      localStorage.setItem(HUMAN_ORIENTATION_STORAGE_KEY, id);
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.cccHumanOrientation = humanOrientation;
  }, [humanOrientation]);

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

  const openChamber = useCallback((id: ChamberId) => {
    setActivePanel({ kind: "chamber", id });
  }, []);

  const openSector = useCallback((domainId: OperationalDomainId) => {
    openChamber(DOMAIN_TO_HOME_CHAMBER[domainId]);
  }, [openChamber]);

  const openOperator = useCallback((id: string) => {
    setActivePanel({ kind: "operator", id });
  }, []);

  const openProject = useCallback((id: string) => {
    setActivePanel({ kind: "project", id });
  }, []);

  const getChamber = useCallback(
    (id: ChamberId) => data.chambers.find((c) => c.id === id) ?? CHAMBER_BY_ID[id],
    [data],
  );

  const getDomain = useCallback(
    (id: OperationalDomainId) => data.domains.find((d) => d.id === id) ?? DOMAIN_BY_ID[id],
    [data],
  );

  const getSector = useCallback(
    (id: SectorId | ChamberId) => {
      const byChamber = data.chambers.find((c) => c.id === id);
      if (byChamber) return byChamber;
      return data.chambers.find((c) => c.primaryDomain === id);
    },
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

  const getDomainHeat = useCallback(
    (id: OperationalDomainId) => operational?.sectorHeat.find((h) => h.sectorId === id),
    [operational],
  );

  const getSectorHeat = getDomainHeat;

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
      facilityNow,
      discreteBurst,
      highlightedDomains,
      highlightedSectors: highlightedDomains,
      setEventHighlight,
      loading,
      operationalLoading,
      error,
      activePanel,
      openChamber,
      openSector,
      openOperator,
      openProject,
      closePanel,
      getChamber,
      getDomain,
      getSector,
      getOperator,
      getProject,
      getDomainHeat,
      getSectorHeat,
      getOperatorsForSector: getOperatorsForSectorCb,
      humanOrientation,
      setHumanOrientation,
    }),
    [
      data,
      operational,
      snapshotMeta,
      continuityEvents,
      facilityNow,
      discreteBurst,
      highlightedDomains,
      setEventHighlight,
      loading,
      operationalLoading,
      error,
      activePanel,
      openChamber,
      openSector,
      openOperator,
      openProject,
      closePanel,
      getChamber,
      getDomain,
      getSector,
      getOperator,
      getProject,
      getDomainHeat,
      getSectorHeat,
      getOperatorsForSectorCb,
      humanOrientation,
      setHumanOrientation,
    ],
  );

  return <CCCContext.Provider value={value}>{children}</CCCContext.Provider>;
}

export function useCCC(): CCCContextValue {
  const ctx = useContext(CCCContext);
  if (!ctx) throw new Error("useCCC must be used within CCCProvider");
  return ctx;
}
