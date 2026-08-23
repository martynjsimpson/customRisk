# Register Configuration Draft System

**Audience:** developers adding or changing any setting on a register.

**Scope:** the draft/publish lifecycle for register configuration — the data model, the pipeline
from draft creation through publish, **the unified draft standard**, and the step-by-step guide for
extending the system correctly.

**Status:** the unified draft standard (section 5) is the rule as of DRAFT-UNIFIED. It supersedes
the "two categories of register settings" model described in the v1.27.0 revision of this document
and in `docs/spikes/SPIKE-008.md`. Where this document and SPIKE-008 disagree, this document wins;
SPIKE-008 remains the record of *why* the change was made.

---

## 1. Overview

The draft system lets a register administrator stage configuration changes — risk matrix values,
custom fields, register settings — without affecting live data. Changes accumulate in a JSON
snapshot attached to a `RegisterConfigVersion` row. When the administrator publishes the draft, the
snapshot is applied back to the relational tables in a single database transaction.

**Lifecycle:**

```
No draft
  -> POST /config-versions/draft          (createDraft)
Draft exists
  -> PATCH /config-versions/draft         (updateDraft, zero or more times)
  -> POST /config-versions/draft/impact   (analyseImpact, optional pre-flight)
  -> POST /config-versions/draft/publish  (publishDraft)
      OR
  -> DELETE /config-versions/draft        (discardDraft)
Published / No draft
```

A register can have at most one draft at a time. Attempting to create a second draft while one
already exists returns HTTP 409.

The system is gated behind the `draftConfig` feature flag. When the flag is off, the UI falls back
to direct saves via `PATCH /registers/:registerId`. That fallback is correct and supported — see
section 5.3.

**There is no Save button on the configuration screen when draft mode is active.** The only commit
point is Publish. This is the single most important fact about the screen's design, and it is the
reason the unified standard is coherent: an administrator editing anything on that screen is
already in a "stage, then publish" mental model. No field is exempt from it.

---

## 2. Data Model

### RegisterConfigVersion

Defined in `backend/prisma/schema.prisma`.

```
model RegisterConfigVersion {
  id                      String              (UUID, PK)
  registerId              String              (FK -> Register)
  versionNumber           Int                 (monotonically increasing per register)
  status                  ConfigVersionStatus (DRAFT | PUBLISHED)
  snapshotJson            Json                (JSONB — the canonical snapshot)
  createdByUserId         String              (FK -> User)
  createdAt               DateTime
  publishedAt             DateTime?
  sourceTemplateVersionId String?             (set when draft originates from a template)
}
```

`snapshotJson` holds a `RegisterConfigSnapshot` (`backend/src/types/configSnapshot.ts`). It is a
complete point-in-time capture of the register's entire configuration.

### Register foreign keys

The `Register` model carries two nullable, `@unique` foreign keys that control draft state:

- `currentConfigVersionId` — the most recently published version. Null for registers that have
  never published a draft.
- `draftConfigVersionId` — the active draft. Null when no draft exists.

It also carries `linkedTemplateVersionId`, the register's template sync point. This is **not** part
of the config snapshot; it is derived on publish from `draft.sourceTemplateVersionId`. See
section 5.2.

### ConfigSnapshotRegisterSettings

This interface (`backend/src/types/configSnapshot.ts`) is the `register` section of the snapshot.
Every field in it is subject to the unified standard.

```typescript
interface ConfigSnapshotRegisterSettings {
  name: string;
  description: string | null;
  riskIdPrefix: string | null;
  riskIdZeroPaddingEnabled: boolean;
  riskIdZeroPaddingWidth: number;
  defaultNewRiskState: string;
  reviewsEnabled: boolean;
  defaultReviewFrequencyMonths: number;
  reviewAttestationText: string;
  allowViewerExport: boolean;
  customFieldValidationEnabled: boolean;
  reviewStatusPosition: number | null;
  scoringFormula: string;
  responseActionMode: "SIMPLE" | "CHILD_RECORDS";
}
```

