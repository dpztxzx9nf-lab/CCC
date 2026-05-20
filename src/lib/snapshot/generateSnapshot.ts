/**
 * ARCHIVIST-0 continuity snapshot generator.
 * Run: npm run snapshot
 */
import { fileURLToPath } from "url";
import path from "path";
import { getArchivistConfig } from "@/lib/localData/archivist-config";
import { scanAllSnapshotRoots } from "@/lib/localData/scanners";
import { writeContinuitySnapshot } from "@/lib/archivist/snapshot-write";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "../../..");

async function main(): Promise<void> {
  console.log("ARCHIVIST-0 — scanning local continuity roots…");

  const { scanRoots } = await scanAllSnapshotRoots();

  for (const root of scanRoots) {
    const status = root.accessible ? "ok" : "inaccessible";
    console.log(`  [${status}] ${root.path} — ${root.projectCount} projects`);
  }

  const config = { ...getArchivistConfig(), cccProjectRoot: PROJECT_ROOT };
  const { outputPath, projectCount, signalCount } = await writeContinuitySnapshot(config);

  console.log(`\nWrote ${outputPath}`);
  console.log(`  projects: ${projectCount}`);
  console.log(`  signals: ${signalCount}`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
