import { NextResponse } from "next/server";
import { isLocalIngestionEnabled, scanLocalContinuity } from "@/lib/localData";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const report = await scanLocalContinuity();
    return NextResponse.json(report, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Local continuity scan failed";
    return NextResponse.json(
      {
        enabled: isLocalIngestionEnabled(),
        label: "LOCAL DEV DATA",
        scannedAt: new Date().toISOString(),
        sources: [],
        signals: [],
        totals: {
          projects: 0,
          detectedProjects: 0,
          markdownFiles: 0,
          recentActivityCount: 0,
          sourcesScanned: 0,
        },
        message,
      },
      { status: 500 },
    );
  }
}
