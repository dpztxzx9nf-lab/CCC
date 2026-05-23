# CCC System Map

## What CCC Is

CCC is the Continuity Command Center: a continuity visualization and operations projection layer for projects, systems, workflows, and goals.

It is not a fake AGI simulator, chatbot wrapper, productivity dashboard, or game. Its visible activity should be grounded in continuity data, snapshot boundaries, events, telemetry, or explicitly marked mock/demo data.

## Core Architecture

- Next.js App Router provides the application shell, pages, and API routes.
- React and TypeScript implement the command center surfaces and operational panels.
- Tailwind CSS and app-level CSS files define the facility visual system.
- Framer Motion supports motion where the UI needs operational or ambient movement.
- Server-side library modules read local continuity, telemetry, registry, snapshot, and event data.
- Client components render the facility, operators, panels, events, residue, signals, and ops portal views.

## Main Runtime Flow

1. `src/app/page.tsx` loads the ops portal bundle on the server.
2. The page renders `CCCProvider` and `CccHomeClient`.
3. Client surfaces request operational state, telemetry, projects, and continuity events through Next.js API routes.
4. API routes read local data, runtime JSON stores, generated public artifacts, and fallback/mock data as needed.
5. Operational projection code merges scan data, snapshots, events, telemetry, operator placement, and sector/domain state into UI-ready views.

## Key Systems

- Facility UI: command center shell, chamber surfaces, operators, rails, panels, and navigation.
- Operational state: derived project, signal, sector/domain, event, heat, and placement views.
- Continuity events: persisted event log used for recent activity, attribution, residue, and discrete bursts.
- Snapshot pipeline: scan roots, build a continuity snapshot, write public snapshot output, and record snapshot events.
- Substrate contracts: schema/versioning and ontology rules for project identity, signals, attribution, snapshots, and events.
- Telemetry: collectors, ingestion, persistence, formatting, and operational telemetry projection.
- Local data scanning: filesystem, Git, markdown, package metadata, PM2, Obsidian, and project scanners.
- Ops portal: operational bundle and `/ops` surface for recent signals, storage stats, and facility telemetry.

## Important Directories

- `src/app` - Next.js pages, API routes, root layout, `/ops`, and app-level CSS.
- `src/components` - CCC UI components, continuity views, operations layers, operators, and ops portal components.
- `src/context` - shared application and surface navigation state.
- `src/data` - mock data, data types, ecology registry, operators, projects, stations, and telemetry seed data.
- `src/lib` - domain logic for archivist, continuity, encoding, local data, operations, telemetry, projects, snapshots, substrate, and persistence.
- `data` - local project registry and telemetry stores.
- `public` - public continuity snapshot and continuity event artifacts.
- `docs` - architecture, substrate, continuity, verification, and operational notes.
- `scripts` - operational script entrypoints, including ARCHIVIST-0 watch.

## Operational Flow

1. Local scan and telemetry systems observe configured project and runtime sources.
2. ARCHIVIST-0 can run continuously, once, or in dry-run mode.
3. Archivist cycles classify changes, consolidate signal meaning, write snapshots, and update continuity events.
4. Runtime API routes read the latest available scan, snapshot, event, registry, and telemetry data.
5. UI projection layers render ambient readiness continuously, but reserve discrete bursts for real continuity events or measurable ingestion boundaries.

## Data Flow

- Registry data starts in `data/projects/registry.json`.
- Telemetry stores live under `data/telemetry`.
- Full continuity snapshots are generated through `npm run snapshot`.
- Public snapshot output is read from `public/continuity-snapshot.json`.
- Public event output is read from `public/continuity-events.json`.
- API routes expose operational state, telemetry, projects, local continuity, and continuity events to the UI.
- Mock data remains available as fallback and should stay visibly distinct from real operational data.

## Continuity/Substrate Relationship

Continuity is the operational memory layer: events, snapshots, scans, telemetry, and derived projection state.

Substrate is the contract layer for continuity data. It defines schema versioning, project identity rules, attribution concepts, normalized signal targets, and snapshot compatibility. Phase 0 currently stabilizes snapshot schema version `1`, legacy snapshot reads, optional manifest references, and types-only normalized signal contracts.

## Runtime vs Generated Artifacts

- Runtime/local stores include files under `data`, especially telemetry and registry JSON.
- Generated public artifacts include `public/continuity-snapshot.json` and `public/continuity-events.json`.
- `.next` and `node_modules` are build/dependency output and should not be edited.
- Do not modify generated or runtime files unless explicitly asked.

## Deployment Model

- Development runs with `npm run dev`.
- Production build runs with `npm run build`.
- Production server runs with `npm run start`.
- README lists the deployment target as `ccc.thinkcore.io`.
- `ecosystem.config.cjs` defines a PM2 app named `ccc-archivist` for running `npm run archivist:watch`.
- Windows startup helper files exist for launching the archivist process.
- Do not change deployment, startup, PM2, watcher, or Windows launch behavior without approval.

## ARCHIVIST-0 Role

ARCHIVIST-0 is the local continuity ingestion and consolidation agent.

It observes scan roots, filters and classifies changes, consolidates continuity signals, writes snapshots, records continuity events, and supports dry-run, one-shot, and continuous watch modes through `npm run archivist:watch`.

## Safety Boundaries

- Read before editing.
- Preserve existing architecture, naming conventions, and domain terms.
- Prefer small, verifiable changes.
- Keep visible activity grounded in continuity events, snapshot/sync boundaries, scan churn, telemetry, or placement changes.
- Do not invent fake operational activity or simulated intelligence.
- Do not modify generated/runtime artifacts without explicit approval.
- Do not change deployment or startup behavior without explicit approval.
- After code edits, run `npm run build`.
