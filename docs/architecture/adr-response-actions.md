# ADR-0011 — Response Action Child Records (PM7-CORE)

**Status:** Accepted  
**Date:** 2026-06-20  
**Feature:** PM7-CORE  

---

## Context

Risks in customRisk currently carry a single free-text `responseAction` field on the `Risk` row
(simple mode). PM7-CORE introduces a register-level toggle that replaces this with first-class child
records, each carrying three built-in fields: Response (multi-line text), Status (enum), and Risk
Response Owner (person picker). The Risk Response Owner field drives a new permission tier (§12.5 of
the PRD) that must integrate cleanly with the existing layered permission model.

Existing registers and new registers both default to Simple mode. A Register Admin can switch a
register to Child Records mode at any time, at which point any non-empty simple-field values must be
migrated forward automatically.

---

## Decision

### 1. Schema additions

Add the following blocks to `backend/prisma/schema.prisma`.

**New enums — place with existing enums at top of file:**

```prisma
enum ResponseActionMode {
  SIMPLE
  CHILD_RECORDS
}

enum ResponseActionStatus {
  PLANNED
  IN_PROGRESS
  IMPLEMENTED
  DEFERRED
  CANCELLED
}
```

**New field on `Register` model — add after `scoringFormula`:**

```prisma
  responseActionMode ResponseActionMode @default(SIMPLE) @map("response_action_mode")
```

**New models — add after `ResponseStrategy`:**

```prisma
model ResponseAction {
  id         String               @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  response   String               @db.Text
  status     ResponseActionStatus @default(PLANNED)

  ownerPersonId String? @map("owner_person_id") @db.Uuid
  ownerUserId   String? @map("owner_user_id") @db.Uuid

  isDeleted       Boolean   @default(false) @map("is_deleted")
  deletedAt       DateTime? @map("deleted_at") @db.Timestamptz(6)
  deletedByUserId String?   @map("deleted_by_user_id") @db.Uuid

  createdAt       DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  createdByUserId String   @map("created_by_user_id") @db.Uuid
  updatedAt       DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)
  updatedByUserId String   @map("updated_by_user_id") @db.Uuid

  ownerPerson PersonReference? @relation("ResponseActionOwnerPerson", fields: [ownerPersonId], references: [id], onDelete: SetNull)
  ownerUser   User?            @relation("ResponseActionOwnerUser", fields: [ownerUserId], references: [id], onDelete: SetNull)
  deletedBy   User?            @relation("ResponseActionDeletedBy", fields: [deletedByUserId], references: [id], onDelete: SetNull)
  createdBy   User             @relation("ResponseActionCreatedBy", fields: [createdByUserId], references: [id], onDelete: Restrict)
  updatedBy   User             @relation("ResponseActionUpdatedBy", fields: [updatedByUserId], references: [id], onDelete: Restrict)

  riskLinks RiskResponseAction[]

  @@index([ownerUserId])
  @@index([ownerPersonId])
  @@index([isDeleted])
  @@map("response_action")
}

model RiskResponseAction {
  id               String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  riskId           String   @map("risk_id") @db.Uuid
  registerId       String   @map("register_id") @db.Uuid
  responseActionId String   @map("response_action_id") @db.Uuid
  displayOrder     Int      @default(0) @map("display_order")
  createdAt        DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  createdByUserId  String   @map("created_by_user_id") @db.Uuid

  risk           Risk           @relation("RiskResponseActions", fields: [riskId], references: [id], onDelete: Cascade)
  register       Register       @relation("RegisterResponseActions", fields: [registerId], references: [id], onDelete: Cascade)
  responseAction ResponseAction @relation(fields: [responseActionId], references: [id], onDelete: Cascade)
  createdBy      User           @relation("RiskResponseActionCreatedBy", fields: [createdByUserId], references: [id], onDelete: Restrict)

  @@unique([riskId, responseActionId])
  @@index([riskId, displayOrder])
  @@index([registerId])
  @@index([responseActionId])
  @@map("risk_response_action")
}
```

**Back-relations to add to existing models:**

On `PersonReference`:
```prisma
  responseActionOwners ResponseAction[] @relation("ResponseActionOwnerPerson")
```

On `User`:
```prisma
  responseActionsOwned          ResponseAction[] @relation("ResponseActionOwnerUser")
  responseActionsCreated        ResponseAction[] @relation("ResponseActionCreatedBy")
  responseActionsUpdated        ResponseAction[] @relation("ResponseActionUpdatedBy")
  responseActionsDeleted        ResponseAction[] @relation("ResponseActionDeletedBy")
  riskResponseActionLinksCreated RiskResponseAction[] @relation("RiskResponseActionCreatedBy")
```

On `Risk`:
```prisma
  responseActionLinks RiskResponseAction[] @relation("RiskResponseActions")
```

On `Register`:
```prisma
  responseActionLinks RiskResponseAction[] @relation("RegisterResponseActions")
```

**AuditObjectType enum — add two new values:**
```prisma
  RESPONSE_ACTION
  RISK_RESPONSE_ACTION
```

**AuditScopeType enum — existing values cover this; no change required.** Response action audit
events will carry `scopeType = RISK` with the parent `riskId` populated.

#### Design notes

- `ResponseAction` is register-agnostic at the record level. The link table `RiskResponseAction`
  carries `registerId` as a denormalised index column so all actions for a register can be queried
  efficiently without joining through `risk`. This mirrors the pattern on `RiskCustomFieldValue`.
- Soft delete is on `ResponseAction` directly (not on the link row), consistent with the pattern
  used for config entities. `isDeleted + deletedAt + deletedByUserId` follows no existing Prisma
  pattern for hard data rows; the closest analogue is `isActive` on config entities. For action
  records, which are data not config, soft-delete with `isDeleted` / `deletedAt` /
  `deletedByUserId` is used to preserve audit continuity.
- `ownerPersonId` and `ownerUserId` on `ResponseAction` follow the exact same dual-reference pattern
  as `Risk.ownerPersonId` / `Risk.ownerUserId`. The `PersonReference` service resolves email → user
  link at write time; the permission layer uses `ownerUserId` for identity checks.
- `displayOrder` on `RiskResponseAction` allows the UI to control ordering per risk without
  reordering the underlying action records.
