import { parseJsonBody, safeFetch } from "../http";
import type { TelemetryIngestionAdapter } from "../types";
import { buildReadiness, emptyResult } from "./readiness";

export const githubIngestionAdapter: TelemetryIngestionAdapter = {
  id: "github",
  label: "GitHub",
  provider: "github",
  primarySourceMethod: "api",
  async collect() {
    const token =
      process.env.GITHUB_TOKEN?.trim() ||
      process.env.GH_TOKEN?.trim() ||
      process.env.CCC_GITHUB_TOKEN?.trim();
    if (!token) {
      return emptyResult(
        "github",
        "GitHub",
        "github",
        "api",
        "missing_credentials",
        "GITHUB_TOKEN not set — repo/activity telemetry unavailable.",
      );
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };

    const [rateRes, repoRes] = await Promise.all([
      safeFetch("https://api.github.com/rate_limit", { headers }),
      safeFetch(
        "https://api.github.com/user/repos?sort=pushed&per_page=5&affiliation=owner,collaborator,organization_member",
        { headers },
      ),
    ]);

    if (!rateRes.ok && !repoRes.ok) {
      return emptyResult(
        "github",
        "GitHub",
        "github",
        "api",
        "error",
        rateRes.error ??
          `GitHub API error (rate_limit HTTP ${rateRes.status}, repos HTTP ${repoRes.status}).`,
        true,
      );
    }

    let pushedRecently = 0;
    if (repoRes.ok) {
      const json = parseJsonBody(repoRes.body);
      if (Array.isArray(json)) {
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        for (const repo of json) {
          if (!repo || typeof repo !== "object") continue;
          const pushed = (repo as { pushed_at?: string }).pushed_at;
          if (pushed && Date.parse(pushed) >= weekAgo) pushedRecently += 1;
        }
      }
    }

    return {
      readiness: buildReadiness({
        adapterId: "github",
        label: "GitHub",
        provider: "github",
        ready: true,
        automated: true,
        primarySourceMethod: "api",
        status: "active",
        reason:
          pushedRecently > 0
            ? `GitHub activity telemetry: ${pushedRecently} repo(s) pushed in the last 7 days. Copilot token usage is not exposed via this API.`
            : "GitHub API reachable; no repos pushed in the last 7 days. Copilot token usage requires separate billing export (not scraped).",
        tokenObservations: 0,
        spendObservations: 0,
      }),
      tokenEntries: [],
      spendEntries: [],
    };
  },
};
