# Bug Log

## Template

```
### BUG-XXX — <short title>

- **Status:** Open | In Progress | Fixed
- **Severity:** Critical | High | Medium | Low
- **Area:** Frontend | Backend | Auth | Database | Config | Other
- **Introduced:** <commit or phase, if known>
- **Fixed:** <commit, if resolved>

**Description:**
What is wrong and what is the observed behavior.

**Steps to reproduce:**
1. 
2. 

**Root cause:**
What caused it.

**Fix:**
What was changed to resolve it.
```

---

## Open
Last Used: BUG-006

---

## Fixed

### BUG-001 — Vite dev proxy missing; login POST hits frontend 404

- **Status:** Fixed
- **Severity:** High
- **Area:** Frontend | Config
- **Introduced:** P1-11 (client.ts written with relative baseURL but no proxy configured)
- **Fixed:** 19e74e8 (added `/api` proxy to vite.config.ts)

**Description:**
Login requests from the frontend were POSTing to the Vite dev server (`localhost:5173/api/v1/auth/login`) instead of the Express backend (`localhost:3000`), resulting in a 404. Direct API calls worked fine.

**Root cause:**
`client.ts` used a relative `baseURL: "/api/v1"` which requires a Vite dev server proxy to forward `/api` traffic to the backend. The proxy block was never added to `vite.config.ts`.

**Fix:**
Added a proxy entry to `vite.config.ts` forwarding all `/api` requests to `http://localhost:3000`.

### BUG-002 — No feedback on error for User Create

- **Status:** Open
- **Severity:** High
- **Area:** Frontend 
- **Introduced:** 
- **Fixed:** 

**Description:**
When adding a user via the UI if the add fails there is no ui feedback sating what happened. the api returns an error ok.

**Steps to reproduce:**
1. 
2. 

**Root cause:**
What caused it.

**Fix:**
What was changed to resolve it.

### BUG-003 — Deactivated Fields still show on Risk Detail Modal

- **Status:** Fixed
- **Severity:** Critical
- **Area:** Frontend
- **Introduced:** Unknown
- **Fixed:** RiskRegisterPanel.tsx

**Description:**
Deactivated fields still show on the Risk Detail Modal, while they correctly do not show on the Risk Edit modal.

**Root cause:**
The detail modal iterated over `selectedRiskQuery.data.customFields` without filtering, while the edit modal used `activeCustomFields` (pre-filtered to `isActive === true`).

**Fix:**
Added `.filter(f => f.customFieldDefinition.isActive)` before mapping custom fields in the detail modal's field list.

### BUG-004 — Custom Fields do not show on Show Risk Modal if they have no value set

- **Status:** Fixed
- **Severity:** Critical
- **Area:** Frontend
- **Introduced:** Unknown
- **Fixed:** RiskRegisterPanel.tsx

**Description:**
Custom fields that are not set on a risk do not show on the Show Risk modal.

**Root cause:**
The detail modal sourced its field list from `selectedRiskQuery.data.customFields`, which only contains entries where a value has been saved. Fields with no value simply have no entry in that array.

**Fix:**
Switched to iterating over `activeCustomFields` (the full set of active definitions from `formConfigQuery`) and looking up each definition's value entry from the risk data. When no entry exists, a null-filled synthetic entry is passed to `customDetailValue`, which returns an empty string. This also supersedes the BUG-003 fix since deactivated definitions are inherently excluded.

### BUG-005 — Risk Buttons overflow incorrectly

- **Status:** Fixed
- **Severity:** High
- **Area:** Frontend
- **Introduced:** Unknown
- **Fixed:** RiskRegisterPanel.tsx

**Description:**
The Review, Edit and Delete buttons in the Risks table overflow incorrectly under certain conditions, causing Delete to wrap under Review and Edit.

**Root cause:**
The Mantine `Group` component containing the row action buttons defaults to `wrap="wrap"`, allowing buttons to flow onto a second line when the column is narrow.

**Fix:**
Added `wrap="nowrap"` to the actions `Group` so all three buttons stay on a single line.

### BUG-006 — Audit Log does not have Pagination

- **Status:** Fixed
- **Severity:** High
- **Area:** Frontend
- **Introduced:** Unknown
- **Fixed:** AuditPage.tsx, RegisterAuditPanel.tsx

**Description:**
On the Audit page there does not appear to be any pagination. It should use the same pagination controls and setup as the Risks table.

**Root cause:**
`AuditPage` and `RegisterAuditPanel` called their respective audit API functions without `page`/`pageSize` params and rendered no `Pagination` control. The backend already supported pagination via `AuditQuery`.

**Fix:**
Added `page` state and `placeholderData` to both components, passed `{ page, pageSize: 25 }` to the API calls, included `page` in the query key, and rendered a Mantine `Pagination` component below each table driven by `meta.total`.