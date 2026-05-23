"use client";

import { memo, useMemo } from "react";
import type { OpsPortalBundle } from "@/lib/ops/types";
import { FacilityCommandSurface } from "./FacilityCommandSurface";
import { GestureNavigationShell } from "./GestureNavigationShell";
import { ProjectsEcosystemSurface } from "./ProjectsEcosystemSurface";
import { OpsPortalContent } from "@/components/ops/OpsPortalContent";

/** Stable surface element refs so shell navigation does not remount heavy trees. */
export const CccHomeClient = memo(function CccHomeClient({
  opsBundle,
}: {
  opsBundle: OpsPortalBundle;
}) {
  const projects = useMemo(() => <ProjectsEcosystemSurface />, []);
  const facility = useMemo(() => <FacilityCommandSurface />, []);
  const opsPortal = useMemo(
    () => <OpsPortalContent bundle={opsBundle} embedded />,
    [opsBundle],
  );

  return (
    <GestureNavigationShell
      projects={projects}
      facility={facility}
      opsPortal={opsPortal}
    />
  );
});
