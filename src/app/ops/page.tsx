import type { Metadata } from "next";
import Link from "next/link";
import "./ops.css";

export const metadata: Metadata = {
  title: "CCC — Backend Dev Portal",
  description:
    "Internal operations reference: Git, Vercel, ARCHIVIST-0, PM2, and local CCC development.",
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

export default function OpsPage() {
  return (
    <div className="ccc-ops-page">
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
            <strong className="text-ccc-text">ccc.thinkcore.io</strong> updates only
            after you push to Git and Vercel deploys.
          </p>
          <nav className="ccc-ops-toc" aria-label="Sections">
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
          <Link href="/" className="ccc-ops-back">
            ← Back to facility
          </Link>
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
            <code className="font-mono text-ccc-text/90">public/continuity-snapshot.json</code>{" "}
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
              <code className="font-mono">autoDeploy=false</code> in archivist config.
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
          <p>Run from the CCC repo root (<code className="font-mono">C:\Projects\CCC</code>).</p>

          <CommandBlock command="npm run dev">
            Start Next.js dev server — facility UI at localhost (hot reload for code).
          </CommandBlock>

          <CommandBlock command="npm run build">
            Production build check. Run before pushing if you changed app code; ARCHIVIST
            can also run build when deploy automation is enabled.
          </CommandBlock>

          <CommandBlock command="npm run snapshot">
            Manually regenerate{" "}
            <code className="font-mono">public/continuity-snapshot.json</code> without
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
          <ul>
            <li>
              <strong>Automatic observation</strong> — watches configured roots (Projects,
              SecondBrain, ARCHIVE, etc.) with debounce (60s).
            </li>
            <li>
              <strong>Automatic snapshot</strong> — when change significance crosses the
              threshold and <code className="font-mono">autoSnapshot=true</code>, writes{" "}
              <code className="font-mono">public/continuity-snapshot.json</code>.
            </li>
            <li>
              <strong>PM2 keeps the watcher alive</strong> — service name{" "}
              <code className="font-mono">ccc-archivist</code> (
              <code className="font-mono">ecosystem.config.cjs</code>).
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
            <code className="font-mono">npm run archivist:watch</code> if needed.
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
            . Runs at user logon for <code className="font-mono">LAPTOP\Brockoozee</code>.
          </p>
          <p>
            Command executed:{" "}
            <code className="font-mono text-ccc-text/90">
              C:\Users\Golf\AppData\Roaming\npm\pm2.cmd resurrect
            </code>{" "}
            (equivalent to <code className="font-mono">pm2 resurrect</code>).
          </p>
          <p>
            After changing which apps PM2 should restore, run{" "}
            <code className="font-mono">pm2 save</code> while the desired services are
            online.
          </p>

          <CommandBlock command='Get-ScheduledTaskInfo -TaskName "PM2 Resurrect On Logon"'>
            Check last run time and result (LastTaskResult 0 = success).
          </CommandBlock>

          <CommandBlock command='schtasks /Run /TN "PM2 Resurrect On Logon"'>
            Test the task without rebooting, then run <code className="font-mono">pm2 list</code>.
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
              <code className="font-mono">ccc-archivist</code> and{" "}
              <code className="font-mono">npm run archivist:watch</code> in a terminal at
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
              If CCC looks stale locally → <code className="font-mono">pm2 list</code>, then
              snapshot age in facility telemetry; if live site stale → Git/Vercel, not PM2.
            </li>
          </ul>
        </section>

        <section className="ccc-ops-section ccc-ops-future" aria-labelledby="future">
          <h2 id="future">8. Future automation notes</h2>
          <p>
            ARCHIVIST already classifies some changes as{" "}
            <strong className="text-ccc-text">deploy-worthy</strong>. When{" "}
            <code className="font-mono">autoDeploy</code> is enabled in the future, the
            agent may automatically commit and push snapshot updates (after build passes
            and cooldown), triggering Vercel deploys without a manual{" "}
            <code className="font-mono">git push</code>.
          </p>
          <p>
            <strong className="text-ccc-text">Current mode:</strong>{" "}
            <code className="font-mono">autoSnapshot=true</code>,{" "}
            <code className="font-mono">autoDeploy=false</code>. CCC observes and snapshots
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
              <code className="font-mono">pm2 restart ccc-archivist</code>
            </li>
            <li>
              <strong>Local facility stale</strong> → telemetry snapshot time;{" "}
              <code className="font-mono">npm run snapshot</code>
            </li>
            <li>
              <strong>Live site stale</strong> → latest Git commit deployed on Vercel?
            </li>
            <li>
              <strong>Services missing after reboot</strong> →{" "}
              <code className="font-mono">pm2 resurrect</code> or check scheduled task
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
