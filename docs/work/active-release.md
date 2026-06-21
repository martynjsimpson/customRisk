# Active Release

Status: ready-for-release
Version: v1.19.0

## Release goal

Introduce first-class child-record Response Actions. By the end of this release, Register Admins can switch a register to child record mode, and users can create, view, update, and delete Response Action records linked to risks — with a full audit trail and Risk Response Owner permissions working end to end.

## Selected work items

### PM7-CORE — Introduce child-record response actions
Source: REQ-005
Capability: child-actions
Status: done
done_in: v1.19.0
Depends on: PM5-CORE (done), PM6-SCORING (done)

**Problem:** Response actions currently behave as a simple field on each risk. There is no way to separately own, track, or audit them as first-class records. Risk Owners have no way to see which actions are in progress or completed without opening each risk individually.

**Acceptance criteria:**
- A register has a "Response Action Mode" configuration setting (Simple / Child Records). Default for existing registers is Simple; default for new registers is Simple.
- When switching from Simple to Child Records, any existing simple-field response action values are migrated: each non-empty value is converted into one child action record linked to that risk. PA to confirm and design the migration step before implementation.
- Child action records have three built-in fields: Response (multi-line text), Status (dropdown), and Risk Response Owner (Person Picker). Status defaults are: Planned, In Progress, Implemented, Deferred, Cancelled.
- Risk Response Owner is a built-in first-class field (not a Register Admin custom field) because it drives permission derivation (§12.5). PA to confirm how this integrates with the permission model in the schema.
- Risk Owners can create new action records linked to risks they own, edit and soft-delete those actions, and view all actions linked to their risks.
- Risk Response Owners (derived from the Risk Response Owner field) can see and update their assigned actions. They can see limited read-only parent-risk context for fields marked "Visible to Risk Response Owners" (§5.3). They do not gain full access to the parent risk.
- Register Admins and System Admins have full CRUD on all actions within their register scope.
- Register Viewers can see all actions linked to risks they can view. They cannot edit.
- The risk detail modal shows linked actions with their current status. Developer to choose an appropriate Mantine treatment for the actions section (e.g. a sub-table or card list).
- Users can add a new action from the risk detail modal. An action add/edit modal opens in-place.
- Soft delete of an action requires confirmation. If the action is linked to only one risk and that risk is being hard-deleted, the delete flow offers to also delete the now-orphaned action (§9.4).
- All action field changes, status changes, and link changes are captured in the Risk Response Audit Log following the standard audit structure (who, when, what, where) (§14.4).
- The risk audit log records that a linked action changed status, so the Risk Owner can see action-level context in the risk's own audit view (§14.3).
- Help content in `frontend/public/help/en/` updated to cover Response Action child record mode: what it is, how to enable it, how to create/manage actions, and what Risk Response Owners can see and do.

**Decision:** Mode switching → convert existing simple-field response values into one child action record per risk when switching to child record mode. PA to design the migration step and confirm the approach is safe before implementation starts.

**Decision:** Status values → ship with hardcoded defaults (Planned / In Progress / Implemented / Deferred / Cancelled). Status configuration UI deferred to a follow-up release.

**Decision:** Many-to-many link model → schema must support one action linked to multiple risks from day one (§9.3). UI only needs to surface "add new action to this risk" for this release; the "link an existing action to an additional risk" flow is deferred.

**Decision:** Custom fields on actions → deferred. Only the three built-in fields (Response, Status, Risk Response Owner) ship in this release.

