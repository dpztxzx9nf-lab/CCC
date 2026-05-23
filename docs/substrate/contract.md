# Substrate contract (reference)

Engineering reference for CCC continuity ontology. Phase 0 encodes snapshot versioning and types; other sections are normative targets for later phases.

## 1. Canonical project identity

| Field | Rule |
|-------|------|
| `projectId` | Primary key — stable kebab id (`ccc`, `thinkcore`) |
| `localSlug` | Light-scan match key; not a second id |
| `scanKeys` | Heavy-scan / path-derived aliases (manifest v2) |
| `linkedPaths` | Authoritative filesystem roots per project |

All derived outputs must resolve to `projectId` before heat/events. Unmapped scan rows stay diagnostic-only.

## 2. Manifest schema (target v2)

Evolves from `data/projects/registry.json` (`schemaVersion: 1` today).

```ts
ContinuityManifest {
  manifestSchemaVersion: 2;
  updatedAt: string;
  projects: ManifestProject[];
  scanPolicy: ScanPolicy;
}
```

Per-project `ingest: { light, full, watch }` and `domainPolicy: manifest | scan-wins | manifest-wins`.

## 3. Normalized signal (types only in Phase 0)

```ts
NormalizedSignal {
  id: string;
  observedAt: string;
  projectId: string | null;
  source: SignalSource;
  type: string;
  severity: "info" | "low" | "medium" | "high";
  weight: number;
  activityKind: ActivityKind;
  evidence: Record<string, string | number | boolean>;
}
```

Sector projection is derived via `SignalSectorProjection` — not stored on the signal in Phase 0.

## 4. Operator attribution (target)

Single `sectorOwnership: Record<OperationalDomainId, OperatorId[]>` used for events and snapshot operators. Project defaults from `manifest.operatorIds`. Fallback operator: `deep-1` only when no sector and no project match.

## 5. Sector attribution (target)

**Operational domain** = work classification (heat, events). **Physical chamber** = spatial placement. `SectorId` aliases `OperationalDomainId` during migration.

## 6. Continuity snapshot schema

| Field | Phase 0 |
|-------|---------|
| `schemaVersion` | `1` on write; omitted = legacy read |
| `manifestRef` | `{ manifestSchemaVersion, manifestUpdatedAt }` from registry at write |
| `scan` | `{ mode: "full" }` on write |
| Legacy fields | `projects`, `signals`, `operationalSignals`, … unchanged |

Unsupported `schemaVersion` values are rejected on read.

## 7. Event / snapshot relationship (target)

- Events = durable memory; snapshot = projection at `generatedAt`
- `snapshot_refresh` events should correlate to `snapshotGeneratedAt` (Phase 1+)

## 8. Ingestion modes (target)

| Mode | Output |
|------|--------|
| light | `OperationalSnapshot` (API, shallow) |
| full | `continuity-snapshot.json` |
| watch | `continuity-events.json` deltas |

Single `ScanPolicy.roots` with per-mode flags — not divergent path lists.
