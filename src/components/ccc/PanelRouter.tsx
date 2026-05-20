"use client";

import { useCCC } from "@/context/CCCContext";
import type { SectorId } from "@/data/types";
import { DetailPanel } from "./DetailPanel";
import { OperatorDossierContent } from "./panels/OperatorDossierContent";
import { ProjectPanelContent } from "./panels/ProjectPanelContent";
import { SectorPanelContent } from "./panels/SectorPanelContent";

export function PanelRouter() {
  const { activePanel, closePanel, getSector, getOperator, getProject } = useCCC();

  if (!activePanel) return null;

  if (activePanel.kind === "sector") {
    const sector = getSector(activePanel.id as SectorId);
    if (!sector) return null;
    return (
      <DetailPanel
        open
        title={sector.name}
        subtitle={sector.codename}
        onClose={closePanel}
      >
        <SectorPanelContent sector={sector} />
      </DetailPanel>
    );
  }

  if (activePanel.kind === "operator") {
    const operator = getOperator(activePanel.id);
    if (!operator) return null;
    return (
      <DetailPanel
        open
        title={operator.callsign}
        subtitle={operator.designation}
        onClose={closePanel}
      >
        <OperatorDossierContent operator={operator} />
      </DetailPanel>
    );
  }

  const project = getProject(activePanel.id);
  if (!project) return null;
  return (
    <DetailPanel
      open
      title={project.name}
      subtitle={project.tagline}
      onClose={closePanel}
    >
      <ProjectPanelContent project={project} />
    </DetailPanel>
  );
}
