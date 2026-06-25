# Active Release

Status: in-progress
Version: v1.27.0

## Release goal

Close the remaining PRD 10.1 gaps in the risk review feature and surface review history in the UI. No new review rule engine, no Risk Response Reviews — this is a completeness pass on what the product already ships. One PA-approved schema change unblocks the rest of the work.

## Selected work items

### PM8-CORE — Risk review completeness: comment mode, attestation text UI, review history panel

Status: proposed
Source: REQ-005
Capability: advanced-reviews
Suggested agents: principal-architect, backend-developer, frontend-developer, test-engineer

**Scope:**

1. Add `ReviewCommentMode` enum (DISABLED / OPTIONAL / MANDATORY) to the Prisma schema with a migration. Add `reviewCommentMode ReviewCommentMode @default(OPTIONAL) @map("review_comment_mode")` to the `Register` model. This schema change is approved by the PA in `docs/spikes/SPIKE-006.md` — the backend developer may proceed with the migration without further PA consultation. PA's only role in this release is creating the schema migration.

2. Expose `reviewCommentMode` on the register API response shape.

3. Enforce `reviewCommentMode` in `completeRiskReview` (backend service):
   - DISABLED: reject any request body that includes a comment (return 400 VALIDATION_ERROR)
   - MANDATORY: require a non-empty comment or return 400 VALIDATION_ERROR
   - OPTIONAL: existing behaviour, no change

4. Add `reviewCommentMode` Select control (dropdown) and `reviewAttestationText` Textarea to the Reviews fieldset in `RegisterSettingsTab`. The backend already persists `reviewAttestationText` — this is a missing UI surface only. Invalidate the `["register", registerId]` query after saving either field so `ReviewModal` picks up the updated values on next open.

5. Conditionally show or hide the comment textarea in `ReviewModal` based on the register's `reviewCommentMode`. Disable the Complete Review button when mode is MANDATORY and the comment field is empty.

6. Add or verify a review history panel in the risk detail view. **Important:** `UI-018` (v1.14.0) claims to have paginated a "Review History table" in the risk detail modal, but `SPIKE-006` could not find a rendering component. Before building, the frontend developer must audit `RiskDetailModal.tsx` and the `listRiskReviews` usage in `risks.api.ts`. If a review history panel already exists, verify it shows reviewer name, date/time, comment (when present), and calculated next review date. If it does not exist, build it using data from `GET /api/v1/registers/:registerId/risks/:riskId/reviews` (endpoint is implemented and working).

**Acceptance criteria:**

- A Register Admin can set reviewCommentMode (Disabled / Optional / Mandatory) via the Reviews section of register settings.
- When Disabled: comment textarea is not shown in ReviewModal; backend rejects any request body with a comment field.
- When Mandatory: Complete Review button is disabled until a non-empty comment is entered; backend returns 400 if comment is absent or blank.
- When Optional: existing behaviour is unchanged.
- A Register Admin can edit the attestation text via register settings. The next completed review shows the updated text. Previously completed reviews retain the text that was active at their time.
- The risk detail view shows a review history section with reviewer name, date/time, comment (if present), and calculated next review date for each past review.
- All existing review tests pass.
- New backend tests cover each reviewCommentMode enforcement path.
- Help content in `frontend/public/help/en/` updated to describe reviewCommentMode options and attestation text configuration.

## Required agents

- **principal-architect** — schema migration only (ReviewCommentMode enum + Register column). No other PA involvement required; PA's output unblocks backend-developer.
- **backend-developer** — expose reviewCommentMode on API response; enforce in completeRiskReview; new backend tests.
- **frontend-developer** — RegisterSettingsTab UI (comment mode Select + attestation text Textarea); ReviewModal conditional rendering; review history panel audit/build; help content update.
- **test-engineer** — verify acceptance criteria; update frontend tests for comment mode conditional rendering and review history panel.

**Sequencing:** PA creates schema migration first. Backend developer may begin enforcement work once migration is in place. Frontend developer can begin RegisterSettingsTab and ReviewModal work in parallel with backend once the API shape for reviewCommentMode is confirmed.

## Decisions

**Decision:** reviewCommentMode UI control → Select (dropdown) within the Reviews fieldset in RegisterSettingsTab, consistent with other configuration selects in the app.

**Decision:** reviewAttestationText UI control → Textarea, appropriate for multi-line attestation text.

**Decision:** review history panel — frontend developer must audit whether UI-018 (v1.14.0) already produced a rendered review history list in RiskDetailModal before building from scratch. Build only if absent.

## Test / sign-off

- [ ] reviewCommentMode can be set and persisted via register settings UI.
- [ ] DISABLED mode: comment textarea hidden in ReviewModal; backend rejects any comment body field.
- [ ] MANDATORY mode: Complete Review button disabled until non-empty comment entered; backend validates server-side.
- [ ] OPTIONAL mode: existing review flow unchanged.
- [ ] Attestation text editable via register settings; next review reflects change; prior reviews unaffected.
- [ ] Review history visible in risk detail view with required fields (reviewer, date/time, comment, next review date).
- [ ] Existing review tests still pass.
- [ ] Help content updated.

## Blockers

None.

---

*PM: populate this file when proposing a release. Release Manager: update status and completion metadata during and after the release.*
