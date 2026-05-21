import { parseJsonBody, safeFetch } from "../http";
import { makeSpendRecord } from "../records";
import type { TelemetryIngestionAdapter } from "../types";
import { buildReadiness, emptyResult } from "./readiness";

export const vercelIngestionAdapter: TelemetryIngestionAdapter = {
  id: "vercel",
  label: "Vercel",
  provider: "vercel",
  primarySourceMethod: "api",
  async collect() {
    const token =
      process.env.VERCEL_ACCESS_TOKEN?.trim() ||
      process.env.VERCEL_TOKEN?.trim() ||
      process.env.CCC_VERCEL_TOKEN?.trim();
    if (!token) {
      return emptyResult(
        "vercel",
        "Vercel",
        "vercel",
        "api",
        "missing_credentials",
        "VERCEL_ACCESS_TOKEN not set — deployment telemetry unavailable.",
      );
    }

    const teamId = process.env.VERCEL_TEAM_ID?.trim();
    const usageUrl = new URL("https://api.vercel.com/v1/usage");
    if (teamId) usageUrl.searchParams.set("teamId", teamId);

    const usageRes = await safeFetch(usageUrl.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    const spendEntries = [];
    if (usageRes.ok) {
      const json = parseJsonBody(usageRes.body);
      const total =
        (json as { total?: { value?: number } })?.total?.value ??
        (json as { totalCost?: number })?.totalCost;
      if (typeof total === "number" && total >= 0) {
        const entry = makeSpendRecord({
          id: `vercel-usage-${new Date().toISOString().slice(0, 7)}`,
          tool: "other",
          provider: "other",
          sourceMethod: "api",
          amount: total,
          billingPeriod: new Date().toISOString().slice(0, 7),
          note: "Vercel /v1/usage billing total (hosting; not model tokens)",
        });
        if (entry) spendEntries.push(entry);
      }
    }

    const deployUrl = new URL("https://api.vercel.com/v6/deployments");
    deployUrl.searchParams.set("limit", "5");
    if (teamId) deployUrl.searchParams.set("teamId", teamId);
    const deployRes = await safeFetch(deployUrl.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    let deployCount = 0;
    if (deployRes.ok) {
      const json = parseJsonBody(deployRes.body);
      const deployments = (json as { deployments?: unknown })?.deployments;
      if (Array.isArray(deployments)) deployCount = deployments.length;
    }

    if (spendEntries.length > 0 || deployCount > 0) {
      return {
        readiness: buildReadiness({
          adapterId: "vercel",
          label: "Vercel",
          provider: "vercel",
          ready: true,
          automated: true,
          primarySourceMethod: "api",
          status: "active",
          reason:
            spendEntries.length > 0
              ? "Vercel usage API returned billing data."
              : `Vercel deployments observable (${deployCount} recent); usage billing endpoint returned no cost.`,
          tokenObservations: 0,
          spendObservations: spendEntries.length,
        }),
        tokenEntries: [],
        spendEntries,
      };
    }

    return emptyResult(
      "vercel",
      "Vercel",
      "vercel",
      "api",
      usageRes.ok || deployRes.ok ? "no_data" : "error",
      usageRes.error ??
        `Vercel API unreachable or returned no usage (usage HTTP ${usageRes.status}, deployments HTTP ${deployRes.status}).`,
      Boolean(token),
    );
  },
};
