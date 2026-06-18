# Active Release

Status: ready-for-release
Version: v1.9.1
Release type: patch

## Selected work items

### BUG-001 — Keep main audit screen search facets on one line at normal desktop width
- **Type:** bug
- **Capability:** audit-log-ui
- **Priority:** medium
- **Confidence:** medium
- **Summary:** Object type filter wraps to a second row on the main audit screen at normal desktop width instead of sitting
  inline with the other facets. User-reported defect; source issue #100.
- **Acceptance criteria:**
  - Search, Actor, IP Address, From date, To date, Action, and Object type all sit on one row at the agreed desktop breakpoint.
  - Layout remains usable and readable; no overlapping labels, clipped inputs, or inaccessible controls.
  - Any responsive fallback for narrower widths is intentional rather than leaving a single facet stranded on its own row.
- **Key files:** `frontend/src/features/audit/AuditFilters.tsx`, `frontend/src/features/audit/AuditLogPanel.tsx`,
  `frontend/src/pages/AuditPage.tsx`
- **Tests:** `frontend/test/audit.test.mjs`
- **Required agents:** Frontend Developer, Test Engineer
- **Status:** done
- **done_in:** v1.9.1

---

## Scope rationale

PM5-CORE was audited this session and confirmed to have already shipped in v1.7.0. Its implementation commits (PM5-01
through PM5-09) are ancestors of the v1.7.0 tag. It has been marked done in backlog.yml and is not included here.

This release is a single bug fix patch. MAINT-001 (Node engine constraint tightening) was originally included but has
been deferred to a later release to keep this patch purely corrective.

PM6-CORE is now fully unblocked (its only dependency, PM5-CORE, is done) but represents substantial new feature work
and should be proposed as its own release once this patch is shipped.

## Required agents (combined)

- Frontend Developer (BUG-001)
- Test Engineer (BUG-001)

## Decisions needed

_(none — all resolved)_

## Test / sign-off

- [x] Implementation complete
- [x] Regression tests pass (299 tests: 191 backend, 85 frontend static, 22 frontend runtime, 1 shared)
- [x] Typecheck clean across all packages
- [x] Documentation pass complete

## Blockers

_(none)_

---
*PM: populate this file when proposing a release. Release Manager: update status and completion metadata during and after the release.*