- The `Risk.responseAction` text field remains on the `Risk` model unchanged. In Simple mode it is
  read/written normally. In Child Records mode it is treated as read-only legacy data by the backend
  (never overwritten). No migration removes it from the schema.

---

### 2. Permission model

#### 2.1 New effective role

Add `RESPONSE_ACTION_OWNER` to the `EffectiveRegisterRole` union in
`backend/src/permissions/effectiveRole.ts`, ranked between `NONE` and `RISK_OWNER`:

```
NONE: 0
RESPONSE_ACTION_OWNER: 1
RISK_OWNER: 2
REGISTER_VIEWER: 3
REGISTER_ADMIN: 4
SYSTEM_ADMIN: 5
```

The existing `highestRole` and `roleAtLeast` functions require no change — they operate on the rank
map and will pick up the new entry automatically once added.

#### 2.2 Role derivation

`getEffectiveRegisterRole` in `backend/src/permissions/registerAccess.ts` currently checks:

1. System admin → `SYSTEM_ADMIN`
2. `RegisterPermission` rows → `REGISTER_ADMIN` or `REGISTER_VIEWER`
3. `Risk.ownerUserId` → `RISK_OWNER`

Add a fourth check: query `RiskResponseAction` joined to `ResponseAction` where
`ResponseAction.ownerUserId = actor.id` and `RiskResponseAction.registerId = registerId` and
`ResponseAction.isDeleted = false`. If any row is found, contribute `RESPONSE_ACTION_OWNER` to the
`highestRole` calculation.

Concrete addition to `getEffectiveRegisterRole` (after the `ownsRisk` check):

```ts
const ownsAction = await client.riskResponseAction.findFirst({
  where: {
    registerId,
    responseAction: {
      ownerUserId: actor.id,
      isDeleted: false
    }
  },
  select: { id: true }
});

return highestRole([
  ...permissions.map((p) => p.role),
  ownsRisk  ? "RISK_OWNER"              : "NONE",
  ownsAction ? "RESPONSE_ACTION_OWNER"  : "NONE"
]);
```

The same pattern must be applied in `listAccessibleRegisterIds` so that Response Action Owners
appear in the registers they can access.

#### 2.3 What a Response Action Owner can do

| Capability | Permitted |
|---|---|
| View their own assigned actions (all fields) | Yes |
| Update their own assigned actions (Response, Status fields only) | Yes |
| Re-assign Risk Response Owner on their own action | No (Register Admin only) |
| View parent risk in read-only mode (limited fields) | Yes — fields where `visibleToRiskResponseOwners = true` |
| Edit parent risk | No |
| View other actions linked to the same risk | No (only their own) |
| View the register risk list | No |
| Create new action records | No |
| Delete action records | No |

#### 2.4 Risk view filtering for Response Action Owners

When `canViewRisk` is called with an actor whose effective role is `RESPONSE_ACTION_OWNER` (i.e.
they are not a Risk Owner, Viewer, or Admin), the permission check must confirm the actor owns at
least one non-deleted action linked to that risk:

```ts
// In riskAccess.ts — extend the existing OR clause or add a separate path
const ownsLinkedAction = await client.riskResponseAction.findFirst({
  where: {
    riskId,
    registerId,
    responseAction: {
      ownerUserId: actor.id,
      isDeleted: false
    }
  },
  select: { id: true }
});
return ownsLinkedAction !== null;
```

The existing `canViewRisk` already falls through to a `risk.findFirst` for Risk Owners; add the
action ownership check in the same OR-style block (or as an additional fallback) so the function
returns `true` for Response Action Owners too.

`canEditRisk` must NOT be extended for Response Action Owners — they cannot edit risk fields.

#### 2.5 Field-level visibility for Response Action Owners

The existing `CustomFieldDefinition.visibleToRiskResponseOwners` boolean (already in the schema) is
the control gate. When the backend serialises a risk for a Response Action Owner:

- Include only fields where `visibleToRiskResponseOwners = true`.
- Always include: `displayRiskId`, `title`, `state` (the minimum context needed to understand which
  risk the action belongs to).
- Exclude: `responseAction` (the legacy simple-mode text field), scoring fields, review fields, and
  any custom field with `visibleToRiskResponseOwners = false`.

This serialisation difference should be implemented in the risk service's response-building logic
by checking `effectiveRole === "RESPONSE_ACTION_OWNER"` and applying the filter. A helper function
`isFieldVisibleToResponseActionOwner` should be added in `registerConfig.service.ts` alongside the
existing `isFieldVisibleToRole`.

#### 2.6 Middleware additions

Add two new middleware factories to `requirePermission.ts` following the existing pattern:

```ts
// Allows the actor to view a specific action if they own it or have register access
export function requireActionView(actionParam = "actionId", registerParam = "registerId")

// Allows the actor to update a specific action only if they own it
export function requireActionOwner(actionParam = "actionId", registerParam = "registerId")
```

Add corresponding permission functions in a new file
`backend/src/permissions/actionAccess.ts`:

```ts
export async function canViewAction(actor, registerId, actionId, client?)
export async function canEditAction(actor, registerId, actionId, client?)
export async function canDeleteAction(actor, registerId, actionId, client?)
```

- `canViewAction`: true for System Admin, Register Admin, Register Viewer, Risk Owner of a risk the
  action is linked to, or Response Action Owner of that specific action.
- `canEditAction`: true for System Admin, Register Admin, Risk Owner of a linked risk, or Response
  Action Owner of that specific action (but limited to `response` and `status` fields only — the
  service layer enforces which fields they may write).
- `canDeleteAction`: true for System Admin and Register Admin only.

---

### 3. Migration approach

#### 3.1 Trigger

Migration is triggered when a Register Admin changes `Register.responseActionMode` from `SIMPLE` to
`CHILD_RECORDS` via `PATCH /api/v1/registers/:registerId/settings`.

#### 3.2 What the migration does

For every `Risk` in the register where `Risk.responseAction IS NOT NULL AND Risk.responseAction != ''`:

1. Create one `ResponseAction` record with:
   - `response` = `Risk.responseAction` (trimmed)
   - `status` = `PLANNED`
   - `ownerPersonId` = `null`
   - `ownerUserId` = `null`
   - `createdByUserId` = the actor performing the mode switch
   - `updatedByUserId` = the actor performing the mode switch
