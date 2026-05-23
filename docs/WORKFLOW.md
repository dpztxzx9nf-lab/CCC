# CCC Development Workflow

## Change Approach

- Start by reading the relevant files, docs, data flow, and local naming conventions.
- Keep changes small, scoped, and easy to verify.
- Preserve CCC's role as a continuity visualization and operations projection layer.
- Do not turn CCC into a fake AGI simulator, chatbot wrapper, generic dashboard, or game.
- Keep visible activity grounded in continuity events, scan/snapshot boundaries, telemetry, placement changes, or clearly marked mock/demo data.

## Read Before Edit

- Read `AGENTS.md` and `docs/SYSTEM_MAP.md` before structural or cross-system work.
- Read nearby components, libraries, API routes, and data types before editing.
- Prefer existing architecture and local helpers over new abstractions.
- Do not rename domain concepts unless the task explicitly requires it.

## Build Verification

- After code edits, run:

```bash
npm run verify
```

- `npm run verify` runs:

```bash
npm run lint
npm run test:encoding
npm run test:substrate
npm run build
```

- If verification cannot run, record why and what remains unverified.

## Git Workflow

- Check status before and after edits.
- Do not revert unrelated local changes.
- Stage only files that belong to the approved task.
- Do not commit generated/runtime churn unless explicitly approved.
- Do not commit until the requested verification has run or the gap is clearly documented.

## Runtime Artifact Handling

- Treat `.next`, `node_modules`, telemetry runtime JSON, temp files, and corruption backups as generated/runtime artifacts.
- Do not edit generated/runtime files unless explicitly asked.
- Do not use runtime artifact diffs as proof of intended source changes.
- Keep `data/projects/registry.json` as source-like project registry data unless a task says otherwise.

## Generated Artifact Commits

- Commit generated public artifacts only when the task explicitly requires deployable continuity output.
- `public/continuity-snapshot.json` and `public/continuity-events.json` may be deployment-visible artifacts, so do not ignore or discard them casually.
- If generated artifacts are committed, explain which command produced them and why they belong in the change.

## Safe Deployment Workflow

- Build first with `npm run build`.
- Preview production behavior with `npm run start` when deployment behavior is relevant.
- Use LAN testing only when the task requires device or viewport verification.
- Do not change deployment target, startup helpers, PM2 config, watcher behavior, or Windows launch files without approval.

## PM2 and Watcher Cautions

- `ecosystem.config.cjs` defines the `ccc-archivist` PM2 process.
- `npm run archivist:watch` runs ARCHIVIST-0 in watch mode.
- Watcher, PM2, and Windows startup changes can affect local operational continuity; treat them as deployment/startup behavior.
- Prefer `npm run archivist:watch -- --dry-run` for inspection when writes are not intended.

## Codex/Cursor Editing Behavior

- Read before editing, then make the smallest useful change.
- Do not perform opportunistic refactors.
- Preserve file organization, import style, component naming, and domain language.
- Avoid touching generated/runtime artifacts unless explicitly requested.
- After code edits, run `npm run verify` and report the result.
- If unrelated files are already modified, leave them alone.

## Commit Philosophy

- Commits should be narrow, intentional, and explainable.
- Prefer one coherent task per commit.
- Separate source changes from generated artifact updates unless the generated output is part of the requested deliverable.
- Commit messages should describe operational behavior or developer-facing intent, not cosmetic activity.

## Operational Safety Philosophy

- CCC should show operational reality, not invented activity.
- Ambient facility state can show readiness; bursts should reflect recorded or measurable continuity.
- Maintain the distinction between operational domains, physical chambers, operators, events, snapshots, and telemetry.
- Treat continuity data, substrate contracts, and deployment behavior as high-trust surfaces.
