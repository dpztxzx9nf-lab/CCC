import { execFile } from "child_process";
import { promisify } from "util";
import type { OperationalTelemetry, Pm2ProcessTelemetry } from "../types";

const execFileAsync = promisify(execFile);

const EXEC_OPTS = {
  timeout: 8_000,
  maxBuffer: 2 * 1024 * 1024,
  windowsHide: true,
} as const;

interface Pm2JlistRow {
  name?: string;
  pm_id?: number;
  pm2_env?: {
    status?: string;
    pm_uptime?: number;
    restart_time?: number;
    pm_id?: number;
  };
  monit?: { memory?: number; cpu?: number };
}

/** Run `pm2 jlist` in a way that works from the Next.js Node runtime on Windows and Unix. */
async function execPm2Jlist(): Promise<string> {
  if (process.platform === "win32") {
    const { stdout } = await execFileAsync(
      "cmd.exe",
      ["/c", "pm2", "jlist"],
      EXEC_OPTS,
    );
    return stdout;
  }

  const { stdout } = await execFileAsync("pm2", ["jlist"], EXEC_OPTS);
  return stdout;
}

function uptimeMsFromRow(
  status: string,
  pmUptime: number | undefined,
): number | null {
  if (status !== "online" || typeof pmUptime !== "number" || pmUptime <= 0) {
    return null;
  }
  const elapsed = Date.now() - pmUptime;
  return elapsed >= 0 ? elapsed : null;
}

function mapPm2Row(row: Pm2JlistRow): Pm2ProcessTelemetry | null {
  if (typeof row.name !== "string") return null;

  const status = row.pm2_env?.status ?? "unknown";
  const pmId =
    typeof row.pm_id === "number"
      ? row.pm_id
      : typeof row.pm2_env?.pm_id === "number"
        ? row.pm2_env.pm_id
        : null;

  return {
    name: row.name,
    status,
    uptimeMs: uptimeMsFromRow(status, row.pm2_env?.pm_uptime),
    restartCount:
      typeof row.pm2_env?.restart_time === "number"
        ? row.pm2_env.restart_time
        : null,
    memoryMb:
      typeof row.monit?.memory === "number"
        ? Math.round((row.monit.memory / (1024 * 1024)) * 10) / 10
        : null,
    cpu: typeof row.monit?.cpu === "number" ? row.monit.cpu : null,
    pmId,
  };
}

export async function collectPm2Telemetry(): Promise<
  OperationalTelemetry["runtime"]
> {
  try {
    const stdout = await execPm2Jlist();
    const trimmed = stdout.trim();
    if (!trimmed) {
      return { pm2Available: false, processes: [] };
    }

    const raw: unknown = JSON.parse(trimmed);
    if (!Array.isArray(raw)) {
      return { pm2Available: false, processes: [] };
    }

    const processes = (raw as Pm2JlistRow[])
      .map(mapPm2Row)
      .filter((p): p is Pm2ProcessTelemetry => p !== null);

    const archivist = processes.find((p) => p.name === "ccc-archivist");

    return {
      pm2Available: true,
      processes,
      archivist: archivist
        ? {
            name: archivist.name,
            status: archivist.status,
            available: true,
          }
        : {
            name: "ccc-archivist",
            status: "not_registered",
            available: false,
          },
    };
  } catch {
    return { pm2Available: false, processes: [] };
  }
}