2. Create one `RiskResponseAction` link record with:
   - `riskId` = the risk's id
   - `registerId` = the register's id
   - `responseActionId` = the new action's id
   - `displayOrder` = `0`
   - `createdByUserId` = the actor performing the mode switch
3. The `Risk.responseAction` text field is NOT cleared. It is left as-is as read-only legacy data.
   This is a deliberate choice: it preserves the field value in case the admin reverts (see §3.5),
   and avoids a write that would trigger a `riskUpdated` audit event for every risk.

#### 3.3 Where migration runs

The migration runs inside the same database transaction as the `Register.responseActionMode` update.
It is implemented in the registers service (`registers.service.ts`) as a dedicated private function
`migrateSimpleResponseActionsToChildRecords(registerId, actorId, tx)` called from within the
`prisma.$transaction(...)` block that also writes the mode change.

This approach avoids a separate migration endpoint (which would add surface area and require
idempotency tracking) and avoids Prisma middleware (which would make the side effect invisible and
hard to test). The service layer is the correct home for this logic.

#### 3.4 Concurrency safety

The transaction that switches the mode and creates the child records must use `SELECT ... FOR UPDATE`
on the `Register` row to prevent two concurrent admin requests from triggering the migration twice.
In Prisma, this is achieved with `prisma.$executeRaw`:

```ts
await tx.$executeRaw`SELECT id FROM register WHERE id = ${registerId} FOR UPDATE`;
```

Run this as the first statement inside the transaction. Any concurrent request attempting the same
switch will block at this point until the first transaction commits. Once the first transaction
commits with `responseActionMode = CHILD_RECORDS`, the second transaction's subsequent
mode-change validation (which re-reads the register to confirm the current mode before acting) will
see `CHILD_RECORDS` already and abort cleanly with a `409 CONFLICT` error to the caller.

The validation check is: before running the migration, read the register's current
`responseActionMode` inside the transaction (after acquiring the lock). If it is already
`CHILD_RECORDS`, return early without creating duplicate records.

#### 3.5 Reverting mode

Switching back from `CHILD_RECORDS` to `SIMPLE` is not supported in this release. The API will
return `400 INVALID_OPERATION` if a Register Admin attempts to set `responseActionMode = SIMPLE`
on a register that is already in `CHILD_RECORDS` mode. This restriction can be lifted in a future
release once a data-reconciliation strategy is defined.

#### 3.6 Audit

Emit one audit event for the mode switch itself (`registerSettingsUpdated` with a field change
entry for `responseActionMode`). Emit one `RESPONSE_ACTION` / `responseActionCreated` audit event
per migrated action — scoped to `RISK` with the parent risk's `registerId` and `riskId` populated.
The summary should read: `"Response action migrated from simple field during mode switch"`.

---

### 4. API contract summary

All paths are under `/api/v1/`. Authentication is required on all endpoints.

#### 4.1 Register settings (extend existing endpoint)

| Method | Path | Who | What |
|---|---|---|---|
| PATCH | `/registers/:registerId/settings` | Register Admin | Add `responseActionMode` as an accepted field. Switching from SIMPLE to CHILD_RECORDS triggers migration (§3). Switching to SIMPLE when already CHILD_RECORDS returns 400. |

#### 4.2 Response Action CRUD

| Method | Path | Who | What |
|---|---|---|---|
| GET | `/registers/:registerId/risks/:riskId/actions` | Register Admin, Register Viewer, Risk Owner, Response Action Owner (own actions only) | List non-deleted actions linked to this risk, ordered by `displayOrder`. |
| POST | `/registers/:registerId/risks/:riskId/actions` | Register Admin, Risk Owner | Create a new ResponseAction and link it to this risk. Body: `{ response, status?, ownerPersonId?, ownerEmail? }`. Returns the created action with link. |
| GET | `/registers/:registerId/risks/:riskId/actions/:actionId` | Same as list + own-action check for Response Action Owners | Get a single action. |
| PATCH | `/registers/:registerId/risks/:riskId/actions/:actionId` | Register Admin, Risk Owner (all fields); Response Action Owner (response, status only) | Update action fields. The service layer enforces field-level write restrictions by role. Body: `{ response?, status?, ownerPersonId?, ownerEmail? }`. |
| DELETE | `/registers/:registerId/risks/:riskId/actions/:actionId` | Register Admin only | Soft-delete: sets `isDeleted = true`, `deletedAt`, `deletedByUserId`. Does not remove the link row (preserves audit trail). |

**Note on owner resolution:** `ownerPersonId` and `ownerEmail` follow the same pattern as the Risk
Owner person picker. The backend should accept `ownerEmail` and resolve it through the
`PersonReference` service to obtain `ownerPersonId` and `ownerUserId`. The `ownerPersonId` is what
is stored; `ownerUserId` is denormalised at write time if the person reference is already linked to
a user.

**Register mode guard:** All action endpoints must verify that `register.responseActionMode =
CHILD_RECORDS`. If not, return `409 CONFLICT` with code `INVALID_MODE`.

**Response envelope:** Follow the existing API standards envelope (`{ data: ... }` for single
objects, `{ data: [...], meta: { total } }` for lists). No pagination is required for actions in
this release (the list is unbounded but expected to be small per risk).

**Response shape for a single action:**

```json
{
  "id": "uuid",
  "response": "text",
  "status": "PLANNED",
  "owner": {
    "personId": "uuid | null",
    "userId": "uuid | null",
    "email": "string | null",
    "displayName": "string | null"
  },
  "isDeleted": false,
  "createdAt": "ISO8601",
  "createdBy": { "id": "uuid", "name": "string", "email": "string" },
  "updatedAt": "ISO8601",
  "updatedBy": { "id": "uuid", "name": "string", "email": "string" }
}
```

#### 4.3 Risk read — mode-aware response

The existing `GET /registers/:registerId/risks/:riskId` endpoint must be extended to:

- Include `responseActionMode` from the register in the response (or include it on the register
  object if the risk response already embeds register metadata).
- When `responseActionMode = CHILD_RECORDS` and the actor is a Response Action Owner, omit fields
  where `visibleToRiskResponseOwners = false` and omit the legacy `responseAction` text field.
