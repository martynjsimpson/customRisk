# ADR-0004 — Configuration Version Storage: Hybrid Snapshot Model

**Status:** Accepted  
**Date:** 2026-05-07  
**Applies to:** Custom Risk — post-MVP configuration lifecycle (PM4-01 to PM4-11)  
**Related documents:** PM0-02 Data Model Extension Plan, `docs/planning/phases/phase-04-config-lifecycle.md` (PM4-01 notes)

---

## 1. Context

Phase 4 introduces draft/publish versioning for register configuration. A register's configuration covers custom field definitions, dropdown options, likelihood values, impact values, risk levels, the risk matrix, and response strategies — currently spread across eight relational tables.

When a Register Admin edits configuration, those changes must not affect live risk forms until explicitly published. The product also needs:

- a historical record of what the configuration looked like at each publish point;
- impact analysis comparing the proposed draft to the current live configuration;
- an immutable snapshot per published version for audit and potential rollback;
- a natural storage format for reusable register templates (Phase 4, PM4-08 to PM4-11).

Two options were initially documented in PM0-02. A third hybrid approach was subsequently identified and accepted.

---

## 2. Decision

Use a **hybrid model**: relational tables hold the live published configuration; a JSON snapshot column on the version record holds draft and historical state.

**Schema additions:**

A `register_config_version` table:

```prisma
model RegisterConfigVersion {
  id              String              @id @default(uuid())
  registerId      String
  register        Register            @relation(fields: [registerId], references: [id])
  versionNumber   Int
  status          ConfigVersionStatus // DRAFT | PUBLISHED
  snapshotJson    Json                // complete config snapshot at this version
  createdByUserId String
  createdAt       DateTime            @default(now())
  publishedAt     DateTime?
}

enum ConfigVersionStatus {
  DRAFT
  PUBLISHED
}
```

Two nullable FK columns added to `register`:

```prisma
currentConfigVersionId  String?  // → latest PUBLISHED RegisterConfigVersion
draftConfigVersionId    String?  // → current DRAFT, null when no draft exists
```

No changes to the existing MVP config tables (`custom_field_definition`, `likelihood_value`, `impact_value`, `risk_level`, `risk_matrix_cell`, `response_strategy`, `custom_field_option`). They always hold the currently published configuration and are queried exactly as before.

**Operational model:**

| Operation | What happens |
|---|---|
| Start draft | Clone current published `snapshotJson` into a new `DRAFT` version row; set `register.draftConfigVersionId`. |
| Edit draft | Update `snapshotJson` on the draft version row. Relational tables are untouched. |
| Discard draft | Delete the draft version row; null `register.draftConfigVersionId`. |
| Impact analysis | Deserialise draft `snapshotJson`; diff against live relational tables; query risk counts. |
| Publish | Single transaction: write `snapshotJson` to relational config tables; set version status to `PUBLISHED` and `publishedAt`; update `register.currentConfigVersionId`; null `register.draftConfigVersionId`. |
| Historical record | Published version rows are immutable. `snapshotJson` is never changed after publish. |

**Templates** (PM4-08 to PM4-11) reuse the same `snapshotJson` shape. A template is a named snapshot; creating a register from a template is equivalent to publishing that snapshot into a new register's config tables.

**Mandatory backfill on Phase 4 migration:** for every existing register, create a version 1 `PUBLISHED` row with `snapshotJson` populated from the current relational config, and set `register.currentConfigVersionId` to that row. No existing config table rows are modified.

---

## 3. Decision Drivers

- **No version filter on existing config queries.** Option A would require a `config_version_id` filter on every query that touches a config table — a large blast radius with many opportunities for off-by-one errors, especially in AI-assisted development where individual query sites may not all be updated together. The hybrid keeps live config queries identical to their MVP form.
- **Draft is a single object.** Creating, editing, and discarding a draft touches one row and one JSONB column. This is significantly simpler to implement, test, and reason about than cloning and managing rows across eight config tables.
- **Impact analysis stays relational for the hard part.** The comparison between draft and live config deserialises the JSON once per analysis run; all risk-count queries then operate on the unchanged relational tables. This is straightforward with Prisma.
- **Publish is a well-scoped transaction.** The publish operation applies the snapshot to the relational tables in a single transaction. It is a bounded, independently testable unit of work rather than an ongoing invariant across many tables.
- **Templates are a natural fit.** A template is already a named, portable snapshot of configuration. Storing template versions as `snapshotJson` reuses the same format without an additional abstraction layer.
- **Rollback risk is low.** The relational config tables are only written during a publish operation — never by the migration itself. Rolling back the Phase 4 migration drops the new tables and two nullable FK columns; existing config data is fully intact.

---

## 4. Alternatives Considered

### 4.1 Option A — Version pointer FK on every config table

Add a `config_version_id` FK to each of the eight config tables. A published version owns a set of rows with its version ID. A draft creates new rows with the draft version ID.

**Rejected** because:

- All eight config tables require schema changes, expanding the migration and backfill surface area significantly.
- Every config query must be updated to filter by `config_version_id`, creating a large and persistent blast radius across the codebase. Any query that forgets the filter silently reads the wrong version.
- Draft creation requires cloning all config rows across all eight tables in a single transaction, making draft management expensive and complex.
- Prisma relation navigation becomes considerably more complex — many existing query sites must be changed and retested.
- Despite being labelled "recommended for simplicity" in PM0-02's initial draft, the ongoing query complexity is materially higher than the hybrid.

### 4.2 Option B — Pure JSON snapshot per version

Store the complete configuration as a JSONB snapshot on `register_config_version`. The relational config tables are replaced or bypassed for all reads.

**Rejected** because:

- Live config reads require deserialising JSON on every request rather than using indexed relational queries.
- Type safety is weakened: the snapshot schema must be kept in sync with the Prisma models by convention, not enforcement.
- Impact analysis must fully parse and reconstruct the configuration from JSON before it can query affected risks — more parsing overhead and more code.
- Existing MVP code that queries config tables would need to be replaced or routed through a JSON-parsing layer, a large and risky refactor.

---

## 5. Consequences

- `register_config_version` and the two FK columns on `register` must be created before any Phase 4 application logic is deployed.
- The mandatory backfill (populate version 1 `PUBLISHED` for every existing register) must run and be verified in CI before the feature flag for Phase 4 is enabled. See PM0-02 section 7 for backfill script guidelines.
- The `snapshotJson` shape must be defined as a TypeScript type in the shared package and used consistently by both the snapshot-write path (backfill, draft cloning) and the publish-write path. Divergence between the snapshot shape and the Prisma config models is the primary maintenance risk of this approach.
- Published `RegisterConfigVersion` rows must be treated as append-only. Application code must never update `snapshotJson` on a `PUBLISHED` row.
- Concurrent drafts are not supported: a register may have at most one draft at a time, enforced by the single `draftConfigVersionId` FK. If a second draft is requested while one exists, the API should return an error indicating a draft is already in progress.