The full snapshot also contains `customFields`, `likelihoodValues`, `impactValues`, `riskLevels`,
`matrixCells`, and `responseStrategies` arrays. Those have always travelled through the draft and
are unaffected by this change.

---

## 3. Creating a Draft

**Route:** `POST /api/v1/registers/:registerId/config-versions/draft`
**Controller:** `backend/src/controllers/configVersion.controller.ts` → `createDraftController`
**Service:** `backend/src/services/configVersion.draft.service.ts` → `createDraft`

The service checks whether the register already has a published version
(`currentConfigVersionId`):

- **Published version exists:** clone its `snapshotJson`. The draft starts from the last
  known-good published state.
- **No published version:** call `buildSnapshotFromRelationalTables`, which reads all relational
  config tables in parallel and constructs the snapshot from the live rows.

It then calculates the next version number, inserts a `RegisterConfigVersion` row with
`status = DRAFT`, points `Register.draftConfigVersionId` at it, and records a `configDraftCreated`
audit event — all inside one Prisma transaction.

### normalizeSnapshot

`normalizeSnapshot` in `configVersion.draft.service.ts` is applied before any update merge. It
back-fills fields that may be absent from snapshots created before those fields existed.

Every new field added to `ConfigSnapshotRegisterSettings` MUST be added to `normalizeSnapshot` with
a safe default matching the Prisma column default. Without it, an old snapshot will be missing the
field when it is later read and merged.

> **Note — a second normaliser exists.** `backend/src/services/registerConfig.service.ts` has its
> own private `normalizeSnapshot` used on the *read* path (`GET /registers/:registerId/config`).
> It currently back-fills fewer fields than the draft-service one. On the read path the snapshot is
> spread over the live `Register` row, so a missing key falls back to the live value rather than
> producing `undefined` — but the two normalisers should be kept in step. If you add a field,
> add it to both.

---

## 4. Editing a Draft

**Route:** `PATCH /api/v1/registers/:registerId/config-versions/draft`
**Service:** `configVersion.draft.service.ts` → `updateDraft`

The body is a partial `UpdateDraftBody` (`backend/src/validators/configVersion.schemas.ts`). Each
top-level key is optional:

```
{
  register?: Partial<ConfigSnapshotRegisterSettings>   // merged field-by-field
  customFields?: [...]                                  // replaces entire array
  likelihoodValues?: [...]                              // replaces entire array
  impactValues?: [...]                                  // replaces entire array
  riskLevels?: [...]                                    // replaces entire array
  matrixCells?: [...]                                   // replaces entire array
  responseStrategies?: [...]                            // replaces entire array
}
```

The `register` section is a field-level merge (spread onto existing settings). Array sections are
wholesale replacements when present, untouched when absent.

An audit event `configDraftUpdated` is recorded with `metadataJson.patchedSections` listing which
top-level keys were present.

### Reading the pending values back

`GET /registers/:registerId/config` (`registerConfig.service.ts` → `getRegisterConfig`) already
overlays the draft snapshot's register settings onto the live `Register` row when a draft exists:

```typescript
register: { ...register, ...snapshot.register }
```

**This is the read source the UI must use in draft mode.** Reading a settings value from the live
`Register` row (`GET /registers/:registerId`) while a draft is open shows the pre-draft value and
silently discards the administrator's staged edit from the form on the next refetch.

---

## 5. The Unified Draft Standard

> **The rule.** Every field in `ConfigSnapshotRegisterSettings` travels through the draft and is
> promoted to the `Register` row **unconditionally** on publish, regardless of whether the draft
> originated from a template. There are no exceptions and no per-field categories.
>
> **The one exception is not a settings field.** `linkedTemplateVersionId` — and nothing else —
> remains inside the `draft.sourceTemplateVersionId` conditional in `publishDraft`.
>
> **Any register settings field added in future follows this rule.** Adding a field to
> `ConfigSnapshotRegisterSettings` without adding it to the always-promote block is a bug, not a
> design choice.