- When `responseActionMode = CHILD_RECORDS` and the actor is a Register Admin / Viewer / Risk Owner,
  include the full risk fields as today and additionally include the action list inline or signal to
  the frontend that actions should be fetched separately (the action list endpoint is the canonical
  source; inline embedding is optional).

#### 4.4 Audit events to add to `auditActions`

```ts
responseActionCreated:  "RESPONSE_ACTION_CREATED"
responseActionUpdated:  "RESPONSE_ACTION_UPDATED"
responseActionDeleted:  "RESPONSE_ACTION_DELETED"
responseActionMigrated: "RESPONSE_ACTION_MIGRATED"
```

---

### 5. Frontend contract summary

#### 5.1 New data shapes (extend shared types)

The Backend Developer will expose the response shape defined in §4.2. The Frontend Developer should
define a corresponding `ResponseAction` type in `shared/` (following existing shared-type patterns)
with these fields:

```ts
type ResponseActionStatus = "PLANNED" | "IN_PROGRESS" | "IMPLEMENTED" | "DEFERRED" | "CANCELLED";
type ResponseActionMode   = "SIMPLE" | "CHILD_RECORDS";

interface ResponseActionOwner {
  personId:    string | null;
  userId:      string | null;
  email:       string | null;
  displayName: string | null;
}

interface ResponseAction {
  id:          string;
  response:    string;
  status:      ResponseActionStatus;
  owner:       ResponseActionOwner;
  isDeleted:   boolean;
  createdAt:   string;
  createdBy:   { id: string; name: string; email: string };
  updatedAt:   string;
  updatedBy:   { id: string; name: string; email: string };
}
```

The `Register` type should gain `responseActionMode: ResponseActionMode`.

#### 5.2 Register settings UI

- The Register Settings page gains a "Response Actions" section with a `ResponseActionMode` toggle
  (Simple / Child Records). Switching to Child Records shows a confirmation dialog warning that
  existing simple-field values will be converted. The PATCH request sends
  `{ responseActionMode: "CHILD_RECORDS" }`. A 409 from the server (already CHILD_RECORDS) should
  be handled gracefully as a no-op.

#### 5.3 Risk detail UI — child records mode

When `register.responseActionMode === "CHILD_RECORDS"`:

- Replace the legacy Response Action text area on the Risk form with a "Response Actions" child
  table panel.
- The panel lists actions from `GET .../risks/:riskId/actions`. Each row shows: Response (truncated),
  Status badge, Owner display name.
- Register Admins and Risk Owners see an "Add Action" button which opens a drawer/modal with fields:
  Response (multiline text, required), Status (select, defaults to Planned), Owner (person picker).
- Each action row has Edit (drawer/modal, same fields) and Delete (confirmation dialog) controls,
  visible according to the permissions table in §2.3.
- Response Action Owners see only their own actions and can edit Response and Status fields only;
  the Owner field is read-only for them.
- The legacy `responseAction` text field is hidden from all users when in Child Records mode (even
  though the backend preserves the value).

#### 5.4 Risk detail UI — Response Action Owner limited view

When the current user's effective role is `RESPONSE_ACTION_OWNER` on a register:

- The risk detail page renders in a restricted read-only mode.
- Only fields where `visibleToRiskResponseOwners = true` are shown, plus `displayRiskId` and `title`.
- The Response Actions panel is visible and shows the user's own actions only, editable (Response
  and Status only).
- No risk edit button is shown.

#### 5.5 TanStack Query keys

Suggested query key conventions to enable correct cache invalidation:

- Action list: `["registers", registerId, "risks", riskId, "actions"]`
- Single action: `["registers", registerId, "risks", riskId, "actions", actionId]`

Mutations that create/update/delete an action should invalidate the action list key.

---

## Consequences

**Positive:**
- Risk Response Owner is a first-class permission tier that integrates cleanly into the existing
  role hierarchy without breaking any existing check.
- The many-to-many link table supports future cross-risk action sharing with no schema changes.
- Soft delete on `ResponseAction` preserves the audit trail and is consistent with config-entity
  conventions.
- Migration runs atomically within the mode-change transaction with a row lock — no separate
  migration endpoint, no risk of partial state.

**Negative / trade-offs:**
- `getEffectiveRegisterRole` now performs a third DB query for Response Action Owner derivation.
  This is acceptable for the current scale; if it becomes a performance concern, the three checks
  (permissions, risk ownership, action ownership) can be combined into a single raw query in a
  future release.
- Revert from CHILD_RECORDS to SIMPLE is blocked. This is the safest default; a bidirectional
  migration strategy can be designed in a follow-up.
- The legacy `Risk.responseAction` field is not cleared after migration. This is intentional (audit
  continuity, safe revert path) but means the schema carries a field that is functionally inert in
  Child Records mode. Remove it in a future release once all registers have migrated and reversal
  is no longer a concern.

---

## Alternatives considered

**Single action table without a link table:** Simpler, but forecloses the many-to-many requirement
stated in the work item brief. Rejected.

**Store Risk Response Owner as a custom field:** The PRD explicitly states it is a built-in
first-class field because it drives permission derivation. Custom fields do not feed the permission
layer. Rejected.

**Dedicated migration endpoint:** Would require idempotency tracking, separate auth check, and
additional API surface. Running the migration inside the mode-change transaction is simpler and
safer. Rejected.

**Use `isActive` instead of `isDeleted` for soft delete on actions:** `isActive` is used for config
entities that can be reactivated (likelihood values, custom fields, etc.). Deleted actions should
not be reactivated — soft delete with `isDeleted` is the more semantically correct choice for data
records. Rejected.

---

## Amendment — Draft-gated `responseActionMode` toggle

**Status:** Accepted  
**Date:** 2026-06-20  
**Amends:** §3.1, §3.3, §4.1, §5.2 of this ADR  
**Trigger:** Verification of PM7-CORE revealed that the immediate PATCH-triggered mode switch
bypasses the draft config system, which is inconsistent with all other register settings changes.
The product owner requires `responseActionMode` to follow the same draft gate as every other setting.

---

### A.1 What changes at the conceptual level

The original design triggered migration the instant the Register Admin sent
`PATCH /registers/:registerId/settings` with `responseActionMode: "CHILD_RECORDS"`. This was a
deliberate simplification: the draft config system did not exist at the time the original ADR was
written.

