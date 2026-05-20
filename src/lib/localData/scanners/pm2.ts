import { readFile, stat } from "fs/promises";
import path from "path";

export interface Pm2ScanResult {
  runtimeCapable: boolean;
  pm2ConfigPresent: boolean;
  hasStartScript: boolean;
  hasDeployScript: boolean;
  processManager: "pm2" | "node-scripts" | "none";
}

const PM2_FILES = [
  "ecosystem.config.js",
  "ecosystem.config.cjs",
  "ecosystem.config.mjs",
  "pm2.config.js",
];

const DEPLOY_SCRIPT_HINTS = ["deploy", "start", "prod", "production"];

export async function scanPm2(projectPath: string): Promise<Pm2ScanResult> {
  let pm2ConfigPresent = false;

  for (const file of PM2_FILES) {
    try {
      await stat(path.join(projectPath, file));
      pm2ConfigPresent = true;
      break;
    } catch {
      /* continue */
    }
  }

  let hasStartScript = false;
  let hasDeployScript = false;
  let pm2InScripts = false;

  try {
    const raw = await readFile(path.join(projectPath, "package.json"), "utf-8");
    const pkg = JSON.parse(raw) as { scripts?: Record<string, string> };
    const scripts = pkg.scripts ?? {};
    const keys = Object.keys(scripts);
    const values = Object.values(scripts).join(" ").toLowerCase();

    hasStartScript = keys.some((k) => k === "start" || k === "dev");
    hasDeployScript = keys.some((k) =>
      DEPLOY_SCRIPT_HINTS.some((h) => k.toLowerCase().includes(h)),
    );
    pm2InScripts = values.includes("pm2") || keys.some((k) => k.includes("pm2"));
  } catch {
    /* no package.json */
  }

  const runtimeCapable =
    pm2ConfigPresent || pm2InScripts || hasStartScript || hasDeployScript;

  return {
    runtimeCapable,
    pm2ConfigPresent,
    hasStartScript,
    hasDeployScript,
    processManager: pm2ConfigPresent || pm2InScripts
      ? "pm2"
      : hasStartScript
        ? "node-scripts"
        : "none",
  };
}
