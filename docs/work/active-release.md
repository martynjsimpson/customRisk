# Active Release

Status: in-progress
Version: v1.23.0

## Release goal

Fix a data integrity bug on the admin homepage and complete the pending developer experience maintenance round. By the end of this release: the Admin summary widget correctly excludes soft-deleted registers; all three code layers (frontend, backend, test) have been assessed against the agreed coding standards with actionable findings actioned or deferred; and the seed data accurately represents current product capabilities including custom fields, child record response actions, configurable scoring formulas, and review history.

## Selected work items

### BUG-057 — Fix Admin summary widget to exclude soft-deleted registers
Source: REQ-074
Capability: homepage
Suggested agents: backend-developer, test-engineer

**Problem:** The Admin summary widget on the homepage includes soft-deleted registers in its per-register risk and overdue counts. The backend query powering the widget is missing a soft-delete filter.

**Acceptance criteria:**
- The Admin summary widget does not include registers that have been soft-deleted.
- The fix is applied at the backend query level.
- No regression to the Admin summary widget display for active registers.
- Test coverage added or updated for the soft-deleted register exclusion path.

---

### MAINT-011 — Audit frontend code against agreed coding standards
Source: REQ-070
Capability: build-toolchain
Suggested agents: frontend-developer

**Problem:** Frontend code has not been assessed against the coding standards established in MAINT-010 (v1.20.0). Duplication, weak component reuse, and inconsistent patterns may have accumulated across the codebase.

**Acceptance criteria:**
- All frontend code under frontend/src/ is assessed against the standards from docs/engineering/coding-standards.md.
- Findings are concrete and actionable — each finding names the file, the violation, and the recommended fix.
- Quick fixes are addressed within this release at the Release Manager's discretion.
- Larger items are logged in a **Deferred items for PM** section in active-release.md for the PM to pick up as new requests.

---

### MAINT-012 — Audit backend code against agreed coding standards
Source: REQ-071
Capability: build-toolchain
Suggested agents: backend-developer

**Problem:** Backend code has not been assessed against the coding standards established in MAINT-010 (v1.20.0). Duplication, inconsistent service patterns, and error handling gaps may have accumulated.

**Acceptance criteria:**
- All backend code under backend/src/ is assessed against the standards from docs/engineering/coding-standards.md.
- Findings are concrete and actionable — each finding names the file, the violation, and the recommended fix.
- Quick fixes are addressed within this release at the Release Manager's discretion.
- Larger items are logged in a **Deferred items for PM** section in active-release.md for the PM to pick up as new requests.

---

### MAINT-013 — Audit test code against agreed coding standards
Source: REQ-072
Capability: build-toolchain
Suggested agents: test-engineer

**Problem:** Test code has not been assessed against the coding standards established in MAINT-010 (v1.20.0). Missing regression coverage, brittle assertions, and inconsistent naming may be present.

**Acceptance criteria:**
- All test code under backend/test/ and frontend/test/ is assessed against the standards from docs/engineering/coding-standards.md.
- Findings are concrete and actionable — each finding names the file, the violation, and the recommended fix.
- Quick fixes are addressed within this release at the Release Manager's discretion.
- Larger items are logged in a **Deferred items for PM** section in active-release.md for the PM to pick up as new requests.

---

### MAINT-014 — Refresh seed scripts to cover features shipped since v1.7.0
Source: REQ-073
Capability: build-toolchain
Suggested agents: backend-developer

**Problem:** The seed data (backend/prisma/seed.ts) was last meaningfully updated before v1.7.0. It does not cover custom fields, child record response actions, configurable scoring formulas, or review history — all of which have shipped since.

**Acceptance criteria:**
- At least one demo register is seeded with custom fields: a DROPDOWN field, a CALCULATED field referencing at least one numeric field, and at least one field with validationMode WARN. Field visibility (visibleToRoles) is demonstrated on at least one field.
- Custom field values are seeded on demo risks so the fields are populated on first load.
- One demo register is seeded in responseActionMode CHILD_RECORDS with at least three action records across its risks covering a mix of statuses, including at least one Risk Response Owner assignment.
- One demo register (may be the same or different) is seeded with a custom scoring formula that differs from the default likelihood × impact.
- At least two completed review records are seeded across demo risks.
- The seed remains idempotent — re-running does not create duplicates or error on an already-seeded database.
- The seed summary log line is updated to accurately describe the seeded data.
- No regression to the existing seed structure — system admin creation, demo users, register permissions, and template seeding continue to work correctly.

---

## Required agents

- **backend-developer** — BUG-057 (fix Admin summary query), MAINT-012 (backend code audit), MAINT-014 (seed refresh). These three items can run in parallel.
- **frontend-developer** — MAINT-011 (frontend code audit).
- **test-engineer** — BUG-057 (add test coverage for soft-delete exclusion), MAINT-013 (test code audit). BUG-057 test coverage can be added once the backend fix is in.

**Sequencing:** All five work items can begin in parallel. BUG-057 test coverage waits for the backend fix to land. For the three audit items, quick fixes are actioned in-release; larger findings go to the Deferred items for PM section.

## Decisions

No open product or UX decisions. All items are implementation-ready.

**Decision:** MAINT-014 register assignment — which demo register gets custom fields and which gets child record mode is a developer judgment call during implementation, not a PM decision. The backend developer should use whichever of the existing demo registers makes the best representative demo.

**Decision:** MAINT-011/012/013 audit scope — quick fixes are at the Release Manager's discretion. Anything requiring significant refactoring or new design is deferred to PM via the Deferred items for PM section, not fixed in-release.

## Test / sign-off

- [ ] BUG-057: Admin summary widget does not show soft-deleted registers; test coverage added.
- [ ] MAINT-011: Frontend code audit complete; quick fixes applied; any larger items logged as deferred.
- [ ] MAINT-012: Backend code audit complete; quick fixes applied; any larger items logged as deferred.
- [ ] MAINT-013: Test code audit complete; quick fixes applied; any larger items logged as deferred.
- [ ] MAINT-014: Seed runs cleanly; seeded data demonstrates custom fields, child record actions, custom formula, and review history; seed is idempotent.

## Blockers

None.

---

*PM: populate this file when proposing a release. Release Manager: update status and completion metadata during and after the release.*