The amended design integrates `responseActionMode` fully into the draft config lifecycle:

1. The intended mode value is stored in the draft config snapshot.
2. Migration does not run at toggle time — it runs at publish time.
3. The toggle is subject to the same `settingsLocked` gate as every other register setting.
4. If the admin toggles SIMPLE → CHILD_RECORDS then back to SIMPLE before publishing, publish is a
   no-op for this field.

---

### A.2 Where the pending value lives during draft

`responseActionMode` is added to `ConfigSnapshotRegisterSettings` (in
`backend/src/types/configSnapshot.ts`) as a new field:

```ts
responseActionMode: "SIMPLE" | "CHILD_RECORDS";
```

This is the correct location for two reasons:

- All other register settings that participate in the draft cycle already live in
  `snapshot.register` (the `ConfigSnapshotRegisterSettings` block). There is no existing
  per-register staging field on `Register` itself, and introducing one would create a second
  divergent pattern.
- The snapshot already captures `scoringFormula` on `snapshot.register` even though it also lives
  on the `Register` row (published separately at publish time). The `responseActionMode` field
  follows the same pattern.

A `pendingResponseActionMode` field on `Register` is explicitly rejected: it would require a
schema migration for what is purely a snapshot concern, and it would create asymmetry where one
setting has first-class staging but others do not.

When `createDraft` runs, `buildSnapshotFromRelationalTables` must be extended to include the
register's current live `responseActionMode` in the snapshot's `register` block. When an existing
current config version is cloned into a new draft, the cloned snapshot will carry the value already
if the snapshot was built after this amendment takes effect; for snapshots built before this
amendment (which lack the field), the missing field should be treated as `"SIMPLE"` at read time
via a normalize step.

---

### A.3 How the toggle interacts with the draft

The existing `updateDraft` service function accepts a `patch.register` object and shallow-merges it
into `snapshot.register`. No structural change to `updateDraft` is needed. The backend validator
for `UpdateDraftBody` (in `backend/src/validators/configVersion.schemas.js`) must accept
`responseActionMode: z.enum(["SIMPLE", "CHILD_RECORDS"]).optional()` within the `register` patch
sub-object.

The frontend's `RegisterSettingsTab` already saves all other register settings through
`updateRegister` (the direct `PATCH /registers/:registerId` endpoint). However, `responseActionMode`
in draft mode must save through the draft update path (`PATCH /registers/:registerId/config-versions/draft`
with `{ register: { responseActionMode: "..." } }`), not through `updateRegister`, because the
whole point is that the change must not take immediate effect.

The simplest frontend approach: treat `responseActionMode` as a distinct form field in
`RegisterSettingsTab` that is only included in the `updateDraft` patch (not in the `updateRegister`
mutation). When `settingsLocked` is true (draft config mode is on but no draft exists), the toggle
is disabled. When `draftConfigMode && hasDraft`, the toggle is enabled and its save writes to the
draft. The existing `settingsLocked = draftConfigMode && !hasDraft` expression already provides this
gate — the toggle just needs to participate in it.

The draft snapshot value is the source of truth for the toggle's displayed state when in draft
mode. The frontend should read `snapshot.register.responseActionMode` from the draft when a draft
exists, and fall back to `register.responseActionMode` (the live value) when no draft exists.

---

### A.4 When migration runs — publish time hook

`publishDraft` in `backend/src/services/configVersion.service.ts` is the correct and only location
for the migration trigger. There is already a natural extension point: after all upsert sections
complete and before the final `Register` row update, insert a mode-change check.

The logic inside the `prisma.$transaction` block in `publishDraft`:

```ts
// --- Apply responseActionMode from snapshot (with migration if needed) ---
const snapshotMode = (snapshot.register as { responseActionMode?: string }).responseActionMode ?? "SIMPLE";
const currentMode  = (await tx.register.findUnique({
  where: { id: registerId },
  select: { responseActionMode: true }
}))?.responseActionMode ?? "SIMPLE";

if (snapshotMode === "CHILD_RECORDS" && currentMode === "SIMPLE") {
  // Acquire row lock before migration to prevent concurrent publishes
  await tx.$executeRaw`SELECT id FROM register WHERE id = ${registerId} FOR UPDATE`;
  await migrateSimpleResponseActionsToChildRecords(registerId, actorId, tx);
}
// If snapshotMode === currentMode: no-op.
// If snapshotMode === "SIMPLE" and currentMode === "CHILD_RECORDS": blocked (see §A.5).
```

The `migrateSimpleResponseActionsToChildRecords` function already exists in
`backend/src/services/registers.service.ts` and is the correct implementation to reuse. The backend
developer should move or export this function so that `configVersion.service.ts` can call it, or
extract it into a shared module (e.g. `responseActions.service.ts`). Duplicating the function is
not acceptable.

The `Register.responseActionMode` column is then set inside the existing `tx.register.update` call
at the bottom of `publishDraft`. The `responseActionMode` value from the snapshot must be added to
that update's `data` block:

```ts
responseActionMode: snapshotMode as "SIMPLE" | "CHILD_RECORDS",
```

This update is unconditional: if the snapshot says `SIMPLE` and the live value is already `SIMPLE`,
writing `SIMPLE` is a no-op at the database level.

The `analyseImpact` function should be extended to emit a warning when
`snapshot.register.responseActionMode === "CHILD_RECORDS"` and the live register is currently
`SIMPLE`, so that the admin is informed that migration will run. The warning text should read:
`"Publishing will migrate existing simple response action values to child action records."` This is
a warning, not a blocker — `canPublish` is not affected.

---

### A.5 Can the toggle go CHILD_RECORDS → SIMPLE in draft?

**Updated by Amendment B (2026-06-20). The unconditional block at publish time has been replaced
with a conditional feasibility check. See Amendment B below for the full design.**

Summary: free movement in draft remains correct (no data has changed). At publish time, a revert
from `CHILD_RECORDS` to `SIMPLE` is permitted if every risk in the register has 0 or 1 non-deleted
child action records. It is blocked if any risk has 2 or more.

---

### A.6 What changes to the existing code

#### Schema — no migration required

`Register.responseActionMode` already exists on the `Register` model in the Prisma schema. No
schema change is needed. The pending value travels through the `ConfigVersion.snapshotJson` JSONB
column, which is schemaless from Postgres's perspective. No new Prisma migration is required for
this amendment.

