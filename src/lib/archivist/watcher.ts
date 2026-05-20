import { watch } from "fs";
import path from "path";
import { stat } from "fs/promises";
import type { ArchivistConfig } from "@/lib/localData/archivist-config";
import { runArchivistCycle } from "./cycle";

export interface WatcherOptions {
  dryRun?: boolean;
  once?: boolean;
}

export class ArchivistWatcher {
  private readonly config: ArchivistConfig;
  private readonly pending = new Set<string>();
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private watchers: ReturnType<typeof watch>[] = [];
  private running = false;
  private readonly dryRun: boolean;
  private readonly once: boolean;

  constructor(config: ArchivistConfig, options: WatcherOptions = {}) {
    this.config = config;
    this.dryRun = options.dryRun ?? false;
    this.once = options.once ?? false;
  }

  async start(): Promise<void> {
    const roots = await this.resolveAccessibleRoots();

    if (roots.length === 0) {
      console.log("ARCHIVIST-0: no accessible watch roots");
      return;
    }

    console.log("ARCHIVIST-0 watching:");
    for (const r of roots) {
      console.log(`  · ${r.path}`);
      try {
        const w = watch(
          r.path,
          { recursive: true },
          (_event, filename) => {
            if (!filename) return;
            const full = path.join(r.path, filename);
            this.enqueue(full);
          },
        );
        this.watchers.push(w);
      } catch (err) {
        console.log(`  [skip] ${r.path} — ${err instanceof Error ? err.message : err}`);
      }
    }

    console.log(
      `debounce ${this.config.debounceSeconds}s · deploy cooldown ${this.config.deployCooldownMinutes}m · autoDeploy ${this.config.autoDeploy}`,
    );

    if (this.once) {
      await this.flush();
      this.stop();
    }
  }

  private async resolveAccessibleRoots() {
    const out: typeof this.config.watchRoots = [];
    const seen = new Set<string>();

    for (const root of this.config.watchRoots) {
      const resolved = path.resolve(root.path);
      const key = resolved.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      try {
        const info = await stat(resolved);
        if (info.isDirectory()) out.push({ ...root, path: resolved });
      } catch {
        /* inaccessible */
      }
    }

    return out;
  }

  private enqueue(filePath: string): void {
    this.pending.add(path.resolve(filePath));

    if (this.debounceTimer) clearTimeout(this.debounceTimer);

    this.debounceTimer = setTimeout(() => {
      void this.flush();
    }, this.config.debounceSeconds * 1000);
  }

  private async flush(): Promise<void> {
    if (this.running || this.pending.size === 0) return;
    this.running = true;

    const batch = [...this.pending];
    this.pending.clear();

    try {
      const result = await runArchivistCycle(this.config, {
        dryRun: this.dryRun,
        changedPaths: batch,
      });

      for (const line of result.logs) {
        console.log(line);
      }
      console.log("");
    } catch (err) {
      console.error("ARCHIVIST-0 cycle error:", err instanceof Error ? err.message : err);
    } finally {
      this.running = false;
      if (this.once) this.stop();
    }
  }

  stop(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    for (const w of this.watchers) w.close();
    this.watchers = [];
  }
}
