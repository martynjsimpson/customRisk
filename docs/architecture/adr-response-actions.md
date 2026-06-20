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