#### `backend/src/types/configSnapshot.ts`

- Add `responseActionMode: "SIMPLE" | "CHILD_RECORDS"` to `ConfigSnapshotRegisterSettings`.

#### `backend/src/services/configVersion.service.ts` — `buildSnapshotFromRelationalTables`

- Add `responseActionMode: true` to the `prisma.register.findUnique` select block.
- Include `responseActionMode: register.responseActionMode` in the returned `snapshot.register`
  object.

#### `backend/src/services/configVersion.service.ts` — `normalizeSnapshot`

- Add `responseActionMode: snapshot.register.responseActionMode ?? "SIMPLE"` to the
  `register` spread in `normalizeSnapshot`. This handles legacy snapshots that pre-date this field.

#### `backend/src/services/configVersion.service.ts` — `analyseImpact`

- Add a warning when `snapshotMode === "CHILD_RECORDS"` and live register mode is `"SIMPLE"`.
- For `snapshotMode === "SIMPLE"` and live register mode `"CHILD_RECORDS"`: run the feasibility
  check (Amendment B §B.2). If any risk has ≥ 2 non-deleted actions, emit a blocker. If feasible,
  emit a warning (not a blocker) so the admin is informed the revert migration will run. See
  Amendment B for the full logic and error shape.

#### `backend/src/services/configVersion.service.ts` — `publishDraft`

- Extract mode values (snapshot vs live) before the transaction's register update.
- Call `migrateSimpleResponseActionsToChildRecords` conditionally as described in §A.4.
- Call `migrateChildRecordsToSimple` conditionally when `snapshotMode === "SIMPLE"` and
  `currentMode === "CHILD_RECORDS"` (Amendment B §B.3). This path is only reached if
  `analyseImpact` confirmed feasibility — the guard inside the migration function should
  re-verify and throw if violated (defence in depth).
- Add `responseActionMode` to the `tx.register.update` data block (unconditional).

#### `backend/src/validators/configVersion.schemas.ts` (or `.js`)

- Add `responseActionMode: z.enum(["SIMPLE", "CHILD_RECORDS"]).optional()` to the `register`
  sub-object of the `UpdateDraftBody` schema.

#### `backend/src/services/registers.service.ts`

- Export `migrateSimpleResponseActionsToChildRecords` (currently private) so it can be called from
  `configVersion.service.ts`, OR move it to a shared location such as
  `backend/src/services/responseActions.service.ts`. The backend developer should choose the
  location that best fits the existing module structure; the key constraint is no duplication.
- The `updateRegister` function's guard (400 for CHILD_RECORDS → SIMPLE) remains unchanged — it
  applies to the direct settings PATCH path.
- The `PATCH /registers/:registerId/settings` endpoint should continue to reject
  `responseActionMode` when the register is in draft config mode and `settingsLocked` applies.
  Currently the endpoint accepts `responseActionMode` directly. Consider whether the validator
  or service layer should reject a direct `responseActionMode` change when a draft exists, to avoid
  confusion. This is a product call; architecturally either location is acceptable.

#### Frontend — `RegisterSettingsTab.tsx`

- Remove the separate "Switch to Child Records mode" button and the `switchToChildRecordsMutation`
  entirely.
- Remove the `childRecordsConfirmOpen` modal.
- Add `responseActionMode` as a form field in `settingsForm.initialValues`, seeded from
  `registerQuery.data?.responseActionMode` (live value when no draft) or from the draft snapshot
  value when a draft exists (the frontend must fetch and read the draft snapshot — or a simplified
  draft-settings endpoint — to know the pending value).
- Render a `Switch` or `SegmentedControl` for "Response Actions Mode" (Simple / Child Records)
  in the Response Actions settings section. Gate it with `disabled={!canManage || settingsLocked}`.
- When in draft config mode (`draftConfigMode && hasDraft`), saving this field must send it through
  the draft update mutation (`updateDraft` API call with `{ register: { responseActionMode } }`),
  not through `updateRegister`. The simplest implementation: if `draftConfigMode`, use a separate
  `updateDraftMutation` for `responseActionMode` changes, or include it in the draft save alongside
  other draft-eligible changes. The frontend developer should determine how to wire this given the
  existing split between the direct-settings save and draft save flows.
- When the live register is already in `CHILD_RECORDS` mode, the toggle should be rendered as
  checked and disabled regardless of draft state (since reverting is not supported, there is no
  point offering the toggle).
- Remove the import of `switchResponseActionMode` from `responseActions.api` once the button is
  gone.

---

### A.7 Audit event for mode change at publish time

The existing `configPublished` audit event (emitted at the end of `publishDraft`) covers the
publish as a whole. The migration-specific audit events (`responseActionMigrated` per action,
defined in §3.6 of this ADR) still apply and should be emitted inside
`migrateSimpleResponseActionsToChildRecords` exactly as originally specified.

No new audit event type is needed for the mode change itself — `configPublished` with
`metadataJson` is sufficient. The backend developer may optionally add `responseActionModeChanged:
true` to the `metadataJson` of the `configPublished` event when the mode changes at publish time,
to make the audit log more readable.

---

### A.8 Summary of original ADR sections superseded

| Original section | Status |
|---|---|
| §3.1 — Migration trigger: immediate PATCH | **Superseded.** Migration now triggers at publish time only. |
| §3.3 — Migration runs in `registers.service.ts` transaction | **Partially superseded.** The function remains there but is called from `publishDraft` in `configVersion.service.ts`. |
| §3.4 — Concurrency lock in `updateRegister` | **Retained for the direct-PATCH path.** A parallel lock is added in `publishDraft` for the draft publish path. |
| §4.1 — PATCH `/settings` triggers migration | **Superseded.** The PATCH endpoint no longer triggers migration; it remains valid for non-mode settings and for registers not in draft config mode. |
| §5.2 — "Switch to Child Records mode" button | **Superseded.** Replaced by a toggle in the settings form subject to `settingsLocked`. |

---

## Amendment B — Conditional CHILD_RECORDS → SIMPLE revert

