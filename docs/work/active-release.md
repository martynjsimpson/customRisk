# Active Release

Status: proposed
Version: TBD

## Release goal

A PA-only spike release to unblock the two highest-value pending feature tracks. SPIKE-006 audits the current review implementation and produces a scoped delivery plan for PM8-CORE. SPIKE-007 defines the full attachment architecture (schema, permissions, API, file safety, audit model) and produces a scoped delivery plan for PM12-CORE. No shippable code in this release — output is two spike documents that let the PM write tight release briefs for both features at the next planning session.

## Selected work items

### SPIKE-006 — Audit current review implementation and scope PM8-CORE
Status: proposed
Source: REQ-005
Capability: advanced-reviews
Suggested agents: principal-architect

**Investigation question:** What does the current review implementation actually provide versus what PRD section 10 requires, and what is the smallest coherent first slice of PM8-CORE that can be delivered in one release?

**The PA must answer all of the following in `docs/spikes/SPIKE-006.md`:**

*Findings:*
- What does the current implementation provide for each of PRD sections 10.1–10.4? Assess each separately: basic risk reviews (10.1), Risk Response Reviews (10.2), review frequency rules (10.3), and review history (10.4).
- Does a review frequency rule model exist in the schema (e.g. a `reviewRules` table or equivalent), or is this entirely absent and schema-first work is required?
- Does next-review-date recalculation on relevant field edits exist in the backend?
- Is attestation text configuration (disabled/optional/mandatory comments, configurable attestation text per register) implemented or absent?
- Are Risk Response Reviews implemented in any form, or entirely missing?

*Recommendations:*
- The smallest coherent first slice of PM8-CORE that can be delivered in one release, with explicit acceptance criteria.
- Any schema changes required, and whether the principal-architect needs to design them before implementation begins.
- Any cross-cutting concerns — permission model, audit model, notification coupling — that would complicate or block the first slice.
- What is explicitly deferred to a follow-on release.

**Acceptance criteria:**
- `docs/spikes/SPIKE-006.md` exists with `## Findings` and `## Recommendations` sections.
- Every Findings question above is answered.
- Recommendations are specific enough for the PM to write a tight active-release.md for PM8-CORE without further PA consultation.

---

### SPIKE-007 — Define attachment implementation architecture for PM12-CORE
Status: proposed
Source: REQ-008
Capability: attachments-evidence
Suggested agents: principal-architect

**Investigation question:** What is the full implementation architecture for attachments, and what is the smallest coherent first slice (risk attachments) that can be delivered in one release?

**The PA must answer all of the following in `docs/spikes/SPIKE-007.md`:**

*Findings:*
- What storage decisions are already fixed by ADR-0006, and what remains open for implementation design?
- Does the current schema have any attachment-related tables, or is this entirely greenfield?

*Recommendations:*
- Proposed Prisma schema for the Attachment model and its linking table(s). At minimum, risk attachment linking. Action and review attachment linking may be deferred, but the schema must not foreclose that path.
- Permission model: who can upload, download, soft-delete, and hard-delete attachments; how register-level and ownership-derived permissions apply; how Register Viewer access is handled.
- API shape: endpoints for upload (multipart), list, download (stream or signed URL), and soft-delete. How the backend serves or proxies stored files without exposing raw storage paths.
- File safety controls: MIME type validation, file size limits, extension allow/block list, and where enforcement lives (middleware vs. service layer).
- Audit model: which events are recorded, at which audit level (risk audit log vs. system audit log), and whether a deletion snapshot is required.
- The smallest coherent first slice (risk attachments only) with explicit acceptance criteria, and what is deferred to follow-on work.
- Operational consequences from ADR-0006 that must appear in release documentation (volume backup, file-size defaults, storage path configuration).

**Acceptance criteria:**
- `docs/spikes/SPIKE-007.md` exists with `## Findings` and `## Recommendations` sections.
- Every Recommendations item above is addressed.
- The schema proposal is concrete enough that a backend developer can implement it without further PA input.
- Recommendations are specific enough for the PM to write a tight active-release.md for PM12-CORE without further PA consultation.

---

## Required agents

- **principal-architect** — SPIKE-006 and SPIKE-007 (owns both spike documents).

**Sequencing:** Both spikes are independent and can run in parallel.

## Decisions

None — this is a discovery release. Decisions will be surfaced from spike output at the next planning session.

## Test / sign-off

- [ ] SPIKE-006: docs/spikes/SPIKE-006.md exists with Findings and Recommendations sections, all questions answered.
- [ ] SPIKE-007: docs/spikes/SPIKE-007.md exists with Findings and Recommendations sections, all questions answered.

## Blockers

None.

---

*PM: populate this file when proposing a release. Release Manager: update status and completion metadata during and after the release.*
