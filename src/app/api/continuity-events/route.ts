import { NextResponse } from "next/server";
import { toContinuityEventView } from "@/lib/continuity/events";
import { recentEvents } from "@/lib/continuity/events/recent";
import { readContinuityEventsFromDisk } from "@/lib/continuity/events/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(
    100,
    Math.max(1, Number.parseInt(searchParams.get("limit") ?? "48", 10) || 48),
  );

  const events = await readContinuityEventsFromDisk();
  const slice = recentEvents(events, limit).map(toContinuityEventView);

  return NextResponse.json(
    {
      count: slice.length,
      events: slice,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
