# Register Configuration Draft System

**Audience:** developers adding new settings to the register configuration system.

**Scope:** this document covers the draft/publish lifecycle for register configuration: the data model, the full pipeline from draft creation through to publish, the two categories of register settings, and a step-by-step guide for extending the system correctly.

---

## 1. Overview

The draft system allows a register administrator to stage configuration changes — risk matrix values, custom fields, register settings — without affecting live data. Changes accumulate in a JSON snapshot attached to a `RegisterConfigVersion` row. When the administrator publishes the draft, the snapshot is applied back to the relational tables in a single database transaction.

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

A register can have at most one draft at a time. Attempting to create a second draft while one already exists returns HTTP 409.

The system is gated behind the `draftConfig` feature flag. When the flag is off, the UI falls back to direct saves via `PATCH /registers/:registerId`.

---

## 2. Data Model

### RegisterConfigVersion

Defined in `backend/prisma/schema.prisma` at line 761.

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

`snapshotJson` holds a `RegisterConfigSnapshot` (defined in `backend/src/types/configSnapshot.ts`). It is a complete point-in-time capture of the register's entire configuration.

### Register foreign keys

The `Register` model carries two nullable foreign keys that control draft state:

- `currentConfigVersionId` — points to the most recently published version. Null for registers that have never published a draft.
- `draftConfigVersionId` — points to the active draft. Null when no draft exists.

Both are `@unique`, so a given `RegisterConfigVersion` row can only ever be the current or the draft for one register at a time.

### ConfigSnapshotRegisterSettings