### 5.1 Why

The previous model split register settings into two implicit categories: fields that travelled
through the draft and were applied on publish, and fields written directly to the `Register` row
that took effect immediately. The split was never a decision. The original publish implementation
wrapped the entire register settings block in a `sourceTemplateVersionId` conditional, on the
reasoning that direct edits made while a manual draft was open should not be overwritten. Every
field added afterwards inherited that behaviour by default. Some authors noticed their field needed
unconditional promotion and added a special case; most did not.

The consequences were not theoretical. In v1.27.0, a field was correctly routed through the draft
in the UI and correctly blocked from the direct-write path in draft mode, but was never promoted on
publish for manual drafts. The administrator's change was silently lost. Several rounds of
per-field patching each produced a new failure mode, because each patch treated a symptom of the
split rather than the split itself.

The argument for keeping fields immediate-effect rested on a premise that does not hold: that
administrators expect immediate saves for fields like `name` or `reviewsEnabled`. There is no Save
button on the configuration screen in draft mode. The expectation being protected does not exist.

`docs/spikes/SPIKE-008.md` carries the field-by-field analysis. Its verdict: no field in
`ConfigSnapshotRegisterSettings` has a genuine technical blocker to draft treatment. None requires
a data migration except `responseActionMode`, which is already handled. None has a retroactive
effect on existing records — `riskIdPrefix` and the zero-padding settings affect only future risk
ID generation, and `defaultNewRiskState` affects only newly created risks.

### 5.2 Backend: the publish contract

In `backend/src/services/configVersion.publish.service.ts`, inside the `publishDraft` transaction,
the `tx.register.update` call has exactly this shape:

```
data: {
  // Always promoted — every field of ConfigSnapshotRegisterSettings.
  name, description, riskIdPrefix, riskIdZeroPaddingEnabled, riskIdZeroPaddingWidth,
  defaultNewRiskState, reviewsEnabled, defaultReviewFrequencyMonths, reviewAttestationText,
  allowViewerExport, customFieldValidationEnabled, reviewStatusPosition, scoringFormula,
  responseActionMode,

  // The ONLY member of the sourceTemplateVersionId conditional.
  ...(draft.sourceTemplateVersionId
        ? { linkedTemplateVersionId: draft.sourceTemplateVersionId }
        : {}),

  currentConfigVersionId: draft.id,
  draftConfigVersionId: null,
  updatedByUserId: actorId
}
```

Field-by-field status against the pre-DRAFT-UNIFIED code:

| Field | Before | After |
|---|---|---|
| `name` | In the snapshot but **never promoted at all** — absent from both branches | Always promoted |
| `description` | Template-origin only | Always promoted |
| `riskIdPrefix` | Template-origin only | Always promoted |
| `riskIdZeroPaddingEnabled` | Template-origin only | Always promoted |
| `riskIdZeroPaddingWidth` | Template-origin only | Always promoted |
| `defaultNewRiskState` | Template-origin only | Always promoted |
| `reviewsEnabled` | Template-origin only | Always promoted |
| `defaultReviewFrequencyMonths` | Template-origin only | Always promoted |
| `reviewAttestationText` | Template-origin only | Always promoted — **confirmed**, no special case |
| `allowViewerExport` | Template-origin only | Always promoted |
| `customFieldValidationEnabled` | Template-origin only | Always promoted |
| `reviewStatusPosition` | Template-origin only | Always promoted |
| `scoringFormula` | Already always promoted | Unchanged |
| `responseActionMode` | Already always promoted, guarded on snapshot presence | Unchanged (see below) |
| `linkedTemplateVersionId` | Template-origin only | **Unchanged — the one exception** |

Two fields keep behaviour that looks like an exception but is not:

