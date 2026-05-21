import { NextResponse } from "next/server";
import { gatherOperationalTelemetry } from "@/lib/telemetry";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const telemetry = await gatherOperationalTelemetry();
    return NextResponse.json(telemetry, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Telemetry gather failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