**Status:** Accepted  
**Date:** 2026-06-20  
**Amends:** Amendment A §A.5, §A.6 (`analyseImpact`, `publishDraft`)  
**Trigger:** Product owner requires that revert from `CHILD_RECORDS` to `SIMPLE` be permitted when
the data loss can be reduced to a trivial copy — specifically when every risk in the register has
at most one non-deleted child action record, making the revert lossless (the single action's text
is written back into the legacy simple field).

---

### B.1 Principle

The revert is a conditional migration, not an unconditional block. The condition is evaluated at
two points:

1. **`analyseImpact`** — before publish, to surface the outcome to the admin as either a blocker
   or a warning.
2. **`migrateChildRecordsToSimple`** — inside the publish transaction, as defence-in-depth (data
   must not change between the impact check and the transaction commit).

The guard in `updateRegister` (the direct `PATCH /registers/:registerId/settings` path) continues
to block `CHILD_RECORDS → SIMPLE` unconditionally on the direct path. That path bypasses the
draft cycle and therefore bypasses the feasibility check infrastructure. This restriction on the
direct path is not relaxed by this amendment.

---

### B.2 Feasibility check

#### What "feasible" means

A revert is feasible if and only if every risk in the register (excluding deleted risks, i.e.
`Risk.isDeleted = false`) has **0 or 1** non-deleted `ResponseAction` records linked to it via
`RiskResponseAction`.

A risk with 0 actions: no write needed to `Risk.responseAction`. The field retains its pre-mode-
switch value (which was preserved intact per §3.2 of the original ADR).

A risk with exactly 1 action: `ResponseAction.response` is written into `Risk.responseAction` for
that risk.

If any risk has ≥ 2 non-deleted actions the revert cannot proceed without data loss (the second
and subsequent actions have no target field). This is a blocker.

#### Query pattern

```ts
// Run outside the publish transaction, inside analyseImpact, before emitting impact entries.
const actionCounts = await client.$queryRaw<{ risk_id: string; cnt: bigint }[]>`
  SELECT rra.risk_id, COUNT(ra.id) AS cnt
  FROM risk_response_action rra
  JOIN response_action ra ON ra.id = rra.response_action_id
  JOIN risk r ON r.id = rra.risk_id
  WHERE rra.register_id = ${registerId}
    AND ra.is_deleted   = false
    AND r.is_deleted    = false
  GROUP BY rra.risk_id
  HAVING COUNT(ra.id) >= 2
`;
```

If `actionCounts` is non-empty the revert is blocked. The query returns only the offending rows
(`HAVING COUNT >= 2`) so the result set is bounded by the number of problematic risks, not the
total risk count.

#### `analyseImpact` impact entries

When `snapshotMode === "SIMPLE"` and `currentMode === "CHILD_RECORDS"`:

- Run the feasibility query above.
- If `actionCounts.length > 0`:
  - Collect `displayRiskId` and `title` for each offending `riskId` (a follow-up
    `risk.findMany({ where: { id: { in: offendingIds } }, select: { displayRiskId, title } })` is
    the correct approach — do not join in the raw query; keep the raw query minimal).
  - Emit one **blocker** impact entry (type `"BLOCKER"` in the existing `analyseImpact` structure)
    with code `REVERT_MODE_BLOCKED_MULTIPLE_ACTIONS`. This prevents `canPublish` from returning
    `true`.
- If `actionCounts.length === 0`:
  - Emit one **warning** impact entry with code `REVERT_MODE_WILL_MIGRATE`. Text:
    `"Publishing will revert Response Action mode to Simple. Each risk's most recent action text
    will be written back to the simple response field, and all child action records will be
    soft-deleted."` This does not block publish.

---

### B.3 Error shape for the blocker

The blocker must carry enough information for the frontend to show the admin exactly which risks
to fix. The blocker impact entry follows the existing `analyseImpact` impact-entry shape, extended
with a `meta` field:

```ts
{
  type:    "BLOCKER",
  code:    "REVERT_MODE_BLOCKED_MULTIPLE_ACTIONS",
  message: "Cannot revert Response Action mode to Simple: the following risks have 2 or more active action records. Reduce each to a single action (or delete all actions) before publishing.",
  meta: {
    offendingRisks: [
      { riskId: "uuid", displayRiskId: "R-001", title: "Risk title" },
      ...
    ]
  }
}
```

The `meta.offendingRisks` array is the authoritative error payload. The frontend should render it
as a list of links or risk identifiers so the admin can navigate directly to each risk and resolve
the conflict.

If the existing `analyseImpact` return type does not currently include a `meta` field on impact
entries, the backend developer must extend the `ImpactEntry` type (in
`backend/src/types/configVersion.ts` or equivalent) to accept `meta?: Record<string, unknown>`.
The frontend impact-display component must be extended to handle the `offendingRisks` list when
`code === "REVERT_MODE_BLOCKED_MULTIPLE_ACTIONS"`.

---

### B.4 Revert migration at publish time

#### Function signature

```ts
async function migrateChildRecordsToSimple(
  registerId: string,
  actorId:    string,
  tx:         Prisma.TransactionClient
): Promise<void>
```

Locate this function alongside `migrateSimpleResponseActionsToChildRecords` — in whichever shared
module the backend developer chose when exporting that function (per A.6).

#### What the function does

1. **Re-verify feasibility inside the transaction** (defence in depth):

   ```ts
   const blockers = await tx.$queryRaw<{ risk_id: string }[]>`
     SELECT rra.risk_id
     FROM risk_response_action rra
     JOIN response_action ra ON ra.id = rra.response_action_id
     JOIN risk r ON r.id = rra.risk_id
     WHERE rra.register_id = ${registerId}
       AND ra.is_deleted   = false
       AND r.is_deleted    = false
     GROUP BY rra.risk_id
     HAVING COUNT(ra.id) >= 2
   `;
   if (blockers.length > 0) {
     throw new ConflictError("REVERT_MODE_BLOCKED_MULTIPLE_ACTIONS",
       "One or more risks have multiple active action records; revert aborted.");
   }
   ```

2. **Fetch risks with exactly 1 non-deleted action** and their action's `response` text:

   ```ts
   const singles = await tx.$queryRaw<{ risk_id: string; response: string; action_id: string }[]>`
     SELECT rra.risk_id, ra.response, ra.id AS action_id
     FROM risk_response_action rra
     JOIN response_action ra ON ra.id = rra.response_action_id
     JOIN risk r ON r.id = rra.risk_id
     WHERE rra.register_id = ${registerId}
       AND ra.is_deleted   = false
       AND r.is_deleted    = false
   `;
   // At this point we know each risk_id appears exactly once (verified by step 1).
   ```