**Decision:** /my-actions page (Risk Response Owner's dedicated cross-risk action view) → deferred to a follow-up release.

**Decision (Amendment A):** Mode switching is draft-gated. The toggle is only editable when the register has an active draft. Nothing changes at toggle time; the migration fires at publish time. This keeps mode changes consistent with all other config changes.

**Decision (Amendment B):** CHILD_RECORDS → SIMPLE revert is allowed if every risk has 0 or 1 active action records. If any risk has 2 or more, publish is blocked and the offending risks are listed so the user can reduce them manually. If the revert is feasible, each single action's response text is written back to the simple field and all child action records are soft-deleted.

**Key files (expected):**
- `backend/prisma/schema.prisma` (new tables — PA to define)
- `backend/src/services/` (new responseActions service)
- `backend/src/routes/` (new responseActions routes)
- `frontend/src/features/risks/RiskDetailModal.tsx` (actions section)
- `frontend/src/features/risks/ResponseActionModal.tsx` (new — add/edit action)
- `frontend/src/pages/RegisterConfigPage.tsx` (mode toggle in settings)
- `frontend/public/help/en/` (help content update)

**Tests:**
- `backend/test/responseActions.test.mjs` (new)
- `frontend/test/risks.test.mjs`
- `frontend/test/configuration.test.mjs`

---

## Required agents

- **principal-architect** — schema design (action records table, risk-action link table), permission model integration (Risk Response Owner derivation), migration approach for simple→child mode conversion. PA must complete and document the schema and migration design before backend implementation begins.
- **backend-developer** — CRUD and link management for action records, permission enforcement, Risk Response Audit Log, risk audit cross-reference for action status changes, simple→child migration on mode toggle.
- **frontend-developer** — actions section in risk detail modal, action add/edit modal, "Response Action Mode" toggle in register config settings, help content update.
- **test-engineer** — backend test coverage for CRUD, permissions, audit, and migration; frontend behavioral tests for action display, add/edit/delete flows.

**Sequencing:** PA goes first. Backend cannot start schema-dependent work until PA delivers the schema and migration design. Frontend can begin config toggle and modal scaffolding once the API contract is broadly known but should not finalise permission-dependent UI until backend is stable.

## Decisions

No open decisions. All decisions above are resolved.

## Test / sign-off

- [x] Implementation complete
- [x] Regression tests pass (288 backend, 122 frontend static, 95 frontend runtime — all green)
- [x] TypeScript typecheck clean
- [x] Documentation pass complete (help content updated, ADR-0011 with Amendments A and B)

## Blockers

None.

## Verification feedback

**Verification feedback (1):** Switching Response Action Mode on an existing register throws "Route not found".
**Investigation:** `switchResponseActionMode` in `frontend/src/api/responseActions.api.ts` calls `PATCH /registers/:registerId/settings`, but the backend register update endpoint is `PATCH /registers/:registerId` (no `/settings` suffix).
**Ruling:** In scope — mode switching is a core acceptance criterion and this is a URL mismatch.
**Fix:** Updated the fetch URL in `switchResponseActionMode`.

---

**Verification feedback (2):** After switching to Child Records mode, opening a risk still shows the Response Action text area in both the view modal and edit modal.
**Investigation:** `registerConfigSelect` in `backend/src/services/registerConfig.service.ts` did not include `responseActionMode`. The `risk-form-config` endpoint returned `undefined`, which fell back to `"SIMPLE"`.
**Ruling:** In scope — mode-conditional rendering is a core acceptance criterion.
**Fix:** Added `responseActionMode: true` to `registerConfigSelect`.

---

**Verification feedback (3):** Toggle should be draft-gated — nothing should change until the config is published.
**Investigation:** The original implementation changed the mode immediately on toggle. The correct architecture is: toggle is disabled until a draft exists, the change is stored in the draft snapshot, and migration fires at publish time.
**Ruling:** In scope — architectural decision, approved by PA (Amendment A to ADR-0011).
**Fix:** Refactored mode toggle to use `updateDraftConfig` path; migration moved from `updateRegister` to `publishDraft`.

---

**Verification feedback (4):** CHILD_RECORDS → SIMPLE revert should be allowed when each risk has 0 or 1 actions.
**Investigation:** Original design blocked all reverts. PA reviewed and approved conditional revert (Amendment B to ADR-0011).
**Ruling:** In scope — approved extension.
**Fix:** Added `migrateChildRecordsToSimple`, feasibility check, `REVERT_MODE_BLOCKED_MULTIPLE_ACTIONS` blocker, and structured `impactEntries` in `analyseImpact`.

---

**Verification feedback (5):** Publishing draft throws 500 "An unexpected error occurred" when reverting from CHILD_RECORDS to SIMPLE.
**Investigation (HAR 1):** Raw SQL used `r.is_deleted = false` but the `risk` table has no such column — it uses `is_active`. Fixed.
**Investigation (HAR 2):** Draft snapshot missing `responseActionMode` because backend not restarted; and stale compiled code path.
**Investigation (HAR 3 — final):** `r.is_active = true` also does not exist on the `risk` table. The risk table uses `state RiskState` (DRAFT/OPEN/CLOSED). All raw SQL queries updated to `r.state <> 'CLOSED'`. Additionally `tx.risk.update()` used `updatedAt`/`updatedByUserId` but the Risk model uses `systemUpdatedAt`/`systemUpdatedByUserId`. Both fixed.
**Ruling:** In scope — publish is a core acceptance criterion.
**Fix:** Replace `r.is_active = true` with `r.state <> 'CLOSED'` in all four raw SQL queries across `configVersion.service.ts` and `responseActions.service.ts`; replace `updatedAt`/`updatedByUserId` with `systemUpdatedAt`/`systemUpdatedByUserId` in `migrateChildRecordsToSimple`.

---

**Verification feedback (6):** Impact Analysis modal shows correct blocker message but no risk IDs.
**Investigation:** `analyseImpact` returns `impactEntries` but the frontend type declared it as `entries`, so the structured blocker section (with risk list) was never rendered.
**Ruling:** In scope.
**Fix:** Renamed field to `impactEntries` throughout; removed simple publish path so Publish always goes through impact analysis; `ImpactEntryDetail` now renders `meta.offendingRisks` list.

---

**Verification feedback (7):** Total Affected count shows 0 in impact analysis modal.
**Investigation:** `affectedRiskIds` in `analyseImpact` was not populated for the responseActionMode change paths.
**Ruling:** In scope.
**Fix:** Added `affectedRiskIds.add()` calls for all three mode-change paths (blocked revert, feasible revert, upgrade to child records).

---

**Verification feedback (8):** Clicking a risk link in the impact analysis blocker closes the modal but does not open the risk detail.
**Investigation:** The modal closed (via `onClose`) but the Tabs component stayed on the Configuration tab, hiding the risk modal that opened in the background.
**Ruling:** In scope.
**Fix:** `RegisterDetailPage` now uses controlled Tabs state with a `useEffect` that switches to the "risks" tab when `riskId` appears in search params; `ImpactAnalysisModal` has `transitionProps={{ duration: 0 }}` to prevent backdrop overlap.

---

*PM: populate this file when proposing a release. Release Manager: update status and completion metadata during and after the release.*
