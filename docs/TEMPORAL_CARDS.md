# Temporal Cards

## Core Concept

ThinkCore/CCC is a temporal operating system for builders. The signature interaction is not a static dashboard or folder tree; it is the ability to scrub through operational history and watch projects, cards, runtime signals, notes, failures, and wins change over time.

The product should make the user feel that their engineering progression is replayable. CCC becomes the place where work is remembered as a living sequence of decisions, system changes, recoveries, and outcomes.

## Card, Deck, And Timeline Model

A card is a temporal container. It represents a project surface, workflow, system, lesson, artifact, or operating thread, and it owns a local timeline of markers.

A deck is a larger temporal container. It groups cards into an era, campaign, arc, or collection of related work. Decks can also own their own timeline markers that describe major transitions across the whole arc.

A project can contain decks and cards, with its own project-level timeline. The workspace has a global timeline above everything. Global time can synchronize all nested timelines, while future versions may allow cards or decks to be scrubbed independently.

Markers are meaningful moments on any timeline. Early marker types include commits, deployments, PM2/runtime changes, screenshots, notes, failures, recoveries, infrastructure changes, monetization attempts, and wins.

## Why This Is The Signature CCC Interaction

CCC is about continuity. A conventional dashboard shows what is true now, but CCC should show how the current state came to exist.

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

The immediate prototype should stay simple. Its job is to prove that scrubbing time across nested cards feels obvious, useful, and emotionally tied to becoming a better engineer/operator.
