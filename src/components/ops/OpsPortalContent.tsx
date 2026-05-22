import { memo } from "react";
import type { ContinuityStorageStats, OpsContinuitySignalRow } from "@/lib/continuity/events/store";
import { compactTelemetryLines } from "@/lib/telemetry/format";
import type { OperationalTelemetry } from "@/lib/telemetry/types";
import type { OpsPortalBundle } from "@/lib/ops/loadOpsPortalBundle";
import { OpsPortalBackControl } from "./OpsPortalBackControl";
import "@/app/ops/ops.css";

export interface OpsPortalContentProps {
  bundle: OpsPortalBundle;
  /** Embedded in gesture carousel vs standalone /ops route */
  embedded?: boolean;
}

function formatSignalTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.length > 16 ? `${iso.slice(0, 10)} ${iso.slice(11, 16)}` : iso;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function truncateSummary(s: string, max = 120): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function formatContinuityBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function formatStorageIso(iso: string | null): string {
  if (!iso) return "—";
  return formatSignalTime(iso);
}

function FacilityTelemetry({ telemetry }: { telemetry: OperationalTelemetry }) {
  const lines = compactTelemetryLines(telemetry);
  return (
    <div className="ccc-ops-storage" aria-labelledby="facility-telemetry">
      <h3 className="ccc-ops-storage__title" id="facility-telemetry">
        Operational Telemetry
      </h3>
      <ul className="ccc-ops-storage__list">
        {lines.map((line) => (
          <li key={line.label}>
            <span className="ccc-ops-storage__k">{line.label}</span>{" "}
            <span className="ccc-ops-storage__v">{line.value}</span>
            {line.hint ? (
              <span className="ccc-ops-storage__hint text-ccc-muted">
                {" "}
                · {line.hint}
              </span>
            ) : null}
          </li>
        ))}
        <li>
          <span className="ccc-ops-storage__k">Collected</span>{" "}
          <span className="ccc-ops-storage__v">
            {formatStorageIso(telemetry.collectedAt)}
          </span>
        </li>
      </ul>
    </div>
  );
}

function ContinuityStorage({ stats }: { stats: ContinuityStorageStats }) {
  const totalRecords = stats.railEventCount + stats.operationalEventCount;
  const eventLine =
    stats.operationalEventCount > 0
      ? `${totalRecords} (${stats.railEventCount} rail · ${stats.operationalEventCount} operational)`
      : `${stats.railEventCount} (rail)`;

  return (
    <div className="ccc-ops-storage" aria-labelledby="continuity-storage">
      <h3 className="ccc-ops-storage__title" id="continuity-storage">
        Continuity Storage
      </h3>
      <ul className="ccc-ops-storage__list">
        <li>
          <span className="ccc-ops-storage__k">continuity-events.json</span>{" "}
          <span className="ccc-ops-storage__v">{formatContinuityBytes(stats.eventsFileBytes)}</span>
        </li>
        <li>
          <span className="ccc-ops-storage__k">continuity-snapshot.json</span>{" "}
          <span className="ccc-ops-storage__v">{formatContinuityBytes(stats.snapshotFileBytes)}</span>
        </li>
        <li>
          <span className="ccc-ops-storage__k">Total (both files)</span>{" "}
          <span className="ccc-ops-storage__v">{formatContinuityBytes(stats.totalBytes)}</span>
        </li>
        <li>
          <span className="ccc-ops-storage__k">Event records</span>{" "}
          <span className="ccc-ops-storage__v">{eventLine}</span>
        </li>
        <li>
          <span className="ccc-ops-storage__k">Log updated</span>{" "}
          <span className="ccc-ops-storage__v">{formatStorageIso(stats.logUpdatedAt)}</span>
        </li>
        <li>
          <span className="ccc-ops-storage__k">Snapshot generated</span>{" "}
          <span className="ccc-ops-storage__v">
            {formatStorageIso(stats.snapshotGeneratedAt)}
          </span>
        </li>
        {stats.snapshotUpdatedAt ? (
          <li>
            <span className="ccc-ops-storage__k">Snapshot updated</span>{" "}
            <span className="ccc-ops-storage__v">
              {formatStorageIso(stats.snapshotUpdatedAt)}
            </span>
          </li>
        ) : null}
      </ul>
    </div>
  );
}

