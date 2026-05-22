import { CCCProvider } from "@/context/CCCContext";
import { CccHomeClient } from "@/components/ccc/CccHomeClient";
import { loadOpsPortalBundle } from "@/lib/ops/loadOpsPortalBundle";

export default async function Home() {
  const opsBundle = await loadOpsPortalBundle();

  return (
    <CCCProvider>
      <CccHomeClient opsBundle={opsBundle} />
    </CCCProvider>
  );
}
