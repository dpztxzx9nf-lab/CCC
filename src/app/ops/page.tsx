import type { Metadata } from "next";
import Link from "next/link";
import "./ops.css";

export const metadata: Metadata = {
  title: "CCC — Operations",
  description: "Private operations reference for CCC local services and ARCHIVIST-0.",
  robots: { index: false, follow: false },
};

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

export default function OpsPage() {
  return (
    <div className="ccc-ops-page">
      <div className="ccc-ambience" aria-hidden>
        <div className="ccc-grid" />
      </div>

      <main className="ccc-ops-wrap">
        <header className="ccc-ops-header">
          <p className="ccc-ops-kicker">Internal reference</p>
          <h1 className="ccc-ops-title">CCC operations</h1>
          <p className="ccc-ops-lead">
            How to run, inspect, and restart CCC local services. This page is a
            dev-portal manual — not live status. Check PM2 and snapshots for
            what is actually running.
          </p>
          <Link href="/" className="ccc-ops-back">
            ← Back to facility
          </Link>
        </header>

        <section className="ccc-ops-section" aria-labelledby="ops-status">
          <h2 id="ops-status">1. System status</h2>
          <p>CCC depends on two PM2-managed services on your Windows machine:</p>
          <ul>
            <li>
              <strong>liahona</strong> — PM2 service for the Liahona app (separate
              project; not ARCHIVIST).
            </li>
            <li>
              <strong>ccc-archivist</strong> — PM2 service running ARCHIVIST-0
              (<code className="font-mono text-ccc-text/90">npm run archivist:watch</code>
              ). Watches project roots and updates the continuity snapshot for CCC.
            </li>
          </ul>
          <p>
            On Windows login, the scheduled task{" "}
            <strong className="text-ccc-text">PM2 Resurrect On Logon</strong> runs{" "}
            <code className="font-mono text-ccc-text/90">pm2 resurrect</code> to
            restore whatever was last saved with <code className="font-mono">pm2 save</code>.
          </p>
        </section>

        <section className="ccc-ops-section" aria-labelledby="ops-daily">
          <h2 id="ops-daily">2. Daily usage</h2>
          <p>
            <strong className="text-ccc-text">Normally, do nothing.</strong> Work in
            Obsidian and your project folders as usual. ARCHIVIST-0 watches those
            roots, debounces changes, and refreshes{" "}
            <code className="font-mono text-ccc-text/90">continuity-snapshot.json</code>{" "}
            so CCC stays aligned with local work.
          </p>
          <p>
            Open CCC in the browser to see the facility projection. You only need
            the commands below when something looks wrong or you changed PM2 setup.
          </p>
        </section>

        <section className="ccc-ops-section" aria-labelledby="ops-commands">
          <h2 id="ops-commands">3. Essential commands</h2>

          <CommandBlock command="pm2 list">
            See which PM2 services are running (liahona, ccc-archivist, others).
          </CommandBlock>

          <CommandBlock command="pm2 logs ccc-archivist">
            Inspect ARCHIVIST-0 watcher logs. On Windows, logs may be empty when
            npm runs through cmd.exe — if so, use a manual run to confirm output.
          </CommandBlock>

          <CommandBlock command="pm2 restart ccc-archivist">
            Restart the ARCHIVIST-0 watcher service only.
          </CommandBlock>

          <CommandBlock command="pm2 logs liahona">
            Inspect Liahona service logs.
          </CommandBlock>

          <CommandBlock command="pm2 restart liahona">
            Restart the Liahona service only.
          </CommandBlock>

          <CommandBlock command="pm2 save">
            Save the current PM2 process list so reboot / login restore knows what
            to bring back.
          </CommandBlock>

          <CommandBlock command="pm2 resurrect">
            Manually restore saved PM2 services (same as the login scheduled task).
          </CommandBlock>

          <CommandBlock command='Get-ScheduledTaskInfo -TaskName "PM2 Resurrect On Logon"'>
            Check whether the Windows login restore task ran and its last result
            (0 = success).
          </CommandBlock>

          <CommandBlock command="npm run snapshot">
            Manually regenerate{" "}
            <code className="font-mono">public/continuity-snapshot.json</code> without
            waiting for the watcher.
          </CommandBlock>

          <CommandBlock command="npm run archivist:watch">
            Run ARCHIVIST-0 in the foreground when PM2 is not used. Stop this
            before relying on the PM2 service — do not run both.
          </CommandBlock>
        </section>

        <section
          className="ccc-ops-section ccc-ops-rules"
          aria-labelledby="ops-safety"
        >
          <h2 id="ops-safety">4. Safety rules</h2>
          <ul>
            <li>
              Do not run multiple archivist watchers at once (PM2{" "}
              <strong>ccc-archivist</strong> plus{" "}
              <code className="font-mono">npm run archivist:watch</code> in a
              terminal).
            </li>
            <li>Run <code className="font-mono">pm2 save</code> after adding, removing, or renaming PM2 apps.</li>
            <li>
              Do not enable ARCHIVIST autoDeploy until you intend automated deploys
              (it is off by default in archivist config).
            </li>
            <li>
              If CCC looks stale, check <code className="font-mono">pm2 list</code>{" "}
              first, then snapshot age in the facility telemetry strip.
            </li>
          </ul>
        </section>

        <section
          className="ccc-ops-section ccc-ops-trouble"
          aria-labelledby="ops-trouble"
        >
          <h2 id="ops-trouble">5. Troubleshooting</h2>
          <ul>
            <li>
              <strong>ccc-archivist offline</strong> →{" "}
              <code className="font-mono">pm2 restart ccc-archivist</code>
            </li>
            <li>
              <strong>Site / facility looks stale</strong> → check snapshot timestamp
              in telemetry; run <code className="font-mono">npm run snapshot</code> if
              needed
            </li>
            <li>
              <strong>After reboot, services missing</strong> →{" "}
              <code className="font-mono">pm2 resurrect</code>, then confirm with{" "}
              <code className="font-mono">pm2 list</code>
            </li>
            <li>
              <strong>PM2 login restore issue</strong> → verify scheduled task{" "}
              <em>PM2 Resurrect On Logon</em> with{" "}
              <code className="font-mono">Get-ScheduledTaskInfo</code>; ensure you ran{" "}
              <code className="font-mono">pm2 save</code> when the desired apps were up
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
