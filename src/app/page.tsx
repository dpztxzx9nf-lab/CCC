import { CCCProvider } from "@/context/CCCContext";
import { GestureNavigationShell } from "@/components/ccc/GestureNavigationShell";
import { FacilityCommandSurface } from "@/components/ccc/FacilityCommandSurface";
import { ProjectsEcosystemSurface } from "@/components/ccc/ProjectsEcosystemSurface";
import { OpsPortalContent } from "@/components/ops/OpsPortalContent";
import { loadOpsPortalBundle } from "@/lib/ops/loadOpsPortalBundle";

export default async function Home() {
  const opsBundle = await loadOpsPortalBundle();

  return (
    <CCCProvider>
      <GestureNavigationShell
        projects={<ProjectsEcosystemSurface />}
        facility={<FacilityCommandSurface />}
        opsPortal={<OpsPortalContent bundle={opsBundle} embedded />}
      />
    </CCCProvider>
  );
}
