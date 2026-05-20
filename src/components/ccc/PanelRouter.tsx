"use client";

import { useCCC } from "@/context/CCCContext";
import type { ChamberId } from "@/data/ecology";
import { DetailPanel } from "./DetailPanel";
import { OperatorDossierContent } from "./panels/OperatorDossierContent";
import { ProjectPanelContent } from "./panels/ProjectPanelContent";
import { SectorPanelContent } from "./panels/SectorPanelContent";

export function PanelRouter() {
  const { activePanel, closePanel, getChamber, getDomain, getOperator, getProject } =
    useCCC();

  if (!activePanel) return null;

  if (activePanel.kind === "chamber") {
    const chamber = getChamber(activePanel.id as ChamberId);
    if (!chamber) return null;
    const domain = getDomain(chamber.primaryDomain);
    return (
      <DetailPanel
        open
        title={chamber.name}
        subtitle={`${chamber.codename} · ${domain?.name ?? chamber.primaryDomain} domain`}
        onClose={closePanel}
      >
        <SectorPanelContent chamber={chamber} />
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