- **`responseActionMode`** stays guarded by `snapshotMode !== undefined`. This is a *legacy-snapshot
  guard*, not a template-origin conditional: snapshots written before the field existed must not be
  read as a deliberate request to revert to `SIMPLE`. The field is always promoted whenever the
  snapshot carries it. Its data migration
  (`migrateSimpleResponseActionsToChildRecords` / `migrateChildRecordsToSimple`) and its
  `analyseImpact` blocker are unchanged. It remains the model for any future field that needs work
  beyond a value write.
- **`reviewCommentMode`** appears in SPIKE-008 and in the v1.27.0 revision of this document. It
  **does not exist in this codebase** — not in the Prisma schema, not in
  `ConfigSnapshotRegisterSettings`, not in the Zod schemas, not in the UI. It was reverted with
  v1.27.0 and returns with PM8-CORE. When it returns, it is always-promote like everything else;
  there is nothing to preserve from its earlier special-case treatment.

**`linkedTemplateVersionId` and template drift.** Publishing a *manual* draft does not touch
`linkedTemplateVersionId`. A register linked to a template that publishes its own manual draft stays
linked at its current template version and drifts from it visibly. It is not automatically
unlinked. This is deliberate: divergence is a normal, recoverable state that the administrator
should be able to see and reconcile, not a silent severing of the link. The drift is surfaced in
the UI via `linkedTemplate.isLatest` on the register response.

### 5.3 The direct-write path is not deprecated

`PATCH /registers/:registerId` (`registers.service.ts` → `updateRegister`) **stays**. It is the
correct path when no draft is active: with nothing to stage, an edit should apply immediately. It
is also the only path when the `draftConfig` feature flag is off.

What changed is not the existence of the direct path but the branch selection:

| State | Save path |
|---|---|
| `draftConfigMode && hasDraft` | `PATCH /config-versions/draft` (`updateDraftConfig`) — **every** settings field |
| `draftConfigMode && !hasDraft` | No save. All inputs are disabled (`settingsLocked`). |
| `!draftConfigMode` | `PATCH /registers/:registerId` (`updateRegister`) |

Never both. Writing a settings field directly to the `Register` row while a draft is open produces
a value that publish will overwrite from the snapshot — under the unified standard, publish now
overwrites *every* settings field, so a stray direct write in draft mode is guaranteed data loss,
where before it was merely inconsistent.

### 5.4 Frontend: every field handler routes through the draft

In `frontend/src/features/configuration/RegisterSettingsTab.tsx`, in draft mode, **every** register
settings field handler calls `updateDraftConfig`. The established pattern is
`handleResponseActionModeChange`:

```typescript
function handleXChange(next: T) {
  settingsForm.setFieldValue("x", next);
  if (draftConfigMode && hasDraft) {
    updateDraftXMutation.mutate(next);        // PATCH /config-versions/draft
  } else if (!draftConfigMode) {
    updateDirectXMutation.mutate(next);       // PATCH /registers/:registerId
  }
}
```

The form-level `onBlur` handler (`handleFormBlur`) is guarded by `!draftConfigMode` and calls
`updateRegister`. That guard must stay. It is what keeps the direct path from firing in draft mode;
it is not a substitute for wiring the draft path.

Two further requirements that are easy to miss:

1. **Read from the draft in draft mode.** The form's `setSettingsValues` effect must source
   *every* settings field from `configQuery.data.register` when `draftConfigMode && hasDraft`, and
   from `registerQuery.data` otherwise. Today only `responseActionMode` does this; the rest read
   the live `Register` row unconditionally, which will show pre-draft values once the fields stop
   being written directly.
2. **`RegisterSettingsTab` is not the only place register settings are edited.**
   `frontend/src/features/configuration/FieldConfigTab.tsx` persists `reviewStatusPosition` via
   `updateRegister` with no draft guard, in `reorderReviewStatusMutation` — while the custom-field
   reorder directly above it correctly branches to the draft path. Any component that writes a
   `ConfigSnapshotRegisterSettings` field is bound by this standard, not just the settings tab.

---

## 6. Publishing a Draft

