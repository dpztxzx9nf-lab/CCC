# CCC Operations

This document is the operational handoff for `C:\Projects\CCC`.

## Inventory

- Project: CCC, Continuity Command Center
- Type: Next.js operational projection app plus ARCHIVIST-0 watcher
- GitHub: connected through `origin`
- Deployment target noted by README: `https://ccc.thinkcore.io`
- Development command: `npm run dev`
- Production command: `npm run build`, then `npm run start`
- Default Next.js port: `3000`, unless overridden by CLI options
- PM2 process: `ccc-archivist`
- PM2 ecosystem file: `ecosystem.config.cjs`
- Watcher command: `npm run archivist:watch`

CCC's PM2-managed local process is the archivist watcher. The Next.js web server is not currently defined as a PM2 app in this repository.

## Commands

| Task | Command |
| --- | --- |
| Install dependencies | `npm install` |
| Development server | `npm run dev` |
| Production build | `npm run build` |
| Production server | `npm run start` |
| Lint | `npm run lint` |
| Full verification | `npm run verify` |
| Generate continuity snapshot | `npm run snapshot` |
| Run archivist watcher | `npm run archivist:watch` |
| Archivist dry run | `npm run archivist:watch -- --dry-run` |
| Archivist one-shot | `npm run archivist:watch -- --once` |
| PM2 start archivist | `pm2 start ecosystem.config.cjs` |
| PM2 restart archivist | `pm2 restart ccc-archivist` |
| PM2 logs | `pm2 logs ccc-archivist` |
| Save PM2 process list | `pm2 save` |

## PM2 Layout

`ecosystem.config.cjs` defines:

- name: `ccc-archivist`
- command: `npm run archivist:watch`
- cwd: `C:/Projects/CCC`
- autorestart: enabled
- watch: disabled
- max restarts: `10`

The saved PM2 dump should include `ccc-archivist`. Stale PID files can exist after restarts; use `pm2 status` as the source of truth before cleaning anything.

## Windows Reboot Persistence

CCC expects PM2 resurrection after Windows logon. The repository also contains older Windows helper launchers:

- `start-ccc-archivist.cmd`
- `start-ccc-archivist-hidden.vbs`
- `start-ccc-archivist.js`

Preferred persistence check from a normal user PowerShell session:

```powershell
pm2 status
pm2 save
Get-ScheduledTask | Where-Object {
  ($_.Actions.Execute + ' ' + $_.Actions.Arguments) -match 'pm2' -and
  ($_.Actions.Execute + ' ' + $_.Actions.Arguments) -match 'resurrect'
} | Select-Object TaskName,TaskPath,State
```

Fallback:

```powershell
schtasks /Query /FO LIST /V | Select-String -Pattern 'PM2|pm2|resurrect|ccc|archivist'
```

Do not create duplicate startup mechanisms until the current PM2 resurrect task and helper launchers are understood.

## Verification

Safe checks:

```powershell
cd C:\Projects\CCC
git status --short --branch
npm run lint
npm run test:encoding
npm run test:substrate
npm run test:github-continuity
npm run test:pm2-runtime
npm run test:git-signals
npm run test:kindex-discord
npm run test:historical-continuity
npm run test:history
```

Full verification:

```powershell
npm run verify
```

`npm run verify` includes `npm run build`, which may write `.next/` generated output. `.next/` is ignored and should not be committed.

PM2 checks:

```powershell
pm2 status
pm2 logs ccc-archivist --lines 50
pm2 save
```

If `pm2` is not on PATH in the current shell, verify from the owner's normal PowerShell session.

## Runtime And Generated Artifacts

Do not edit or commit generated/runtime churn unless the task explicitly requires it.

Generated or runtime areas include:

- `.next/`
- `node_modules/`
- `data/telemetry/*.json`
- `data/telemetry/.*.tmp`
- `data/telemetry/.*.bak`

Deployment-visible generated artifacts may include:

- `public/continuity-snapshot.json`
- `public/continuity-events.json`

Only commit those public artifacts when the task explicitly asks for deployable continuity output.

## Do Not Touch Casually

- `ecosystem.config.cjs`
- `start-ccc-archivist.cmd`
- `start-ccc-archivist-hidden.vbs`
- `start-ccc-archivist.js`
- `scripts/archivist-watch.ts`
- `data/projects/registry.json`
- `public/continuity-snapshot.json`
- `public/continuity-events.json`
- PM2 process state and Windows startup tasks

Watcher, PM2, and Windows startup changes can affect operational continuity. Change one mechanism at a time and verify with `pm2 status` and `pm2 save`.

## Current Audit Notes

- Initial worktree status was clean.
- PM2 dump inspection showed `ccc-archivist` saved.
- Live PID files for `ccc-archivist` were present, along with stale older PID files.
- `pm2` may not be available on PATH in sandboxed shells; use the owner's normal PowerShell session for authoritative PM2 checks.
