# Continuity substrate contracts

Phase 0 stabilizes types, snapshot schema versioning, and legacy read compatibility before ingestion unification or manifest migration.

| Document | Purpose |
|----------|---------|
| [contract.md](./contract.md) | Canonical ontology: identity, manifest, signals, attribution, snapshot/events |
| [phase-0.md](./phase-0.md) | What is implemented in code today vs deferred |

**Code:** `src/lib/substrate/` — types and helpers only; no pipeline refactors.

**Writers:** `buildContinuitySnapshot` emits `schemaVersion: 1` and optional `manifestRef` when registry is readable.

**Readers:** `parseContinuitySnapshot` accepts legacy snapshots (no `schemaVersion`) and v1 snapshots; rejects unknown schema versions.