3. **Write `ResponseAction.response` back into `Risk.responseAction`** for each single-action risk:

   ```ts
   for (const row of singles) {
     await tx.risk.update({
       where: { id: row.risk_id },
       data: {
         responseAction:  row.response,
         updatedAt:       new Date(),
         updatedByUserId: actorId
       }
     });
   }
   ```

   Risks with 0 actions are not touched — their `Risk.responseAction` value is already intact
   from before the forward migration (per §3.2 of the original ADR, the field was never cleared).

4. **Soft-delete all `ResponseAction` records for this register:**

   ```ts
   // Collect all non-deleted action IDs for this register.
   const actionIds = await tx.riskResponseAction.findMany({
     where: { registerId },
     select: { responseActionId: true }
   });
   const ids = [...new Set(actionIds.map(r => r.responseActionId))];

   await tx.responseAction.updateMany({
     where: { id: { in: ids }, isDeleted: false },
     data: {
       isDeleted:       true,
       deletedAt:       new Date(),
       deletedByUserId: actorId
     }
   });
   ```

   The `RiskResponseAction` link rows are left as-is. They reference soft-deleted actions and are
   therefore excluded from all active-record queries (which always filter `ra.isDeleted = false`).
   No hard delete is performed; the link rows preserve the audit trail.

5. **Emit audit events** (see §B.5).

#### Transaction context

This function is called from within the `prisma.$transaction` block in `publishDraft`, after the
`migrateSimpleResponseActionsToChildRecords` branch and before the final `tx.register.update`.
The row lock on `Register` (acquired at the top of the publish transaction per §A.4) prevents
concurrent revert attempts on the same register.

---

### B.5 Audit events for the revert migration

Two event types are emitted from within `migrateChildRecordsToSimple`:

#### Per-action soft-delete event

Emit one `RESPONSE_ACTION` / `responseActionDeleted` audit event per soft-deleted `ResponseAction`
record, following the same structure used for user-initiated deletes (§4.4 of the original ADR):

- `objectType`: `RESPONSE_ACTION`
- `objectId`: the `ResponseAction.id`
- `action`: `responseActionDeleted`
- `scopeType`: `RISK`
- `registerId`: the register's id
- `riskId`: obtained from the `RiskResponseAction` link row
- `actorId`: the publishing actor
- `metadataJson`: `{ "reason": "mode_revert_to_simple" }`
- `summary`: `"Response action soft-deleted during revert to Simple mode"`

#### Per-risk write-back event

Emit one `RISK` / `riskUpdated` audit event per risk whose `responseAction` field was written
(i.e. for each risk in `singles`):

- `objectType`: `RISK`
- `objectId`: the `Risk.id`
- `action`: `riskUpdated`
- `scopeType`: `RISK`
- `registerId`: the register's id
- `riskId`: the `Risk.id`
- `actorId`: the publishing actor
- `metadataJson`: `{ "fields": ["responseAction"], "reason": "mode_revert_to_simple" }`
- `summary`: `"Response action text written back to simple field during revert to Simple mode"`

Risks with 0 actions (not in `singles`) do not generate a `riskUpdated` event — no field was
written.

The existing `configPublished` audit event (emitted at the end of `publishDraft`) covers the
publish as a whole and does not need a new variant for the revert case. The backend developer may
optionally add `responseActionModeReverted: true` to its `metadataJson` for readability, consistent
with the analogous suggestion in §A.7 for the forward migration.

---

### B.6 Frontend changes for the revert path

#### Settings toggle behaviour

Per Amendment A §A.6, the toggle is disabled and stuck at `CHILD_RECORDS` when the live register
is already in that mode. This rule is relaxed: once the revert path exists, the toggle should be
enabled when a draft exists and the live mode is `CHILD_RECORDS`. The existing `settingsLocked`
gate (disabled when no draft) continues to apply.

The frontend developer must remove the "always disabled when live = CHILD_RECORDS" rule from the
toggle's `disabled` expression and replace it with: `disabled={!canManage || settingsLocked}` —
i.e. the same gate as all other draft-eligible settings.

#### Impact display for the blocker

The impact display component (wherever `analyseImpact` results are rendered before the publish
confirmation) must handle the `REVERT_MODE_BLOCKED_MULTIPLE_ACTIONS` blocker code:

- Render the standard blocker message.
- Below it, render a list of offending risks from `meta.offendingRisks`, showing `displayRiskId`
  and `title` for each entry. Each item should link to the risk detail page so the admin can
  navigate directly.

The frontend developer should treat `meta` as optional and unknown until the `code` is
`REVERT_MODE_BLOCKED_MULTIPLE_ACTIONS`, at which point it can be cast to
`{ offendingRisks: { riskId: string; displayRiskId: string; title: string }[] }`.

#### Impact display for the revert warning

When `code === "REVERT_MODE_WILL_MIGRATE"` (the feasible-revert warning), render it as a standard
warning in the impact list with the message text from §B.2. No special list rendering is needed.

---

### B.7 Summary of sections superseded or updated by this amendment

| Section | Status |
|---|---|
| Amendment A §A.5 — unconditional block at publish time | **Superseded.** Replaced by conditional feasibility check (§B.2). |
| Amendment A §A.6 `analyseImpact` — add blocker for CHILD_RECORDS → SIMPLE | **Updated.** Blocker is now conditional on feasibility query result (§B.2). A warning replaces it when feasible. |
| Amendment A §A.6 `publishDraft` — no revert path | **Updated.** `publishDraft` now calls `migrateChildRecordsToSimple` when `snapshotMode = SIMPLE` and `currentMode = CHILD_RECORDS`. |
| Amendment A §A.6 Frontend — toggle always disabled when live = CHILD_RECORDS | **Updated.** Toggle is enabled in draft mode (§B.6). |
| Original ADR §3.5 — revert not supported | **Partially superseded.** Revert is now supported through the draft publish path under the feasibility condition. The direct `PATCH /settings` path continues to block unconditionally. |
