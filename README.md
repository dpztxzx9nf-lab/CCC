# CCC — Continuity Command Center

Living operational projection layer for projects, systems, workflows, and goals.

**Deployment target:** [ccc.thinkcore.io](https://ccc.thinkcore.io)

## Operational summary

| Item | Value |
| --- | --- |
| Development command | `npm run dev` |
| Production command | `npm run build`, then `npm run start` |
| Default Next.js port | `3000`, unless overridden by Next.js CLI options |
| Primary PM2 process | `ccc-archivist` |
| PM2 ecosystem file | `ecosystem.config.cjs` |
| Watcher command | `npm run archivist:watch` |
| Full verification | `npm run verify` |

CCC's PM2-managed local process is the ARCHIVIST-0 watcher, not the Next.js web server. Use `docs/OPERATIONS.md` for PM2 persistence, Windows reboot restoration, verification commands, and handoff notes.

## Stack

- Next.js (App Router)
- React + TypeScript
- Tailwind CSS
- Framer Motion

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Local network testing (iPhone / LAN)

Run the dev server bound to all interfaces so phones on the same Wi‑Fi can connect:

```bash
npm run dev -- --host 0.0.0.0
```

Then on your iPhone (Safari), open:

`http://<your-pc-lan-ip>:3000`

Find your PC IP with `ipconfig` (Windows) or your system network settings. Use portrait and landscape to verify panels, touch targets, and bottom-sheet behavior.

Production preview on LAN:

```bash
npm run build
npm run start -- --host 0.0.0.0
```

## Build

```bash
npm run build
npm run start
```

## Architecture

- **`src/data/`** — Types and mock data (future JSON/Markdown loaders implement `CCCDataSource`)
- **`src/lib/data-source.ts`** — Data fetch/cache; UI stays decoupled
- **`src/components/ccc/`** — Command center UI

Mock telemetry and ecosystem metrics are labeled **MOCK / DEMO** in the interface. No APIs or local filesystem paths are connected in v0.1.

## Sectors

Core · Archive · Forge · Observatory · Relay · Runtime

## License

Private — ThinkCore continuity stack.
