# Active Release

Status: ready-for-release
Version: v1.15.0

## Release goal

Help content externalisation, page-level helper text, Review status field ordering, and legacy planning cleanup. Five items across three capabilities — help content infrastructure, register UI configuration, and maintenance.

## Selected work items

### MAINT-005 — Delete legacy docs/planning directory
Source: REQ-045
Capability: build-toolchain
Status: done
done_in: v1.15.0

**Problem:** The `docs/planning` directory and all its contents are superseded by the planning system under `docs/work`. It creates confusion and the risk of agents or humans consulting outdated documents.

**Acceptance criteria:**
- The `docs/planning` directory and all its contents are deleted from the repository.
- No other files in the repository reference `docs/planning` in a way that breaks after deletion.
- The deletion is confirmed in a single clean commit.

**Implementation note:** Check for references to `docs/planning` in source files, docs, CI config, and agent prompts before deleting. Do this first in the session — it is trivially small and cleans house before other work begins.

**Key files:** `docs/planning/` (delete entirely)
**Tests:** none
**Agents:** devops-engineer

---

### MAINT-002 — Externalise /help page content out of source code
Source: REQ-032
Capability: help-content
Status: done
done_in: v1.15.0

**Problem:** Help content on the /help page is embedded directly in `HelpPage.tsx`, making it hard to maintain and impossible to localise without a code change.

**Acceptance criteria:**
- Help content is stored in external files (Markdown) rather than inline in `HelpPage.tsx`.
- Images can be included or referenced from help content files.
- The help page renders the externalised content correctly.
- The directory structure supports locale variants in future (e.g. locale subdirectories) without requiring architectural rework.
- No regression to help page display.

**Decision: format and structure** → Static Markdown files served as public assets. Use a locale-subdirectory structure from the outset (e.g. `frontend/public/help/en/`) so future localisation does not require a restructure. Images go alongside the content files in the same directory. The help page fetches content at runtime; no CMS or new build dependency is introduced.

**Implementation note:** Implement MAINT-002 before MAINT-003 in the same session. Content accuracy corrections (MAINT-003) should be made in the new Markdown format, not in the old inline source.

**Key files:** `frontend/src/pages/HelpPage.tsx`, new `frontend/public/help/en/` content files
**Tests:** none expected beyond visual verification
**Agents:** Frontend Developer

---

### MAINT-003 — Audit and update /help page content for accuracy
Source: REQ-031
Capability: help-content
Status: done
done_in: v1.15.0

**Problem:** Help content has not been kept in sync with the live product. Some sections are outdated or inaccurate.

**Acceptance criteria:**
- All help content accurately describes the current state of the live product.
- No outdated or incorrect information remains.
- Any missing help topics that would benefit users are added.

**Implementation note:** Do this immediately after MAINT-002 in the same session, working directly in the new Markdown files. Do not correct content in the old inline source.

**Key files:** `frontend/public/help/en/` (Markdown files created in MAINT-002)
**Tests:** none
**Agents:** Frontend Developer

---

### UI-011 — Add descriptive helper text beneath page titles across the app
Source: REQ-020
Capability: register-ui
Status: done
done_in: v1.15.0

**Problem:** Only the /help page displays a short subtitle beneath the page title. All other pages lack this orientation text, making the app feel inconsistently finished.

**Acceptance criteria:**
- All pages show a short descriptive subtitle beneath the page title, following the /help page pattern.
- The /api-keys page converts its existing alert box content into helper text rather than showing an alert.
- The /registers/<registerID> page uses the register's own description field as its helper text.
- No regression to any page layout or functionality.

**Implementation note:** Audit all pages to determine which need helper text authored vs. which already have it. The /help page subtitle is the reference layout component. The /api-keys alert conversion and the register description wiring are the two cases that differ from a plain authored string.

**Key files:** `frontend/src/pages/HelpPage.tsx` (reference), `frontend/src/pages/ApiKeysPage.tsx`, `frontend/src/pages/RegisterPage.tsx`, and all other page components discovered in the audit
**Tests:** none expected
**Agents:** Frontend Developer

---

### UI-014 — Make Review status field position configurable in risk detail modal
Source: REQ-038
Capability: register-ui
Status: done
done_in: v1.15.0

**Problem:** The Review status row in the risk detail modal appears at a fixed position (currently end of table) because it is not part of the register's field configuration system. Register admins cannot control its display order relative to custom fields.

**Acceptance criteria:**
- Register admins can set the display position of the Review status field within the risk detail modal via the field configuration UI.
- The configured position is respected when rendering the risk detail modal table.
- The Review status field remains non-removable; only its position is configurable.
- No regression to custom field ordering, review status display, or the field configuration page.

**Decision: default position** → Review status defaults to the last position in existing registers, preserving current behaviour. No migration or admin prompt required; the admin explicitly reorders it if they want it elsewhere.

**Decision: config UI visibility** → The position control for Review status is hidden (not rendered) when reviews are disabled for the register. The field is not shown in that case, so the ordering is meaningless.

**Key files:** `frontend/src/features/risks/RiskDetailModal.tsx`, `frontend/src/pages/RegisterConfigPage.tsx`, `backend/src/services/registerConfig.service.ts`
**Tests:** `frontend/test/risks.test.mjs`, `backend/test/registers.test.mjs`
**Agents:** Backend Developer, Frontend Developer, Test Engineer

---

## Required agents

- devops-engineer (MAINT-005)
- Frontend Developer (MAINT-002, MAINT-003, UI-011, UI-014)
- Backend Developer (UI-014)
- Test Engineer (UI-014)

## Decisions

- **MAINT-002 format** → Static Markdown files served as public assets, locale-subdirectory structure (`frontend/public/help/en/`), images alongside content files, no new CMS or build dependency
- **MAINT-002 → MAINT-003 sequencing** → MAINT-003 must follow MAINT-002 in the same session; all content corrections go into the new Markdown files
- **UI-014 default position** → Review status defaults to last position in existing registers; no migration or prompt required
- **UI-014 config UI visibility** → Position control is hidden when reviews are disabled for the register

## Test / sign-off

- [x] Implementation pass complete
- [x] Regression test pass complete
- [x] TypeScript typecheck clean
- [x] Documentation pass complete

## Blockers

None. All clear.

---
*PM: populate this file when proposing a release. Release Manager: update status and completion metadata during and after the release.*
