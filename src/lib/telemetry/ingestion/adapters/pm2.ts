import { collectPm2Telemetry } from "../../collectors/pm2";
import { recordRuntimeMetric } from "../../persistence/stores";
import type { TelemetryIngestionAdapter } from "../types";
import { buildReadiness, emptyResult } from "./readiness";

export const pm2IngestionAdapter: TelemetryIngestionAdapter = {
  id: "pm2_runtime",
  label: "PM2 Runtime",
  provider: "pm2",
  primarySourceMethod: "runtime_writer",
  async collect(cwd) {
    try {
      const runtime = await collectPm2Telemetry();
      if (!runtime) {
        return emptyResult(
          "pm2_runtime",
          "PM2 Runtime",
          "pm2",
          "runtime_writer",
          "no_data",
          "PM2 runtime collector returned no snapshot.",
        );
      }
      await recordRuntimeMetric(runtime, cwd);
      if (runtime.pm2Available) {
        return {
          readiness: buildReadiness({
            adapterId: "pm2_runtime",
            label: "PM2 Runtime",
            provider: "pm2",
            ready: true,
            automated: true,
            primarySourceMethod: "runtime_writer",
            status: "active",
            reason: `PM2 jlist: ${runtime.processes.length} process(es) recorded to runtime store.`,
            spendObservations: 0,
            tokenObservations: 0,
          }),
          tokenEntries: [],
          spendEntries: [],
        };
      }
      return emptyResult(
        "pm2_runtime",
        "PM2 Runtime",
        "pm2",
        "runtime_writer",
        "no_data",
        "PM2 command ran but no processes are registered.",
        true,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "PM2 collection failed";
      return emptyResult(
        "pm2_runtime",
        "PM2 Runtime",
        "pm2",
        "runtime_writer",
        "error",
        message,
      );
    }
  },
};
