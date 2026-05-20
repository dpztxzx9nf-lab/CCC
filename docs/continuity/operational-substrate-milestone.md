# Operational substrate milestone

**Scope:** Recent transition of CCC from decorative operational simulation to continuity-derived state.  
**Audience:** Engineering continuity; not product marketing or narrative canon.

---

## What changed

CCC’s “live” layer is no longer driven primarily by heat scores, static routes, and perpetual UI motion. It is **gated on and attributed to** persisted continuity data, scan/snapshot boundaries, and ecological placement—while **ambient** layers (anchors, residue topology, chamber embodiment) remain visibly present without implying false work.

Concrete outcomes:

| Area | Before (approx.) | After |
|------|------------------|--------|
| Operational meaning | Conflated domains, physical space, and operators; continuous packet/route theater | **Domains** (abstract work), **chambers** (megastructure locations), **operators** (placement + home + domain) are typed and resolved separately |
| Pulses & packets | Often always-on or heat-adjacent | **Event windows** with decay; discrete visuals only when continuity events, snapshot/sync boundaries, scan churn, or placement deltas justify them |
| Transit / signals | Overlapping semantics | **Live transit** (placement window), **historic residue** (worn paths from events), **signal routes** (event-attributed comms geometry), **anchors** (static topology) are visually distinct |
| HUD | Chamber indicator nodes duplicated megastructure state | **Removed**; facility graph is the primary read surface |
| Ground truth | Mock-friendly implied activity | **ARCHIVIST-0** path + **continuity-events** log + operational merge; mock seed stays quiet unless real events/snapshots land |

---

## Why it mattered

- **Truthfulness:** Animated “activity” without a continuity event trains users to ignore the facility. Idle must read as intentional.
- **Legibility:** Domains vs chambers vs operators were partially merged; that caused wrong mental models for heat, routing, and occupancy.
- **Maintainability:** One pipeline (events + snapshot + placement) is easier to reason about than parallel simulated and “real” behaviors.

---

## Conceptual corrections

1. **Domains are not places.** They classify responsibility, heat, and event attribution—not grid cells.
2. **Chambers are not workflow buckets.** They are spatial cells: codename, grid, residue, transit endpoints.
3. **Operators belong to domains** and **occupy chambers**; current chamber may differ from home during real workload-driven resolution.
4. **Ambient ≠ operational burst.** Faint glow, residue, anchor hum = infrastructure **readiness**. Packets, animated beads, event-tied routes = **discrete** responses to recorded or measured change.
5. **Key realization:** CCC **stopped simulating operational life** and **started deriving** visible operational behavior from **real continuity systems** (event log, snapshot metadata, non-mock scan transitions, placement signature changes).

---

## What infrastructure now exists

### Persistence & automation

- **ARCHIVIST-0:** Local continuity ingestion and snapshot path integrated into the operational merge; events and snapshot meta participate in facility state.
- **Windows / PM2:** Ecosystem and logon-oriented **resurrection** so archivist/watch processes can align with host boot expectations (operational detail in repo config, not repeated here).

### Continuity events

- **continuity-events** architecture: schema, persistence (e.g. `public/continuity-events.json`), pipeline from archivist cycle / snapshot flows, API exposure, and client consumption for rails and **discrete burst** timing.
- Events carry **kinds**, **sectors (domains)**, **operators**, **timestamps**, and **importance**—used for attribution, not flavor text.

### Event-driven operational pulses

- **Discrete activity windows:** Per-event end times (importance + kind tail), plus bounded tails for snapshot generation and (non-mock) scan `scannedAt` changes, and short **placement** windows when chamber assignment actually changes.
- **Mock + zero events:** Discrete motion/packets suppressed so the demo does not fake a busy floor.

### Environmental residue

- **Sector/chamber memory:** Pressure, glow, warmth, flicker, etc. derived from events + merged heat—not from invented route spam.
- **Transit memory:** Historically weighted chamber-pair wear; live-route boosting from simulated topology removed in favor of event-grounded buildup.

### Ontology separation (data layer)

- **Operational domains:** e.g. core, forge, archive, relay, runtime, observatory—heat, classifications, continuity weights.
- **Physical chambers:** e.g. Nexus Prime, Deep Stack, Foundry—grid areas, anchors, occupancy grouping.
- **Operators:** Primary domain, home chamber, resolved current chamber and transit flags via **ecology registry** + **`resolveOperatorPlacement`**.

### UI / embodiment

- **Decorative HUD:** Top chamber indicator strip **removed**; megastructure + chambers carry state.
- **Visual language:** Documented layering (historic residue, anchors, live transit, signal flicker, operator embodiment) to reduce ambiguous overlap—not a second dashboard.

---

## Continuity stance (single line)

**Operational projection is anchored on recorded continuity and measurable ingestion boundaries; ambience shows the facility exists, bursts show something actually happened.**