**Route:** `POST /api/v1/registers/:registerId/config-versions/draft/publish`
**Service:** `configVersion.publish.service.ts` → `publishDraft`

### Pre-flight impact check

`publishDraft` calls `analyseImpact` before making any writes. If it returns blockers, publishing is
rejected with HTTP 422. Callers may invoke `POST /config-versions/draft/impact` directly to preview
blockers and warnings first.

`analyseImpact` checks:

- At least one active value in each of: likelihood values, impact values, risk levels, response
  strategies.
- All matrix cell FK references resolve to values present in the snapshot.
- Scoring formula validity (if non-empty).
- `responseActionMode` revert feasibility: reverting `CHILD_RECORDS` → `SIMPLE` is blocked if any
  non-closed risk has two or more active action records.

**`analyseImpact` is the correct place to reject a register settings value that would fail at the
database.** Anything that can make the `tx.register.update` throw must be a blocker here, because
`publishDraft` has no error mapping of its own (section 9).

### Inside the transaction

1. Upsert likelihood values — update existing rows by ID; insert new rows preserving snapshot IDs;
   deactivate rows absent from the snapshot.
2. Upsert impact values — same pattern.
3. Upsert risk levels — same pattern.
4. Upsert response strategies — same pattern.
5. Upsert custom field definitions and options — same pattern; options follow the same
   upsert/deactivate logic within each field.
6. Replace matrix cells — delete all `RiskMatrixCell` rows for the register, bulk-insert from the
   snapshot with IDs preserved.
7. Recalculate risk levels against the new matrix.
8. Recalculate risk scores using `scoringFormula` from the snapshot.
9. Recalculate `CALCULATED` custom fields for all non-closed risks.
10. Apply `responseActionMode` — if the snapshot carries the field and it differs from the live
    value, run the appropriate migration. Takes `SELECT ... FOR UPDATE` on the register row to
    prevent concurrent publish races.
11. **Update the `Register` row** — all `ConfigSnapshotRegisterSettings` fields unconditionally,
    plus `linkedTemplateVersionId` only for template-origin drafts, plus
    `currentConfigVersionId = draft.id` and `draftConfigVersionId = null`.
12. Mark the draft `PUBLISHED` and set `publishedAt`.
13. Record the `configPublished` audit event.

---

## 7. Frontend Integration

### Feature flag

Gated by `flags.draftConfig` (from `useFeatureFlags`). When off, all settings save directly via
`updateRegister` and `updateDraftConfig` is never called.

### Key derived booleans in RegisterSettingsTab

```typescript
const draftConfigMode = flags.draftConfig && canManage;  // admin rights AND flag on
const hasDraft = statusQuery.data?.hasDraft ?? false;    // Register.draftConfigVersionId != null
const settingsLocked = draftConfigMode && !hasDraft;     // draft mode, no draft — inputs disabled
```

### Queries

- `registerQuery` (`["register", registerId]`) — always active; live `Register` row. **Outside
  draft mode this is the form's read source.**
- `statusQuery` (`["config-version-status", registerId]`) — active only in `draftConfigMode`;
  drives `hasDraft`.
- `configQuery` (`["register-config", registerId]`) — active only in `draftConfigMode && hasDraft`;
  reads the draft snapshot via `getRegisterConfiguration`. **In draft mode this is the form's read
  source for every settings field.**

### Save button

Rendered only when `canManage && !settingsLocked && !draftConfigMode`. In draft mode the button is
hidden; saves happen on change or blur, and Publish is the commit point.

### Other configuration tabs

`FormulaConfigTab`, `RiskLevelConfigTab`, `ScoringValueConfigTab`, `MatrixConfigTab` and
`FieldConfigTab` follow the same principle: call `updateDraftConfig` when a draft exists, fall back
to direct relational mutations only outside draft mode. See section 5.4, note 2 — `FieldConfigTab`
has a known gap for `reviewStatusPosition`.

---

## 8. Adding a New Register Setting

