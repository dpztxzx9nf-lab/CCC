import type { Metadata } from "next";
import { OpsPortalContent } from "@/components/ops/OpsPortalContent";
import { loadOpsPortalBundle } from "@/lib/ops/loadOpsPortalBundle";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "CCC — Backend Dev Portal",
  description:
    "Internal operations reference: Git, Vercel, ARCHIVIST-0, PM2, and local CCC development.",
  robots: { index: false, follow: false },
};

export default async function OpsPage() {
  const bundle = await loadOpsPortalBundle();
  return <OpsPortalContent bundle={bundle} embedded={false} />;
}
