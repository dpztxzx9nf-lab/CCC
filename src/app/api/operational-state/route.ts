import { NextResponse } from "next/server";
import { isLocalIngestionEnabled, scanLocalContinuity } from "@/lib/localData";
import { buildOperationalSnapshot } from "@/lib/operations/operationalState";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const report = isLocalIngestionEnabled()
      ? await scanLocalContinuity()
      : null;
    const snapshot = buildOperationalSnapshot(report);
    return NextResponse.json(snapshot, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Operational mapping failed";
    const snapshot = buildOperationalSnapshot(null);
    return NextResponse.json(
      { ...snapshot, enabled: false, message },
      { status: 500 },
    );
  }
}
