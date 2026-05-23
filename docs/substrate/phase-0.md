# Substrate Phase 0 (implemented)

## In scope

- Contract documentation under `docs/substrate/`
- `CONTINUITY_SNAPSHOT_SCHEMA_VERSION = 1` on new snapshot writes
- Optional `manifestRef` copied from `data/projects/registry.json` at write time
- Optional `scan: { mode: "full" }` on new writes
- `parseContinuitySnapshot` + legacy detection (`isLegacyContinuitySnapshot`)
- Types-only `NormalizedSignal` and attribution policy types (no normalizer yet)
- Unit tests for snapshot parse/validate

## Out of scope (deferred)

- `continuity-manifest.json` v2 migration
- Unified scan roots / ingestion mode refactor
- NormalizedSignal in snapshot `signals[]` (legacy `ContinuitySnapshotSignal` unchanged)
- Event `correlation.snapshotGeneratedAt`
- Operator/sector table deduplication in derivation code
- Rewriting committed `public/continuity-snapshot.json` (upgraded on next `npm run snapshot`)

## Behavior unchanged

- Facility UI, merge rules, operator derivation, archivist cycle thresholds
- Light scan, watch roots, mock fallback
- Existing snapshot field shapes (`projects`, `signals`, `operationalSignals`, etc.)