function RecentContinuitySignals({ rows }: { rows: OpsContinuitySignalRow[] }) {
  return (
    <div className="ccc-ops-signals" aria-labelledby="recent-continuity-signals">
      <h3 className="ccc-ops-signals__title" id="recent-continuity-signals">
        Recent Continuity Signals
      </h3>
      <p className="ccc-ops-signals__meta">
        Last 10 rows from <code>public/continuity-events.json</code> (
        <code>operationalEvents ?? events</code>, newest first).
      </p>
      {rows.length === 0 ? (
        <p className="ccc-ops-signals__empty">
          No continuity events in the log yet — archivist idle or JSON missing.
        </p>
      ) : (
        <div className="ccc-ops-signals__scroll">
          <table className="ccc-ops-signals__table">
            <thead>
              <tr>
                <th scope="col">Time</th>
                <th scope="col">Project</th>
                <th scope="col">Sector</th>
                <th scope="col">Meaning</th>
                <th scope="col">Sev</th>
                <th scope="col">Summary</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((ev) => (
                <tr key={ev.id}>
                  <td>{formatSignalTime(ev.timestamp)}</td>
                  <td>{ev.project}</td>
                  <td>{ev.sector}</td>
                  <td>{ev.meaning}</td>
                  <td>{ev.severity}</td>
                  <td>{truncateSummary(ev.summary)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CommandBlock({
  command,
  children,
}: {
  command: string;
  children: React.ReactNode;
}) {
  return (
    <div className="ccc-ops-cmd">
      <pre className="ccc-ops-cmd__code">
        <code>{command}</code>
      </pre>
      <p className="ccc-ops-cmd__desc">{children}</p>
    </div>
  );
}

const SECTIONS = [
  { id: "git-deploy", label: "Git + live deployment" },
  { id: "vercel", label: "Vercel production" },
  { id: "local-dev", label: "CCC local dev" },
  { id: "archivist", label: "ARCHIVIST-0" },
  { id: "pm2", label: "PM2 services" },
  { id: "windows-restore", label: "Windows startup" },
  { id: "safety", label: "Safety / governance" },
  { id: "future", label: "Future automation" },
] as const;

export const OpsPortalContent = memo(function OpsPortalContent({
  bundle,
  embedded = false,
}: OpsPortalContentProps) {
  const { recentSignals, storageStats, facilityTelemetry } = bundle;

  return (
    <div className={`ccc-ops-page${embedded ? " ccc-ops-page--embedded" : ""}`}>
      <div className="ccc-ambience" aria-hidden>
        <div className="ccc-grid" />
      </div>

      <main className="ccc-ops-wrap">
        <header className="ccc-ops-header">
          <p className="ccc-ops-kicker">Internal · backend dev portal</p>
          <h1 className="ccc-ops-title">CCC operations</h1>
          <p className="ccc-ops-lead">
            Operational memory for Continuity Command Center. Nothing here is live
            status — use PM2, Git, and Vercel to see what is actually running.
            Local CCC updates from ARCHIVIST-0;{" "}
            <strong>ccc.thinkcore.io</strong> updates only
            after you push to Git and Vercel deploys.
          </p>
          <nav className="ccc-ops-toc ccc-ops-toc--desktop" aria-label="Sections">
            <p className="ccc-ops-toc__heading">Sections</p>
            <ul>
              {SECTIONS.map((s, i) => (
                <li key={s.id}>
                  <a href={`#${s.id}`}>
                    {i + 1}. {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <nav
            className="ccc-ops-toc ccc-ops-toc--mobile"
            aria-label="Sections"
          >
            <p className="ccc-ops-toc__heading">Sections</p>
            <ul>
              {SECTIONS.map((s, i) => (
                <li key={s.id}>
                  <a href={`#${s.id}`}>
                    {i + 1}. {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <OpsPortalBackControl mode={embedded ? "surface" : "link"} />
        </header>

        <section className="ccc-ops-section" aria-labelledby="git-deploy">
          <h2 id="git-deploy">1. Git + live deployment</h2>
          <p>
            Local file changes — including ARCHIVIST snapshots — do{" "}
            <strong className="text-ccc-text">not</strong> affect{" "}
            <a
              href="https://ccc.thinkcore.io"
              className="text-ccc-accent-dim hover:text-ccc-accent"
              rel="noopener noreferrer"
            >
              ccc.thinkcore.io
            </a>
            . The live site updates after <strong className="text-ccc-text">Git push → Vercel deploy</strong>.
            Use this flow after meaningful CCC changes you want on production.
          </p>

          <CommandBlock command="git status">
            See what changed before commit (snapshot, code, config).
          </CommandBlock>

          <CommandBlock command="git add .">
            Stage all changes. Prefer staging specific paths when the diff is large
            or mixed-purpose.
          </CommandBlock>

          <CommandBlock command='git commit -m "message"'>
            Record a commit with a clear message (e.g. continuity snapshot refresh,
            facility UI, ops docs).
          </CommandBlock>

          <CommandBlock command="git push">
            Push to the remote connected to Vercel. Production rebuilds from the new
            commit when the deploy finishes.
          </CommandBlock>

          <p className="ccc-ops-note">
            Typical publish path: ARCHIVIST updates{" "}
            <code>public/continuity-snapshot.json</code>{" "}
            locally → review in dev → commit → push → confirm deploy on Vercel.
          </p>
        </section>

        <section className="ccc-ops-section" aria-labelledby="vercel">
          <h2 id="vercel">2. Vercel production model</h2>
          <ul>
            <li>
              <strong>ccc.thinkcore.io</strong> is served by Vercel from the Git repo
              linked to this project.
            </li>
            <li>
              If the live site looks stale, check whether the{" "}
              <strong>latest commit actually deployed</strong> (Vercel dashboard or
              deploy log), not only whether your local snapshot is fresh.
            </li>
            <li>
              <strong>ARCHIVIST-0 does not auto-push</strong> because{" "}
              <code>autoDeploy=false</code> in archivist config.
              Publishing stays manual even when changes are “deploy-worthy.”
            </li>
          </ul>
          <p>
            Local and production are two surfaces: same app, different snapshot/build
            until you push.
          </p>
        </section>

        <section className="ccc-ops-section" aria-labelledby="local-dev">
          <h2 id="local-dev">3. CCC local dev</h2>
          <p>
            Run from the CCC repo root (<code>C:\Projects\CCC</code>).
          </p>

          <CommandBlock command="npm run dev">
            Start Next.js dev server — facility UI at localhost (hot reload for code).
          </CommandBlock>

          <CommandBlock command="npm run build">
            Production build check. Run before pushing if you changed app code; ARCHIVIST
            can also run build when deploy automation is enabled.
          </CommandBlock>

          <CommandBlock command="npm run snapshot">
            Manually regenerate{" "}
            <code>public/continuity-snapshot.json</code> without
            waiting for the watcher (full scan of configured roots).
          </CommandBlock>

          <CommandBlock command="npm run archivist:watch">
            Run ARCHIVIST-0 in the foreground. Use when PM2 is off or debugging. Do not
            run alongside <strong>ccc-archivist</strong> in PM2.
          </CommandBlock>
        </section>

        <section className="ccc-ops-section" aria-labelledby="archivist">
          <h2 id="archivist">4. ARCHIVIST-0 automation</h2>
          <p>
            ARCHIVIST-0 is the local consolidation agent (operator projection: deep sector /
            ARCHIVIST). It keeps CCC aligned with your filesystem without you remembering
            scan commands.
          </p>
          <p>
            <strong className="text-ccc-text">Ingestion → projection chain</strong> —
            raw filesystem activity is normalized into typed{" "}
            <code>OperationalEvent</code> records (severity, sector,
            semantics) appended under{" "}
            <code>operationalEvents</code> in{" "}
            <code>public/continuity-events.json</code>, alongside the
            continuity rail log. Heuristic significance and semantic passes live in{" "}
            <code>src/lib/operations/</code> (no AI APIs). When{" "}
            <code>continuity-snapshot.json</code> regenerates, it
            carries <code>eventsRecent</code>,{" "}
            <code>sectorPressure</code>,{" "}
            <code>projectMomentum</code>, dormant/active project ids,
            milestones, and last significant signal; sector heat blends that pressure with
            scanned project signals so the facility stays quiet unless reality says
            otherwise.
          </p>
          <ul>
            <li>
              <strong>Automatic observation</strong> — watches configured roots (Projects,
              SecondBrain, ARCHIVE, etc.) with debounce (60s).
            </li>
            <li>
              <strong>Automatic snapshot</strong> — when change significance crosses the
              threshold and <code>autoSnapshot=true</code>, writes{" "}
              <code>public/continuity-snapshot.json</code>.
            </li>
            <li>
              <strong>PM2 keeps the watcher alive</strong> — service name{" "}
              <code>ccc-archivist</code> (
              <code>ecosystem.config.cjs</code>).
            </li>
            <li>
              <strong>autoDeploy disabled</strong> — no automatic git commit/push; live
              site publishing remains your decision.
            </li>
          </ul>
          <p>
            <strong className="text-ccc-text">Daily default:</strong> work in Obsidian and
            projects normally; open local CCC to view the projection. Intervene only when
            something looks wrong.
          </p>

          <FacilityTelemetry telemetry={facilityTelemetry} />
          <ContinuityStorage stats={storageStats} />

          <RecentContinuitySignals rows={recentSignals} />
        </section>

        <section className="ccc-ops-section" aria-labelledby="pm2">
          <h2 id="pm2">5. PM2 services</h2>
          <p>Two services matter for CCC operations on this machine:</p>
          <ul>
            <li>
              <strong>liahona</strong> — separate app (not ARCHIVIST).
            </li>
            <li>
              <strong>ccc-archivist</strong> — ARCHIVIST-0 watcher for CCC continuity.
            </li>
          </ul>

          <CommandBlock command="pm2 list">
            See running services and status (online / stopped / restarts).
          </CommandBlock>

          <CommandBlock command="pm2 logs ccc-archivist">
            Inspect ARCHIVIST-0 logs. On Windows, PM2 may show empty logs when npm runs
            through cmd.exe — confirm with a manual{" "}
            <code>npm run archivist:watch</code> if needed.
          </CommandBlock>

          <CommandBlock command="pm2 restart ccc-archivist">
            Restart ARCHIVIST-0 watcher only.
          </CommandBlock>

          <CommandBlock command="pm2 logs liahona">
            Inspect Liahona service logs.
          </CommandBlock>

          <CommandBlock command="pm2 restart liahona">
            Restart Liahona only.
          </CommandBlock>

          <CommandBlock command="pm2 save">
            Persist current process list for reboot / login restore.
          </CommandBlock>

          <CommandBlock command="pm2 resurrect">
            Manually restore saved PM2 processes (same action as the login task).
          </CommandBlock>
        </section>

        <section className="ccc-ops-section" aria-labelledby="windows-restore">
          <h2 id="windows-restore">6. Windows startup restore</h2>
          <p>
            Scheduled task: <strong className="text-ccc-text">PM2 Resurrect On Logon</strong>
            . Runs at user logon for <code>LAPTOP\Brockoozee</code>.
          </p>
          <p>
            Command executed:{" "}
            <code>C:\Users\Golf\AppData\Roaming\npm\pm2.cmd resurrect</code>{" "}
            (equivalent to <code>pm2 resurrect</code>).
          </p>
          <p>
            After changing which apps PM2 should restore, run{" "}
            <code>pm2 save</code> while the desired services are
            online.
          </p>

          <CommandBlock command='Get-ScheduledTaskInfo -TaskName "PM2 Resurrect On Logon"'>
            Check last run time and result (LastTaskResult 0 = success).
          </CommandBlock>

          <CommandBlock command='schtasks /Run /TN "PM2 Resurrect On Logon"'>
            Test the task without rebooting, then run <code>pm2 list</code>.
          </CommandBlock>
        </section>

        <section
          className="ccc-ops-section ccc-ops-rules"
          aria-labelledby="safety"
        >
          <h2 id="safety">7. Safety / governance</h2>
          <ul>
            <li>
              <strong>One archivist watcher</strong> — never PM2{" "}
              <code>ccc-archivist</code> and{" "}
              <code>npm run archivist:watch</code> in a terminal at
              the same time.
            </li>
            <li>
              <strong>Do not enable autoDeploy casually</strong> — it can commit/push
              snapshot changes when significance is deploy-worthy and build passes.
            </li>
            <li>
              <strong>Commit before risky changes</strong> — especially archivist config,
              ecosystem, or scanner roots.
            </li>
            <li>
              <strong>Push meaningful milestones</strong> — not every local snapshot twitch;
              production should reflect deliberate releases.
            </li>
            <li>
              <strong>pm2 save after PM2 app changes</strong> — add/remove/rename apps so login
              restore matches intent.
            </li>
            <li>
              If CCC looks stale locally → <code>pm2 list</code>, then
              snapshot age in facility telemetry; if live site stale → Git/Vercel, not PM2.
            </li>
          </ul>
        </section>

        <section className="ccc-ops-section ccc-ops-future" aria-labelledby="future">
          <h2 id="future">8. Future automation notes</h2>
          <p>
            ARCHIVIST already classifies some changes as{" "}
            <strong className="text-ccc-text">deploy-worthy</strong>. When{" "}
            <code>autoDeploy</code> is enabled in the future, the
            agent may automatically commit and push snapshot updates (after build passes
            and cooldown), triggering Vercel deploys without a manual{" "}
            <code>git push</code>.
          </p>
          <p>
            <strong className="text-ccc-text">Current mode:</strong>{" "}
            <code>autoSnapshot=true</code>,{" "}
            <code>autoDeploy=false</code>. CCC observes and snapshots
            automatically; live publishing on ccc.thinkcore.io remains manually governed.
          </p>
        </section>

        <section
          className="ccc-ops-section ccc-ops-trouble"
          aria-labelledby="troubleshooting"
        >
          <h2 id="troubleshooting">Quick troubleshooting</h2>
          <ul>
            <li>
              <strong>ccc-archivist offline</strong> →{" "}
              <code>pm2 restart ccc-archivist</code>
            </li>
            <li>
              <strong>Local facility stale</strong> → telemetry snapshot time;{" "}
              <code>npm run snapshot</code>
            </li>
            <li>
              <strong>Live site stale</strong> → latest Git commit deployed on Vercel?
            </li>
            <li>
              <strong>Services missing after reboot</strong> →{" "}
              <code>pm2 resurrect</code> or check scheduled task
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
});
