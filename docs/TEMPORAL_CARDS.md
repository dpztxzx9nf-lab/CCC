# Temporal Cards

## Core Concept

ThinkCore is the public identity, ecosystem shell, and philosophy. CCC is the cockpit: the actual operating workspace where the builder works, reviews state, and replays history. Projects are modular systems inside CCC, not equal products beside it.

CCC is a temporal operating system for builders. The signature interaction is not a static dashboard, note app, folder tree, or generic AI workspace; it is the ability to scrub through operational history and watch projects, cards, runtime signals, notes, failures, and wins change over time.

The product should make the user feel that their engineering progression is replayable. CCC becomes the place where work is remembered as a living sequence of decisions, system changes, recoveries, and outcomes.

## Past, Present, And Future

CCC should keep three temporal layers visible:

- Past: operational memory. This is the replayable record of snapshots, commits, failures, recoveries, deployments, notes, wins, screenshots, and infrastructure changes.
- Present: current mode and context. This tells the user what kind of work the cockpit believes is happening now.
- Future: suggested architecture, missions, and next actions. This turns the replay into direction instead of passive history.

The timeline primarily explains the past. Present Mode explains the current operating stance. Temporal Copilot points forward by interpreting the selected history and recommending what should happen next.

## Present Mode

Present Mode is the cockpit's current operational stance. Initial mocked modes are IDLE, BUILD, DEPLOY, RESEARCH, DESIGN, RECOVERY, EXPLORATION, CONTENT, and ARCHITECTURE.

The mode indicator should be visible at a glance and scoped to the current context. It is not a status badge for the whole app; it is a lightweight answer to "what kind of work is CCC helping me do right now?"

## Temporal Copilot

Temporal Copilot is an embedded operational navigator. It should not feel like a generic chatbot or open-ended assistant. Its job is to interpret operational history and connect it to action.

The copilot should explain what the selected timeline moment means, detect patterns from past events, and recommend whether something should become official, be archived, be hidden as noise, or be turned into a deck.

Core mocked sections:

- Current Mode: mode label, short description, and active scope.
- Past Signal: what the selected snapshot reveals.
- Future Vector: the suggested next action.
- Copilot Actions: summarize era, propose next mission, mark official, hide noise, and create deck.

The copilot interprets CCC history because CCC sits above Git. Git can explain what changed technically; the copilot should explain what the change means operationally and what the builder should do next.

## Card, Deck, And Timeline Model

A card is a temporal container. It represents a project surface, workflow, system, lesson, artifact, or operating thread, and it owns a local timeline of markers.

A deck is a larger temporal container. It groups cards into an era, campaign, arc, operational journey, or learning track. Decks can also own their own timeline markers that describe major transitions across the whole arc. Decks are not folders.

A project can contain decks and cards, with its own project-level timeline. The workspace has a global timeline above everything. Global time can synchronize all nested timelines, while future versions may allow cards or decks to be scrubbed independently.

Markers are meaningful moments on any timeline. Early marker types include commits, deployments, PM2/runtime changes, screenshots, notes, failures, recoveries, infrastructure changes, monetization attempts, wins, and operational noise artifacts that can be hidden from the visual timeline.

## Navigation Model

The interstellar model is structural, not decorative:

- Galaxy View: the whole workspace and all project systems.
- System View: one project, deck, arc, or campaign.
- Planet View: one temporal card.
- Orbit Timeline: the evolution of the selected card.
- Event Markers: commits, wins, deploys, failures, PM2 status, screenshots, notes, and infrastructure changes.
- Control Panel: actions on the selected scope.

The intended feeling is a navigable universe of projects through time. Scale, orbit, and depth should help the user understand nested timelines; they should not become visual noise.

## Why This Is The Signature CCC Interaction

CCC is about continuity. A conventional dashboard shows what is true now, but CCC should show how the current state came to exist.

GitHub is technical history: what changed. CCC is human-operational history: why it mattered, what era it belonged to, what was learned, whether it became official, and how it affected the broader system.

Nested temporal cards combine the strongest parts of several familiar systems:

- Obsidian-style relationship thinking.
- Git history and commit-level causality.
- Video-editor scrubbing and replay.
- Game progression through arcs and milestones.
- Operational observability across runtime, deploys, and infrastructure.

This makes CCC distinct: the user can inspect a system, then scrub backward to see when it changed, why it changed, what broke, what recovered, and what was learned.

## Future Real Integrations

The mock should eventually connect to real operational sources:

- Git: commits, branches, diffs, authorship, major refactors, resets, and release points.
- PM2: process status, restarts, uptime, logs, watcher state, and runtime failures.
- Screenshots: visual snapshots of product surfaces at key moments.
- Notes: continuity entries, daily notes, architectural decisions, lessons, and plans.
- Deployments: first deploys, production tunnels, Vercel builds, failed builds, rollbacks, and environment changes.
- Wins: shipped milestones, monetization attempts, product discoveries, recovered systems, and skill breakthroughs.

Future actions should operate on the selected scope:

- Archive snapshot.
- Delete or remove an artifact from CCC tracking.
- Mark a snapshot as official.
- Promote an event to a milestone.
- Revert to a previous snapshot.
- Create a deck from this era.
- Push or publish the current state.
- Hide noisy or generated files from the visual timeline.

The immediate prototype should stay simple. Its job is to prove that scrubbing time across nested cards feels obvious, useful, and emotionally tied to becoming a better engineer/operator.
