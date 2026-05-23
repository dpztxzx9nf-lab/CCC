import "server-only";

import { collectPm2Telemetry } from "@/lib/telemetry/collectors/pm2";
import type { OperationalSignal } from "../types";
import { derivePm2RuntimeSignalsFromTelemetry } from "./pm2Runtime";

export async function derivePm2RuntimeOperationalSignals(): Promise<
  OperationalSignal[]
> {
  const runtime = await collectPm2Telemetry();
  return derivePm2RuntimeSignalsFromTelemetry(runtime);
}