There is one procedure. Every field on `Register` that an administrator can configure belongs in
the config snapshot and follows it.

**Step 1 — Prisma column.** Add the column to the `Register` model in
`backend/prisma/schema.prisma` and create a migration. Give it a safe default so existing rows are
valid.

**Step 2 — `ConfigSnapshotRegisterSettings`.** Add the field in
`backend/src/types/configSnapshot.ts`. Prefer a non-optional type; older snapshots are back-filled
by `normalizeSnapshot`.

**Step 3 — `normalizeSnapshot` (draft service).** Add the field in
`configVersion.draft.service.ts` with the same default as the migration:
`myNewField: snapshot.register.myNewField ?? <default>`. Also add it to the read-path normaliser in
`registerConfig.service.ts` (section 3, note).

**Step 4 — `buildSnapshotFromRelationalTables`.** In `configVersion.draft.service.ts`, add the
field to both the `select` clause of the `prisma.register.findUnique` call and the returned
`register` object.

**Step 5 — `configExport.service.ts`.** `buildSnapshotFromLiveTables` has its own identical
`select` and return construction. Add the field there too, or exports produce incomplete snapshots.

**Step 6 — `configImport.service.ts`.** The import path normalises the parsed snapshot by hand.
Add the field to that normalisation block.

**Step 7 — `snapshotRegisterSettingsSchema` (Zod).** In
`backend/src/validators/configVersion.schemas.ts`, add the field as `.optional()`. **Zod strips
unknown keys**, so a field missing here is silently dropped from the `PATCH /config-versions/draft`
body before `updateDraft` ever sees it — the request returns 200 and nothing saves.

Match the validation to `updateRegisterSchema` in `registers.schemas.ts` field for field. Since
publish now writes the value to the live column unconditionally, a rule the direct path enforces
and the draft path does not is a route into an invalid live value.

**Step 8 — `publishDraft`.** In `configVersion.publish.service.ts`, add the field to the
**always-promote** block of the `tx.register.update` call. Do not put it in the
`draft.sourceTemplateVersionId` conditional; that block is reserved for `linkedTemplateVersionId`.

If the field can fail at the database — a unique constraint, an enum, a foreign key — add a
corresponding blocker to `analyseImpact` (section 6). If it needs a data migration, model it on
`responseActionMode`: migrate before the `Register.update`, take the row lock, and add a revert
blocker to `analyseImpact`.

**Step 9 — `UpdateRegisterInput` and `updateRegister` (direct path).** The non-draft path must be
able to save the field too. Add it to `UpdateRegisterInput` and `RegisterRecord` in
`frontend/src/api/registers.api.ts`, to `updateRegisterSchema` in `registers.schemas.ts`, and to
the `data` block and `buildFieldChanges` list in `registers.service.ts` → `updateRegister`.

**Step 10 — `UpdateDraftConfigInput` (frontend).** Add the field to the `register` section in
`frontend/src/api/configVersion.api.ts`.

**Step 11 — Wire the UI.** In `RegisterSettingsTab.tsx` (or the tab that owns the field):

1. Add it to the form's `initialValues`.
2. Add it to `setSettingsValues` in the effect, reading from `configQuery.data.register` when
   `draftConfigMode && hasDraft` and from `registerQuery.data` otherwise.
3. Create a draft mutation using `updateDraftConfig`.
4. Create a direct mutation using `updateRegister`.
5. Write the handler that branches on `draftConfigMode && hasDraft`, per section 5.4.
6. Render with `disabled={!canManage || settingsLocked}`.

Do not wire the field only to the form-level `updateSettingsMutation`. That mutation always calls
`updateRegister` and never fires in draft mode.

---

## 9. Known Pitfalls

### Adding a field to the template-origin conditional

The `draft.sourceTemplateVersionId` conditional in `publishDraft` contains
`linkedTemplateVersionId` and nothing else. A settings field placed inside it is not promoted when
a manual draft is published — the administrator's staged change is silently discarded on publish.
This is the exact failure the unified standard exists to prevent, and the conditional is still
there (for `linkedTemplateVersionId`), so it is still possible to make the mistake.

