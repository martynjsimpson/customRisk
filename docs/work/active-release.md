# Active Release

Status: ready-for-release
Version: v1.14.0

## Release goal

Visual polish and modal usability pass. Restyle action buttons throughout the app so they look like buttons rather than plain links, apply rounded corners to the left nav highlight, add a trailing ellipsis to API key prefixes in the audit log, and add pagination with a hard row cap to both the Audit History and Review History tables inside the View Risk modal.

## Selected work items

### UI-017 — Restyle action buttons to look like buttons, not links
Source: REQ-041 (consolidated with REQ-046)
Capability: register-ui
Status: done
done_in: v1.14.0

**Problem:** Action buttons ("Review", "Edit", "Delete", and similar) throughout the app have a background matching the page surface, making them look like plain text links rather than interactive controls. Font size is also inconsistent with other buttons. The same issue affects the /templates screen buttons ("Create Register", "Update Config", "Deactivate").

**Acceptance criteria:**
- Action buttons across the app are visually distinct from plain text links — they have appropriate visual weight via background, border, or clearly button-like styling.
- Button font size is consistent with other buttons in the app.
- The /templates screen buttons ("Create Register", "Update Config", "Deactivate") are fixed as part of the same pass.
- Dark mode is handled correctly after restyling.
- No regression to button functionality or other intentionally plain/link-style elements.

**Decision:** Developer should audit all action button usages before implementing and agree on a single Mantine button variant to standardise on. Do not restyle buttons that are intentionally plain (e.g. secondary text-only actions that are meant to look like links). Delete buttons should not be styled with a destructive red variant unless that is already established as the app pattern.

**Key files:** `frontend/src/pages/RegisterPage.tsx`, `frontend/src/pages/TemplatesPage.tsx`, `frontend/src/features/risks/RiskFormModal.tsx` (and other pages discovered in audit)
**Tests:** `frontend/test/risks.test.mjs`
**Agents:** Frontend Developer, Test Engineer

---

### UI-015 — Apply rounded corners to left nav hover and active states
Source: REQ-047
Capability: register-ui
Status: done
done_in: v1.14.0

**Problem:** The left-hand navigation hover and active highlight does not use rounded corners, inconsistent with the rounded corner treatment used on buttons, frames, and other UI elements throughout the app.

**Acceptance criteria:**
- The left nav hover state uses rounded corners consistent with the app's design language.
- The left nav active/selected state uses rounded corners consistent with the app's design language.
- No regression to left nav navigation behaviour or other UI elements.

**Key files:** `frontend/src/components/AppShell.tsx` (or equivalent nav component)
**Tests:** none expected
**Agents:** Frontend Developer

---

### UI-016 — Append ellipsis to API key prefix in audit log
Source: REQ-044
Capability: audit-log-ui
Status: done
done_in: v1.14.0

**Problem:** API key prefixes in the audit log are displayed without a trailing ellipsis (e.g. `cr_live_27e6515b`), which could imply the value is the full key rather than a truncated prefix.

**Acceptance criteria:**
- API key prefix values in the audit log description text are rendered with a trailing ellipsis (e.g. `cr_live_27e6515b...`).
- API key prefix values in the affected field column are rendered with a trailing ellipsis.
- No regression to audit log display or functionality.

**Key files:** `frontend/src/features/audit/AuditLogPanel.tsx`
**Tests:** none expected
**Agents:** Frontend Developer

---

### UI-019 — Paginate Audit History table in View Risk modal
Source: REQ-039
Capability: register-ui
Status: done
done_in: v1.14.0

**Problem:** The Audit History table in the View Risk modal is unpaginated. As audit records accumulate the list can become very long and slow to render.

**Acceptance criteria:**
- The Audit History table is paginated with a page size of 5 rows.
- A hard cap of 100 audit records is enforced server-side; the backend does not return more than 100 records regardless of total count.
- The UI displays a note when the cap applies, explaining that only the most recent 100 records are shown.
- No regression to audit history display or the View Risk modal.

**Implementation note:** Confirm whether risk audit history is fetched inline with the risk detail or as a separate request; implement the cap at whichever layer serves the data. Implement alongside UI-018 so both history tables in the modal receive consistent treatment.

**Key files:** `frontend/src/features/risks/RiskDetailModal.tsx`, `backend/src/services/audit.service.ts`, `backend/src/routes/risks.routes.ts`
**Tests:** `frontend/test/risks.test.mjs`, `backend/test/registers.test.mjs`
**Agents:** Backend Developer, Frontend Developer, Test Engineer

---

### UI-018 — Paginate Review History table in View Risk modal
Source: REQ-040
Capability: register-ui
Status: done
done_in: v1.14.0

**Problem:** The Review History table in the View Risk modal is unpaginated. As review records accumulate the list can become very long.

**Acceptance criteria:**
- The Review History table is paginated with a page size of 5 rows.
- A hard cap of 100 review records is enforced server-side; the backend does not return more than 100 records regardless of total count.
- The UI displays a note when the cap applies, explaining that only the most recent 100 records are shown.
- No regression to review history display or the View Risk modal.

**Implementation note:** Implement alongside UI-019 so both history tables in the modal receive consistent treatment. Confirm whether review history is fetched inline with the risk detail or as a separate request; implement the cap accordingly.

**Key files:** `frontend/src/features/risks/RiskDetailModal.tsx`, `backend/src/services/reviews.service.ts`, `backend/src/routes/risks.routes.ts`
**Tests:** `frontend/test/risks.test.mjs`, `backend/test/reviews.test.mjs`
**Agents:** Backend Developer, Frontend Developer, Test Engineer

---

## Required agents

- Frontend Developer (UI-017, UI-015, UI-016, UI-019, UI-018)
- Backend Developer (UI-019, UI-018)
- Test Engineer (UI-017, UI-019, UI-018)

## Decisions

- **UI-017 button variant:** Developer to audit all action button usages first and agree on a single Mantine variant to standardise on. Do not restyle elements that are intentionally plain/link-style. Delete buttons should not adopt destructive red styling unless that is already the app's established pattern.
- **UI-019 / UI-018 pagination:** Page size 5, hard server-side cap of 100 rows, UI note when cap applies. Both tables in the same modal should be implemented together for consistency.

## Test / sign-off

- [x] Implementation pass complete
- [x] Regression test pass complete
- [x] TypeScript typecheck clean
- [x] Documentation pass complete

## Blockers

None.

---
*PM: populate this file when proposing a release. Release Manager: update status and completion metadata during and after the release.*
