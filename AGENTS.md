# AGENTS.md

## Project Identity

CCC means Continuity Command Center.

CCC is not a fake AGI simulator, chatbot wrapper, productivity dashboard, or game. It is a continuity visualization and operations projection layer for projects, systems, workflows, and goals.

## Operating Rules

- Read before editing. Understand the relevant files, local patterns, and data flow before making changes.
- Preserve the existing architecture, naming conventions, visual language, and domain terms.
- Prefer small, verifiable changes over broad refactors.
- Do not modify generated or runtime files unless explicitly asked.
- Do not change deployment, startup, PM2, watcher, or Windows launch behavior without approval.
- Keep UI and data behavior grounded in continuity signals and operational projection. Do not introduce fake activity or simulated intelligence unless explicitly requested.
- After code edits, run `npm run build`.

## Key Commands

- `npm install` - install dependencies.
- `npm run dev` - start the Next.js development server.
- `npm run build` - create a production build.
- `npm run start` - start the production server.
- `npm run lint` - run ESLint.
- `npm run snapshot` - generate the continuity snapshot.
- `npm run test:encoding` - run encoding tests.
- `npm run test:substrate` - run substrate snapshot tests.
- `npm run archivist:watch` - run the ARCHIVIST-0 watcher.

## Important Folders

- `src/app` - Next.js App Router pages, API routes, and app-level styles.
- `src/components` - UI surfaces, panels, operators, continuity, and operations components.
- `src/lib` - core continuity, operations, telemetry, snapshot, substrate, archivist, and local data logic.
- `data` - local project registry and telemetry stores.
- `public` - public continuity snapshot and event artifacts.
- `docs` - architecture, substrate, continuity, and verification notes.
- `scripts` - operational scripts such as the archivist watcher entrypoint.
