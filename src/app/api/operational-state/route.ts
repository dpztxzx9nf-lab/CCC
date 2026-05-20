import { NextResponse } from "next/server";
import { isLocalIngestionEnabled, scanLocalContinuity } from "@/lib/localData";
import { buildOperationalSnapshot } from "@/lib/operations/operationalState";
import { toContinuityEventView } from "@/lib/continuity/events";
import { recentEvents } from "@/lib/continuity/events/recent";
import { readContinuityEventsFromDisk } from "@/lib/continuity/events/store";
import { readContinuitySnapshotFromDisk } from "@/lib/snapshot/loadSnapshot";
import { mergeContinuitySnapshot } from "@/lib/snapshot/mergeIntoOperational";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const [report, archivist, eventLog] = await Promise.all([
      isLocalIngestionEnabled() ? scanLocalContinuity() : Promise.resolve(null),
      readContinuitySnapshotFromDisk(),
      readContinuityEventsFromDisk(),
    ]);
    const base = buildOperationalSnapshot(report);
    const { operational } = mergeContinuitySnapshot(base, archivist);
    const continuityEvents = recentEvents(eventLog, 24).map(toContinuityEventView);
    return NextResponse.json(
      { ...operational, continuityEvents },
      {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Operational mapping failed";
    const [archivist, eventLog] = await Promise.all([
      readContinuitySnapshotFromDisk(),
      readContinuityEventsFromDisk(),
    ]);
    const base = buildOperationalSnapshot(null);
    const { operational } = mergeContinuitySnapshot(base, archivist);
    const continuityEvents = recentEvents(eventLog, 24).map(toContinuityEventView);
    return NextResponse.json(
      { ...operational, enabled: operational.enabled, message, continuityEvents },
      { status: 500 },
    );
  }
}