This interface (`backend/src/types/configSnapshot.ts`, line 64) represents the `register` section of the snapshot. Current fields:

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
  reviewCommentMode: "DISABLED" | "OPTIONAL" | "MANDATORY";
  allowViewerExport: boolean;
  customFieldValidationEnabled: boolean;
  reviewStatusPosition: number | null;
  scoringFormula: string;
  responseActionMode: "SIMPLE" | "CHILD_RECORDS";
}
```

The full snapshot also contains `customFields`, `likelihoodValues`, `impactValues`, `riskLevels`, `matrixCells`, and `responseStrategies` arrays.

---

## 3. Creating a Draft

**Route:** `POST /api/v1/registers/:registerId/config-versions/draft`

**Controller:** `backend/src/controllers/configVersion.controller.ts` -> `createDraftController`

**Service:** `backend/src/services/configVersion.draft.service.ts`, function `createDraft` (line 202).

### How the initial snapshot is built

The service checks whether the register already has a published version (`currentConfigVersionId`):

- **Published version exists:** clone its `snapshotJson` directly. This ensures the draft starts from the last known-good published state, not from whatever the live relational rows currently look like.
- **No published version:** call `buildSnapshotFromRelationalTables` (line 42), which reads all relational config tables in parallel and constructs the snapshot. This is the path for registers that have never gone through the draft/publish cycle.

After constructing the snapshot the service:

1. Calculates the next version number (max existing `versionNumber` + 1).
2. Inserts a `RegisterConfigVersion` row with `status = DRAFT`.
3. Updates `Register.draftConfigVersionId` to point to the new row.
4. Records a `configDraftCreated` audit event.

All three writes happen inside a Prisma transaction.

### normalizeSnapshot

`normalizeSnapshot` (line 27) is applied to the snapshot before any update merge. It back-fills fields that may be absent from older snapshots created before those fields existed:

```typescript
export function normalizeSnapshot(snapshot: RegisterConfigSnapshot): RegisterConfigSnapshot {
  return {
    ...snapshot,
    register: {
      ...snapshot.register,
      customFieldValidationEnabled: snapshot.register.customFieldValidationEnabled ?? true,
      reviewStatusPosition: snapshot.register.reviewStatusPosition ?? null,
      scoringFormula: snapshot.register.scoringFormula ?? "",
      responseActionMode: snapshot.register.responseActionMode ?? "SIMPLE",
      reviewCommentMode: snapshot.register.reviewCommentMode ?? "OPTIONAL"
    },
    customFields: snapshot.customFields.map((field) => normalizeCustomFieldValidationMode(field))
  };
}
```

Every new field added to `ConfigSnapshotRegisterSettings` MUST be added to `normalizeSnapshot` with a safe default. Without this, old snapshots will be missing the field when they are later read and merged.

---

## 4. Editing a Draft

**Route:** `PATCH /api/v1/registers/:registerId/config-versions/draft`

**Controller:** `updateDraftController`

**Service:** `configVersion.draft.service.ts`, function `updateDraft` (line 264).

### Merge semantics

The request body is a partial `UpdateDraftBody` (defined by `updateDraftBodySchema` in `backend/src/validators/configVersion.schemas.ts`). Each top-level key is optional:

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

For the `register` section, the patch is spread onto the existing register settings (field-level merge). For all array sections, the entire array is replaced if the key is present, or left untouched if the key is absent.

The service reads the existing draft snapshot, normalizes it, applies the merge, and writes the result back. An audit event `configDraftUpdated` is recorded with `metadataJson.patchedSections` listing which top-level keys were present in the patch.

### Frontend API function

`frontend/src/api/configVersion.api.ts`, function `updateDraftConfig` (line 133):

```typescript
export async function updateDraftConfig(
  registerId: string,
  input: UpdateDraftConfigInput
): Promise<ConfigVersionRecord>
```

`UpdateDraftConfigInput` mirrors `UpdateDraftBody` on the frontend side (line 52). Note that `UpdateDraftConfigInput.register` only exposes the fields that have been wired up for draft-mode editing; other fields in `ConfigSnapshotRegisterSettings` are controlled differently (see section 5).

---

## 5. Two Categories of Register Settings

This is the most important distinction in the system. Every field on a register falls into exactly one of two categories.

### Category A: Config-snapshot fields

These fields travel through the draft system. They are stored in `snapshotJson` and become live only when the draft is published. They must be saved via `PATCH /config-versions/draft` (i.e., `updateDraftConfig` on the frontend).

When draft mode is active (`draftConfigMode && hasDraft`), these fields MUST NOT be saved via `PATCH /registers/:registerId`. Doing so would write the value directly to the `Register` row, which will then be overwritten (or in some cases ignored) when the draft is published.

**Current Category A fields:**

All fields in the six array sections of the snapshot (custom fields, likelihood values, impact values, risk levels, matrix cells, response strategies) are inherently Category A.

For the `register` section, the following are Category A (they travel through the draft and are applied on publish):

| Field | Notes |
|---|---|
| `scoringFormula` | Always promoted on publish, regardless of template origin |
| `responseActionMode` | Promoted on publish only when the snapshot field is present (legacy guard); triggers data migration |
| `reviewCommentMode` | Snapshot field; applied on publish only for template-origin drafts (see section 6) |
| `reviewAttestationText` | Same as above |
| `name` | Applied on publish only for template-origin drafts |
| `description` | Applied on publish only for template-origin drafts |
| `riskIdPrefix` | Applied on publish only for template-origin drafts |
| `riskIdZeroPaddingEnabled` | Applied on publish only for template-origin drafts |
| `riskIdZeroPaddingWidth` | Applied on publish only for template-origin drafts |
| `defaultNewRiskState` | Applied on publish only for template-origin drafts |
| `reviewsEnabled` | Applied on publish only for template-origin drafts |
| `defaultReviewFrequencyMonths` | Applied on publish only for template-origin drafts |
| `allowViewerExport` | Applied on publish only for template-origin drafts |
| `customFieldValidationEnabled` | Applied on publish only for template-origin drafts |
| `reviewStatusPosition` | Applied on publish only for template-origin drafts |

### Category B: Direct-register fields

These fields bypass the draft system entirely. They are saved immediately via `PATCH /registers/:registerId` and take effect at once, regardless of whether a draft exists.

In `RegisterSettingsTab`, the `updateSettingsMutation` always uses `updateRegister`. Most Category B fields are wired to the form's `onBlur` handler (`handleFormBlur`, line 166), which only fires when draft mode is inactive. However, there is a subtlety: the field values are still read from `registerQuery.data` (the live `Register` row) in all cases.

**Current Category B fields** (those in `UpdateRegisterInput` in `frontend/src/api/registers.api.ts`):

`name`, `description`, `riskIdPrefix`, `riskIdZeroPaddingEnabled`, `riskIdZeroPaddingWidth`, `reviewsEnabled`, `defaultReviewFrequencyMonths`, `reviewAttestationText`, `reviewCommentMode`, `allowViewerExport`, `customFieldValidationEnabled`, `reviewStatusPosition`.

**Important overlap:** `reviewCommentMode`, `reviewAttestationText`, and several others appear in BOTH `UpdateRegisterInput` (Category B) and `ConfigSnapshotRegisterSettings` (Category A). The correct save path depends on whether draft mode is active:

- Draft mode inactive (`!draftConfigMode`): save via `updateRegister` on blur.
- Draft mode active with draft (`draftConfigMode && hasDraft`): save via `updateDraftConfig` on change/blur. The `handleFormBlur` guard (line 167: `if (!draftConfigMode && ...`) prevents the direct-register path from firing.

This dual-path pattern is what `reviewCommentMode` and `reviewAttestationText` implement as of v1.27.0, using `updateDraftReviewFieldsMutation` for the draft path and `updateSettingsMutation` for the direct path.

`responseActionMode` follows the same dual-path pattern via `updateDraftResponseActionModeMutation` and `updateDirectResponseActionModeMutation`.

---

## 6. Publishing a Draft

**Route:** `POST /api/v1/registers/:registerId/config-versions/draft/publish`

**Service:** `configVersion.publish.service.ts`, function `publishDraft` (line 356).

### Pre-flight impact check

`publishDraft` calls `analyseImpact` before making any writes. If `analyseImpact` returns any blockers, publishing is rejected with HTTP 422. The caller may also invoke `POST /config-versions/draft/impact` directly to preview blockers and warnings before committing.

`analyseImpact` checks:

- At least one active value in each of: likelihood values, impact values, risk levels, response strategies.
- All matrix cell FK references resolve to values present in the snapshot.
- Scoring formula validity (if non-empty).
- `responseActionMode` revert feasibility: reverting from `CHILD_RECORDS` to `SIMPLE` is blocked if any non-closed risk has two or more active action records.

### What publishDraft does inside the transaction

All of the following happen in a single Prisma transaction:

1. **Upsert likelihood values** — update existing rows by ID; insert new rows (preserving IDs from snapshot); deactivate rows absent from snapshot.
2. **Upsert impact values** — same pattern.
3. **Upsert risk levels** — same pattern.
4. **Upsert response strategies** — same pattern.
5. **Upsert custom field definitions and options** — same pattern; options within each field follow the same upsert/deactivate logic.
6. **Replace matrix cells** — delete all existing `RiskMatrixCell` rows for the register, then bulk-insert from snapshot (IDs preserved).
7. **Recalculate risk levels** — re-evaluate all open risks against the new matrix.
8. **Recalculate risk scores** — apply `scoringFormula` from snapshot to all open risks.
9. **Recalculate CALCULATED custom fields** — evaluate formula fields for all non-closed risks.
10. **Apply `responseActionMode`** — if snapshot carries the field AND it differs from the live value, run the appropriate data migration (`migrateSimpleResponseActionsToChildRecords` or `migrateChildRecordsToSimple`). Uses `SELECT ... FOR UPDATE` to prevent concurrent publish races.
11. **Update the Register row:**
    - If `draft.sourceTemplateVersionId` is set (template-origin draft): write all `ConfigSnapshotRegisterSettings` fields back to the `Register` row.
    - If manual draft: only `scoringFormula` and (conditionally) `responseActionMode` are always promoted.
    - Always: set `currentConfigVersionId = draft.id`, `draftConfigVersionId = null`.
12. **Mark draft PUBLISHED** — update `status = PUBLISHED`, set `publishedAt`.
13. Record `configPublished` audit event.

**Implication for most Category A register-settings fields:** for manually-created drafts (the common case), fields like `name`, `reviewsEnabled`, `reviewAttestationText`, `reviewCommentMode` etc. are captured in the snapshot during draft edits but are NOT written back to the `Register` row on publish. They are persisted in the snapshot for historical record and for template-origin behaviour, but the authoritative live value remains whatever was last written via `PATCH /registers/:registerId`.

This is why most Category A register-settings fields must also be saved via `PATCH /registers/:registerId` in the non-draft path, and why the dual-path pattern exists.

---

## 7. Frontend Integration

### Feature flag

The draft system is gated by `flags.draftConfig` (from `useFeatureFlags`). When the flag is off, all settings save directly via `updateRegister`; `updateDraftConfig` is never called.

### Key derived booleans in RegisterSettingsTab

```typescript
const draftConfigMode = flags.draftConfig && canManage;
// true when the user has admin rights AND the flag is on

const hasDraft = statusQuery.data?.hasDraft ?? false;
// true when Register.draftConfigVersionId is not null

const settingsLocked = draftConfigMode && !hasDraft;
// true in draft mode with no active draft — all inputs are disabled
```

`settingsLocked` disables all form fields. The user must create a draft before they can edit anything in draft mode.

### Queries

- `registerQuery` (`["register", registerId]`) — always active; provides live `Register` row data.
- `statusQuery` (`["config-version-status", registerId]`) — active only in `draftConfigMode`; drives `hasDraft`.
- `configQuery` (`["register-config", registerId]`) — active only in `draftConfigMode && hasDraft`; reads the current draft snapshot via `getRegisterConfiguration`. Used to read `responseActionMode` from the draft snapshot so the UI reflects pending draft value rather than live register value.

### Save button

The Save button (`type="submit"`) is rendered only when `canManage && !settingsLocked && !draftConfigMode` (line 299). In draft mode the button is always hidden; saves happen on blur or on change, not on explicit submit.

### Auto-save patterns

There are two distinct auto-save patterns in `RegisterSettingsTab`:

1. **`onBlur` on the entire form** (`handleFormBlur`, line 166): fires when focus leaves the form entirely (not moving between fields). Calls `updateSettingsMutation` (which calls `updateRegister`). Guard: only fires when `!draftConfigMode`.

2. **Per-field handlers for draft-path fields:**
   - `handleResponseActionModeChange` (line 172): fires on Switch toggle. Calls `updateDraftResponseActionModeMutation` when `draftConfigMode && hasDraft`, or `updateDirectResponseActionModeMutation` when `!draftConfigMode`.
   - `handleReviewCommentModeChange` (line 182): fires on Select change. Calls `updateDraftReviewFieldsMutation` when `draftConfigMode && hasDraft`. No direct-register path here (covered by the form `onBlur`).
   - `handleReviewAttestationTextBlur` (line 190): fires on Textarea blur. Calls `updateDraftReviewFieldsMutation` when `draftConfigMode && hasDraft`.

Other tabs (FormulaConfigTab, RiskLevelConfigTab, ScoringValueConfigTab, MatrixConfigTab, FieldConfigTab) follow the same principle: each calls `updateDraftConfig` when a draft exists, or falls back to direct relational mutations when not in draft mode.

### getConfigVersionStatus

`getConfigVersionStatus` (frontend: `frontend/src/api/configVersion.api.ts` line 94; backend: `configVersion.draft.service.ts` line 179) returns:

```typescript
{
  currentVersion: ConfigVersionRecord | null;
  draftVersion: ConfigVersionRecord | null;
  hasDraft: boolean;
}
```

The `statusQuery` result is polled on demand (invalidated after create/publish/discard mutations). `hasDraft` drives the UI state transitions.

---

## 8. Correct Pattern for Adding a New Setting

### 8A. Adding a field that belongs in the config snapshot (Category A)

Use this for fields that govern the risk matrix, custom field behaviour, or register settings that must be versioned and applied atomically with other config changes. Good candidates: anything that affects risk scoring, matrix structure, or field validation rules.

**Step 1: Add a Prisma column to the Register model**

Add the column to `backend/prisma/schema.prisma` and create a migration (`npx prisma migrate dev`). Set a safe default value so existing rows are not broken.

**Step 2: Add the field to ConfigSnapshotRegisterSettings**

In `backend/src/types/configSnapshot.ts`, add the field to `ConfigSnapshotRegisterSettings`. Choose a non-optional type if possible; older snapshots that lack the field will be back-filled by `normalizeSnapshot`.

**Step 3: Add to normalizeSnapshot**

In `backend/src/services/configVersion.draft.service.ts`, add the field to the `register` section of `normalizeSnapshot` (line 27) with the same safe default used in the migration:

```typescript
myNewField: snapshot.register.myNewField ?? <defaultValue>
```

Do not skip this step. Without it, any snapshot created before this field existed will produce a TypeScript error or a runtime undefined when the field is later read.

**Step 4: Add to buildSnapshotFromRelationalTables**

In `configVersion.draft.service.ts`, add:
- the field to the `select` clause of the `prisma.register.findUnique` call (lines 46-64).
- the field to the returned `register` object (lines 96-114).

**Step 5: Add to configExport.service.ts**

In `backend/src/services/configExport.service.ts`, `buildSnapshotFromLiveTables` (line 7) has its own identical `select` and return construction. Add the field there too or exports will produce incomplete snapshots.

**Step 6: Add to configImport.service.ts**

In `backend/src/services/configImport.service.ts`, the import path normalises the parsed snapshot by hand. Add the field to the normalisation block (around line 55).

**Step 7: Add to snapshotRegisterSettingsSchema (Zod)**

In `backend/src/validators/configVersion.schemas.ts`, add the field to `snapshotRegisterSettingsSchema` as `.optional()`. Zod strips unknown keys by default — any field absent from this schema will be silently dropped when the `PATCH /config-versions/draft` body is validated, meaning the merge in `updateDraft` will never receive the value.

```typescript
myNewField: z.myType().optional()
```

**Step 8: Add to publishDraft**

In `backend/src/services/configVersion.publish.service.ts`, add the field to the `Register.update` call inside `publishDraft` (lines 700-731). Decide whether it should be applied only for template-origin drafts (inside the `draft.sourceTemplateVersionId ? { ... } : {}` block) or always. Use the same conditional pattern as `scoringFormula` if it must always be promoted regardless of template origin.

If publishing the field requires a data migration (like `responseActionMode` does), implement that migration before the `Register.update` call.

**Step 9: Add to UpdateDraftConfigInput (frontend)**

In `frontend/src/api/configVersion.api.ts`, add the field to the `register` section of `UpdateDraftConfigInput` (line 52).

**Step 10: Wire the UI in RegisterSettingsTab (or the appropriate tab)**

In `frontend/src/features/configuration/RegisterSettingsTab.tsx`:

1. Add the field to the form's `initialValues`.
2. Add the field to the `setSettingsValues` call inside the `useEffect` (line 81).
3. Create a mutation using `updateDraftConfig` for the draft-mode path.
4. Create a mutation using `updateRegister` for the non-draft path (if the field should also be editable outside draft mode).
5. Write an `onChange` or `onBlur` handler that dispatches to the correct mutation based on `draftConfigMode && hasDraft`.
6. Render the field with `disabled={!canManage || settingsLocked}`.

Do NOT wire the field only to `updateSettingsMutation`. That mutation always calls `updateRegister` and ignores draft state.

---

### 8B. Adding a field that lives directly on the Register model (Category B)

Use this for fields that take effect immediately and do not need to be staged: display preferences, permission flags, or anything where the cost of accidental over-write on publish is acceptable.

**Step 1: Add a Prisma column to Register and migrate**

Same as Category A step 1.

**Step 2: Add to UpdateRegisterInput (frontend)**

In `frontend/src/api/registers.api.ts`, add the field to the `Pick<RegisterRecord, ...>` union in `UpdateRegisterInput`.

**Step 3: Add to the backend PATCH handler**

In the registers route handler / service, add the field to the allowed update set.

**Step 4: Add to RegisterRecord (frontend)**

Add the field to `RegisterRecord` in `frontend/src/api/registers.api.ts` so it flows back from the GET response.

**Step 5: Wire the UI**

Add to form `initialValues` and `setSettingsValues` in `RegisterSettingsTab`. The field can be saved via `updateSettingsMutation` (which calls `updateRegister`), wired through the form's `onBlur` in the non-draft path. Apply `disabled={!canManage || settingsLocked}` unless the field should remain editable even without a draft.

Do NOT call `updateDraftConfig` for a Category B field. It will appear to save (the PATCH succeeds and returns an updated snapshot) but the value will not be written to the `Register` row until publish — which is incorrect for a field intended to take immediate effect.

---

## 9. Known Pitfalls

### Missing from normalizeSnapshot

If a new field is added to `ConfigSnapshotRegisterSettings` but not to `normalizeSnapshot`, any draft created before the field existed will fail at runtime when the snapshot is read and merged, because the field will be `undefined`. The symptom is a TypeScript compile error in strict mode, or a silent `undefined` write in the merged snapshot.

**Fix:** always add every new field to `normalizeSnapshot` with a safe default.

### Missing from snapshotRegisterSettingsSchema (Zod)

Zod strips unknown keys. If a field is added to `ConfigSnapshotRegisterSettings` and wired to `updateDraftConfig` on the frontend, but not added to `snapshotRegisterSettingsSchema`, the value will be silently dropped by the `validateRequest` middleware before `updateDraft` ever sees it. The frontend will receive a 200 response (the existing snapshot is returned unchanged), giving no indication that the save failed.

**Symptom:** user edits the field, the form shows the new value, but after a refresh the old value reappears.

**Fix:** add the field to `snapshotRegisterSettingsSchema` as `.optional()`.

This was the root cause of the v1.27.0 regression with `reviewCommentMode`.

### Missing from buildSnapshotFromRelationalTables or configExport.service.ts

If a field is in `ConfigSnapshotRegisterSettings` but not in the `select` of `buildSnapshotFromRelationalTables`, the snapshot built for registers with no published version will be missing the field. The same applies to `buildSnapshotFromLiveTables` in `configExport.service.ts` for the export path.

**Fix:** add to both `select` clauses and both return objects whenever a new field is added.

### Wiring to the wrong mutation

Wiring a Category A field to `updateSettingsMutation` (which calls `updateRegister`) means the value bypasses the snapshot entirely. If the field is also listed in `UpdateRegisterInput` this will appear to work, but the snapshot will never contain the updated value. If the field is later read from the snapshot (e.g. in a tab that reads `configQuery.data`), it will show stale data.

Conversely, wiring a Category B field to `updateDraftConfig` means the value is staged but not applied until publish. This produces a confusing UX where the setting appears to change in the form but has no live effect.

### Forgetting the dual-path for fields that span both categories

Fields like `reviewCommentMode` and `responseActionMode` appear in both `UpdateRegisterInput` (so they can be edited outside draft mode) and in the snapshot (so they are versioned inside draft mode). Both paths must be wired:

- Draft mode active: call `updateDraftConfig`.
- Draft mode inactive: let the form `onBlur` fire (or use an explicit `onChange` handler that calls `updateRegister`).

If only the draft path is wired, the field will not save when the feature flag is off. If only the direct path is wired, in draft mode the edit will write immediately to the register row and be invisible to the draft; the snapshot will lag behind.

### Not adding to publishDraft for template-origin drafts

If a field is added to the snapshot but not to the `Register.update` call in `publishDraft`, publishing a template-origin draft will not transfer the field value to the live register. For non-template drafts this is usually acceptable (since the live value was already updated via `PATCH /registers/:registerId`), but for template-origin behaviour the omission is a silent data loss.

### Import path not updated

The import path in `configImport.service.ts` constructs the snapshot by hand from a parsed payload. If a new field is not normalised there, imported configs will produce incomplete snapshots that then fail `normalizeSnapshot` checks or produce undefined values on first use.
