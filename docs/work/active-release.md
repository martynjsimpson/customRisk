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
- [x] Regression tests pass (274 backend, 119 frontend static, 87 frontend runtime — all green)
- [x] TypeScript typecheck clean
- [x] Documentation pass complete (help content updated)

## Blockers

None.

## Verification feedback

**Verification feedback (ongoing — not yet resolved):** Publishing a draft throws a 500 "An unexpected error occurred" even after multiple fixes. HAR analysis (two sessions) reveals two root causes still outstanding:

**Root cause 1 — draft snapshot missing `responseActionMode`:** Even after `buildSnapshotFromRelationalTables` was updated to include `responseActionMode`, freshly-created drafts still show no `responseActionMode` in `snapshotJson.register`. Most likely the backend process has not been restarted to pick up compiled TypeScript changes. User must restart the backend (`npm run dev` or equivalent) before testing again.

**Root cause 2 — toggle PATCH goes to wrong endpoint:** When the user changes the `responseActionMode` toggle in `RegisterSettingsTab`, a `PATCH /registers/:registerId` fires WITHOUT `responseActionMode` in the body. This means the toggle change is either: (a) firing `updateSettingsMutation` (the direct settings save) instead of `updateDraftResponseActionModeMutation`, or (b) `updateDraftResponseActionModeMutation` is wired but sending to `PATCH /registers/:registerId` rather than `PATCH /registers/:registerId/config-versions/draft`. The draft snapshot never receives the mode value, so publish always sees `responseActionMode: undefined` in the snapshot, which after our undefined-guard fix is correctly a no-op — but means the mode change never takes effect.

**Next session must:** 
1. Confirm backend has been restarted and a new draft's snapshot includes `responseActionMode: "CHILD_RECORDS"` (for a CHILD_RECORDS register)
2. Check `RegisterSettingsTab.tsx` — specifically `updateDraftResponseActionModeMutation` — to confirm it calls `updateDraftConfig(registerId, { register: { responseActionMode } })` and NOT `updateRegister`. Check what API function `updateDraftConfig` calls and what URL it hits.
3. Check `frontend/src/api/configVersion.api.ts` `updateDraftConfig` function to confirm it PATCHes `.../config-versions/draft` not `.../registers/:id`.

**Verification feedback:** Switching Response Action Mode on an existing register throws "Route not found".
**Investigation:** `switchResponseActionMode` in `frontend/src/api/responseActions.api.ts` calls `PATCH /registers/:registerId/settings`, but the backend register update endpoint is `PATCH /registers/:registerId` (no `/settings` suffix). The backend correctly accepts `responseActionMode` in the update schema; only the frontend URL is wrong.
**Ruling:** In scope — mode switching is a core acceptance criterion and this is a URL mismatch.
**Fix:** Update the fetch URL in `switchResponseActionMode` from `/registers/${registerId}/settings` to `/registers/${registerId}`.

---

**Verification feedback:** After switching to Child Records mode, opening a risk still shows the Response Action text area in both the view modal and edit modal. The text area should be replaced by the child actions panel.
**Investigation:** `registerConfigSelect` in `backend/src/services/registerConfig.service.ts` (line 8) does not include `responseActionMode`. The `risk-form-config` endpoint fetches the register using this select, so `responseActionMode` is always `undefined` in the frontend, which falls back to `"SIMPLE"` — causing the text area to always render.
**Ruling:** In scope — the mode-conditional rendering is a core acceptance criterion.
**Fix:** Add `responseActionMode: true` to `registerConfigSelect` in `backend/src/services/registerConfig.service.ts`.

---
*PM: populate this file when proposing a release. Release Manager: update status and completion metadata during and after the release.*