### Missing from `snapshotRegisterSettingsSchema` (Zod)

Zod strips unknown keys. A field in `ConfigSnapshotRegisterSettings` and wired to
`updateDraftConfig`, but absent from `snapshotRegisterSettingsSchema`, is dropped by the
`validateRequest` middleware. The response is 200 with the unchanged snapshot, so nothing signals a
failure.

**Symptom:** the user edits the field, the form shows the new value, and the old value returns
after a refresh. This was the root cause of the v1.27.0 regression.

### Validation that differs between the draft path and the direct path

`snapshotRegisterSettingsSchema` and `updateRegisterSchema` validate the same columns and must
agree. Where they do not, the draft becomes the weaker route to the same live column now that
publish promotes unconditionally. Known divergences to fix or avoid reintroducing:

- `riskIdPrefix` — `updateRegisterSchema` enforces `/^[A-Z0-9][A-Z0-9-]*$/`; the snapshot schema
  does not.
- `name` — `updateRegisterSchema` enforces `.trim().min(1)`; the snapshot schema has historically
  omitted `name` altogether.
- `defaultNewRiskState` — typed `string` in the snapshot and validated as `z.string()`, but written
  to a `RiskState` enum column. It needs `z.enum` validation, not a cast at the write site.

### `Register.name` is globally unique

`name` is `@unique` on the `Register` model. Promoting it unconditionally means a publish can now
violate that constraint — the collision may be created after the draft was opened, by a different
register.

`publishDraft` has **no** `try`/`catch` and does not call `mapPrismaError`, so a raw `P2002`
propagates as an unhandled Prisma error and the whole publish fails as a 500 with no usable
message. Any DB-level constraint on a promoted field must be checked in `analyseImpact` as a
blocker. Do not rely on the update throwing.

### Missing from `buildSnapshotFromRelationalTables` or `configExport.service.ts`

A field in `ConfigSnapshotRegisterSettings` but not in the `select` of
`buildSnapshotFromRelationalTables` is missing from snapshots built for registers with no published
version. The same applies to `buildSnapshotFromLiveTables` in `configExport.service.ts` for the
export path. Add it to both `select` clauses and both return objects.

### Reading live values while a draft is open

Once a field stops being written directly in draft mode, reading it from `registerQuery.data`
shows the pre-draft value. The form appears to revert on every refetch. In draft mode, read from
`configQuery.data.register` — `getRegisterConfig` already overlays the draft snapshot for you.

### Writing a settings field outside `RegisterSettingsTab`

Any component that calls `updateRegister` with a `ConfigSnapshotRegisterSettings` field must carry
the same `draftConfigMode && hasDraft` branch. `FieldConfigTab`'s `reorderReviewStatusMutation` is
the current example of a write that does not.

### Audit trail for settings promoted on publish

The direct path records a `registerSettingsUpdated` event with per-field `fieldChanges`. The publish
path records a single `configPublished` event with counts, and no per-field diff for register
settings. Under the unified standard, more settings changes now flow through publish, so more of
them land in the audit trail as "configuration v*N* published" rather than as named field changes.
This is accepted for now; the config version snapshots are the durable record of what changed. If a
per-field diff on publish becomes a requirement, it belongs in `publishDraft`'s audit event, not in
a second write to the direct path.

---

## 10. Related Documents

- `docs/spikes/SPIKE-008.md` — the field-by-field analysis and the reasoning that produced this
  standard. Superseded by this document where the two disagree.
- `docs/decisions/ADR-0004-config-version-storage.md` — why configuration is versioned as a JSON
  snapshot.
- `docs/decisions/ADR-0012-unified-register-settings-draft.md` — the decision record for this
  standard.
- `docs/architecture/audit-model.md` — audit event structure and `fieldChanges`.
