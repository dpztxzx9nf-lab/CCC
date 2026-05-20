import { NextResponse } from "next/server";
import { isLocalIngestionEnabled, scanLocalContinuity } from "@/lib/localData";
import { buildOperationalSnapshot } from "@/lib/operations/operationalState";
import { readContinuitySnapshotFromDisk } from "@/lib/snapshot/loadSnapshot";
import { mergeContinuitySnapshot } from "@/lib/snapshot/mergeIntoOperational";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const [report, archivist] = await Promise.all([
      isLocalIngestionEnabled() ? scanLocalContinuity() : Promise.resolve(null),
      readContinuitySnapshotFromDisk(),
    ]);
    const base = buildOperationalSnapshot(report);
    const { operational } = mergeContinuitySnapshot(base, archivist);
    return NextResponse.json(operational, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Operational mapping failed";
    const archivist = await readContinuitySnapshotFromDisk();
    const base = buildOperationalSnapshot(null);
    const { operational } = mergeContinuitySnapshot(base, archivist);
    return NextResponse.json(
      { ...operational, enabled: operational.enabled, message },
      { status: 500 },
    );
  }
}
