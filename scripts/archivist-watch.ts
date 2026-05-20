/**
 * ARCHIVIST-0 consolidation agent — observe → filter → consolidate → snapshot → deploy
 *
 * Usage:
 *   npm run archivist:watch              # continuous watch
 *   npm run archivist:watch -- --dry-run # one debounced cycle, no write/deploy
 *   npm run archivist:watch -- --once    # single cycle from current scan, then exit
 */
import { ArchivistWatcher } from "@/lib/archivist/watcher";
import { runArchivistCycle } from "@/lib/archivist/cycle";
import { getArchivistConfig } from "@/lib/localData/archivist-config";
import { scanAllSnapshotRoots } from "@/lib/localData/scanners";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const once = args.includes("--once");

async function dryRunProbe(): Promise<void> {
  const config = getArchivistConfig();
  console.log("ARCHIVIST-0 dry run — probing scan roots…\n");

  const { projects, scanRoots } = await scanAllSnapshotRoots();
  for (const r of scanRoots) {
    console.log(`  [${r.accessible ? "ok" : "skip"}] ${r.path} (${r.projectCount} projects)`);
  }

  const syntheticPaths = projects
    .filter((p) => p.activityScore > 0)
    .slice(0, 8)
    .map((p) => p.path);

  if (syntheticPaths.length === 0) {
    console.log("\nNo active projects in snapshot — simulating CCC package change");
    syntheticPaths.push(`${config.cccProjectRoot}\\package.json`);
  }

  const result = await runArchivistCycle(config, {
    dryRun: true,
    changedPaths: syntheticPaths,
  });

  for (const line of result.logs) console.log(line);
  console.log("\ndry run complete — no files written");
}

async function main(): Promise<void> {
  const config = getArchivistConfig();

  if (dryRun && !args.includes("--watch")) {
    await dryRunProbe();
    return;
  }

  const watcher = new ArchivistWatcher(config, { dryRun, once: once || dryRun });

  const shutdown = () => {
    console.log("\nARCHIVIST-0 stopping…");
    watcher.stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  if (once) {
    console.log("ARCHIVIST-0 — single consolidation cycle\n");
    await watcher.start();
    return;
  }

  console.log("ARCHIVIST-0 consolidation agent active\n");
  await watcher.start();

  if (!dryRun) {
    await new Promise(() => {
      /* run until signal */
    });
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
