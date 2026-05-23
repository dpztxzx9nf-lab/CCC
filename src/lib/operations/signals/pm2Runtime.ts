import type { OperationalTelemetry, Pm2ProcessTelemetry } from "@/lib/telemetry/types";
import type { OperationalSignal, OperationalSignalSeverity } from "../types";

const SOURCE = "runtime:pm2";
const RECOGNIZED_SERVICE_PROJECTS: Record<string, string> = {
  "ccc-archivist": "ccc",
  liahona: "liahona-ai",
};

function stableServiceId(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function isRestartingStatus(status: string): boolean {
  return /launching|stopping|restart|waiting restart/i.test(status);
}

function isOfflineStatus(status: string): boolean {
  return /stopped|errored|offline|unknown/i.test(status);
}

function usageSeverity(process: Pm2ProcessTelemetry): OperationalSignalSeverity | null {
  const cpu = process.cpu ?? 0;
  const memoryMb = process.memoryMb ?? 0;
  if (cpu >= 80 || memoryMb >= 1024) return "high";
  if (cpu >= 40 || memoryMb >= 512) return "medium";
  if (cpu >= 15 || memoryMb >= 256) return "low";
  return null;
}

function restartSeverity(process: Pm2ProcessTelemetry): OperationalSignalSeverity {
  if (isRestartingStatus(process.status)) return "high";
  const restarts = process.restartCount ?? 0;
  if (restarts >= 10) return "high";
  if (restarts >= 3) return "medium";
  return "low";
}

function metadataFor(process: Pm2ProcessTelemetry): Record<string, unknown> {
  const projectId = RECOGNIZED_SERVICE_PROJECTS[process.name.toLowerCase()] ?? null;
  return {
    serviceName: process.name,
    projectId,
    recognizedService: projectId !== null,
    status: process.status,
    uptimeMs: process.uptimeMs,
    memoryMb: process.memoryMb,
    cpu: process.cpu,
    restartCount: process.restartCount,
    pmId: process.pmId,
  };
}

function runtimeSignal(
  process: Pm2ProcessTelemetry,
  timestamp: string,
  type: string,
  severity: OperationalSignalSeverity,
): OperationalSignal {
  const serviceId = stableServiceId(process.name);
  return {
    id: `pm2-${serviceId}-${type}`,
    timestamp,
    source: SOURCE,
    sector: "runtime",
    type,
    severity,
    metadata: metadataFor(process),
  };
}

export function derivePm2RuntimeSignalsFromTelemetry(
  runtime: OperationalTelemetry["runtime"] | null | undefined,
  timestamp = new Date().toISOString(),
): OperationalSignal[] {
  if (!runtime?.pm2Available) return [];

  const signals: OperationalSignal[] = [];

  for (const process of runtime.processes) {
    if (process.status === "online") {
      signals.push(runtimeSignal(process, timestamp, "pm2_runtime_online", "low"));
    } else if (isRestartingStatus(process.status)) {
      signals.push(
        runtimeSignal(process, timestamp, "pm2_runtime_restarting", "high"),
      );
    } else if (isOfflineStatus(process.status)) {
      signals.push(runtimeSignal(process, timestamp, "pm2_runtime_offline", "high"));
    } else {
      signals.push(runtimeSignal(process, timestamp, "pm2_runtime_state", "medium"));
    }

    if ((process.restartCount ?? 0) > 0) {
      signals.push(
        runtimeSignal(
          process,
          timestamp,
          "pm2_runtime_restart_count",
          restartSeverity(process),
        ),
      );
    }

    const pressureSeverity = usageSeverity(process);
    if (pressureSeverity) {
      signals.push(
        runtimeSignal(
          process,
          timestamp,
          "pm2_runtime_resource_pressure",
          pressureSeverity,
        ),
      );
    }
  }

  return signals;
}
