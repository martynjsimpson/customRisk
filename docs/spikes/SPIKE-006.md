# SPIKE-006: Audit Current Review Implementation and Scope PM8-CORE

**Status:** Complete  
**Date:** 2026-06-25  
**Author:** Principal Architect

---

## Context

PM8 is the planned review workflow feature area. PRD section 10 defines four sub-areas: basic risk reviews (10.1), risk response reviews (10.2), review frequency rules (10.3), and review history (10.4). Before scoping any PM8 release, the PA must determine what is already implemented, what gaps exist, and what the smallest coherent first slice looks like. This spike answers those questions so the PM can write a tight `active-release.md` without further PA consultation.

---

## Findings

### 1. What the current implementation provides per PRD section

#### 10.1 Basic Risk Reviews

The core review flow is implemented and production-ready:

- `GET /api/v1/registers/:registerId/risks/:riskId/reviews` — lists review history for a risk, capped at 100 entries.
- `POST /api/v1/registers/:registerId/risks/:riskId/reviews` — completes a review. Validates that reviews are enabled, requires a `confirmed: true` body field, stores the review in `risk_review`, updates `risk.last_reviewed_at`, `risk.last_reviewed_by_user_id`, and `risk.next_review_date`, and writes an audit event.
- The attestation text presented to the user is read from `register.review_attestation_text` at review time and snapshotted into the `risk_review.attestation_text` column, so the historical record is preserved even if the register setting later changes.
- `ReviewStatusBadge` component and `getRiskReviewStatus` service correctly derive five statuses: `NOT_REQUIRED`, `NOT_REVIEWED`, `NOT_DUE`, `DUE_SOON` (within 30 days), and `OVERDUE`.
- `ReviewModal` component implements the frontend flow with attestation text display, optional comment textarea, and confirmation checkbox.
- Permission enforcement uses `canEditRisk`, matching the permission model: System Admin, Register Admin, and Risk Owner may review.

**Gaps against PRD 10.1:**

- Comment mode (Disabled / Optional / Mandatory) is not implemented. The schema has no `reviewCommentMode` field on `Register`. The current UI always shows the comment textarea and always treats it as optional. PRD requires this to be configurable per register.
- The attestation text is configurable at the register level (`register.review_attestation_text`) and the UI displays it, but there is no configuration UI in `RegisterSettingsTab` for editing this text — only `reviewsEnabled` and `defaultReviewFrequencyMonths` are surfaced.

#### 10.2 Risk Response Reviews

Not implemented in any form. The `ResponseAction` model has no review fields (`lastReviewedAt`, `nextReviewDate`, `lastReviewedByUserId`). There is no `ResponseActionReview` table. There is no backend route for response action reviews. There is no `responseReviewsEnabled` flag on `Register`. The UI has no review flow for response actions. This is entirely absent.

#### 10.3 Review Frequency Rules

The PRD describes field-value-driven review frequency rules — for example, "High residual risk reviewed every X months" or "Residual Risk Acceptable = false reviewed according to residual risk level." The current implementation supports only a single global frequency: `register.default_review_frequency_months` (default 12). There is no `ReviewFrequencyRule` table, no rule evaluation engine, and no field-value-to-frequency mapping. This is entirely absent; schema-first design work is required before any implementation can begin.

The current `calculateNextReviewDate` function in `backend/src/services/scoring.service.ts` adds `defaultReviewFrequencyMonths` to a base date and returns the result. It does not accept field values or consult rules.

The only on-edit recalculation that exists is a narrow special case: when `createdDate` is edited on a risk that has never been reviewed, `risks.mutation.service.ts` recalculates `nextReviewDate` using the new created date and the single global frequency. No other field edits trigger recalculation. Changes to risk level, likelihood, impact, or any custom field do not recalculate the next review date.

#### 10.4 Review History

Substantially implemented for risk reviews:

- `RiskReview` table stores: reviewer (`reviewed_by_user_id`), timestamp (`reviewed_at`), comment (`comment`), attestation text snapshot (`attestation_text`), and calculated next review date (`calculated_next_review_date`).
- The list endpoint returns all of these mapped fields.
- The `RISK_REVIEWED` audit event is written on every review, with `fieldChanges` recording the old and new `nextReviewDate`.

**Gaps against PRD 10.4:**

- "Review outcome/status, where applicable" — `RiskReview` has no `outcome` or `status` field. The PRD is ambiguous on when this applies, but the field is absent.
- Review history for Risk Response Actions is entirely missing (see 10.2 above).
- There is no dedicated UI tab or panel for review history — it is unclear from the codebase whether the history is surfaced in the frontend at all; the `listRiskReviews` endpoint exists and is called from `risks.api.ts`, but no component that renders the history list was found.

---

### 2. Review frequency rule model in the schema

No `ReviewFrequencyRule` table or equivalent exists. The only frequency-related fields on `Register` are:

- `reviews_enabled` (boolean)
- `default_review_frequency_months` (integer, default 12)

The PRD's frequency rule model — field-value-to-frequency mapping with rule ordering and fallback — requires a new table. This is schema-first work. The PA must design the schema and create an ADR before any backend implementation begins. This work is not trivial: the rule model must be general enough to match against calculated fields (e.g. risk level), custom boolean fields, and potentially composite conditions.

---

### 3. Next-review-date recalculation on field edits

Only one narrow case exists: when `createdDate` is edited on a risk with no prior review, `nextReviewDate` is recalculated using the created date as the base. This is implemented in `risks.mutation.service.ts` lines 328–379.

No other field edits trigger recalculation. Changing `likelihoodValueId`, `impactValueId`, or any custom field does not recalculate `nextReviewDate`. Since there is no frequency rule model yet, this is not a bug in the current implementation — the single-frequency model has nothing to re-evaluate against. However, the PRD's frequency rule requirement ("if the rule changes, the Next Review Date is recalculated using the latest applicable frequency") cannot be satisfied without first building the rule model.

---

### 4. Attestation text configuration

Partially implemented:

- `register.review_attestation_text` exists in the schema with a sensible default.
- The attestation text is snapshotted correctly into `risk_review.attestation_text` at review time.
- The backend `completeRiskReview` reads and stores it correctly.
- The `ReviewModal` frontend component displays it.

Not implemented:

- There is no UI in `RegisterSettingsTab` for editing the attestation text. The form fields present are only `reviewsEnabled` and `defaultReviewFrequencyMonths` (plus the hidden attestation text, which the backend already supports but the frontend does not expose for editing).
- Comment mode (Disabled / Optional / Mandatory) is not implemented in schema, backend, or frontend. `Register` has no `reviewCommentMode` column.

---

### 5. Risk Response Reviews

Entirely missing. No part of the response action review flow has been built:

- No `responseReviewsEnabled` flag on `Register`.
- No review fields on `ResponseAction` (`lastReviewedAt`, `nextReviewDate`, etc.).
- No `ResponseActionReview` table.
- No backend routes.
- No frontend flow.
- No audit events for response action reviews.
- No permission rules for response action review access.

---

## Recommendations

### 1. Smallest coherent first slice for PM8-CORE

The smallest coherent first slice that ships real user value without requiring the frequency rule model is:

**PM8-CORE: Risk Review Completeness**

Deliver the remaining PRD 10.1 gaps for risk reviews, surface review history in the UI, and expose the attestation text setting. This slice requires no new tables, no rule engine, and no Response Action work.

**Scope:**

1. Add `reviewCommentMode` enum (`DISABLED` | `OPTIONAL` | `MANDATORY`) to `Register`. Add a Prisma migration.
2. Expose `reviewCommentMode` on the register API response shape.
3. Enforce `reviewCommentMode` in `completeRiskReview`: when `DISABLED`, reject any comment and hide the textarea; when `MANDATORY`, require a non-empty comment or return a validation error.
4. Add `reviewCommentMode` configuration UI to `RegisterSettingsTab` (dropdown or radio group, within the Reviews fieldset).
5. Add `reviewAttestationText` to the `RegisterSettingsTab` form so administrators can edit it (the backend already persists this; it just has no UI surface).
6. Add a review history panel to the risk detail view that renders the list returned by `GET /api/v1/registers/:registerId/risks/:riskId/reviews`. Display reviewer name, timestamp, comment (if present), and calculated next review date per row.

**Acceptance criteria:**

- A Register Admin can set `reviewCommentMode` to Disabled, Optional, or Mandatory via register settings.
- When Disabled: the comment field is not shown in `ReviewModal` and any request body with a comment is rejected by the backend with a validation error.
- When Mandatory: the Complete Review button is disabled until a non-empty comment is entered; the backend also validates and returns `400 VALIDATION_ERROR` if `comment` is absent or blank.
- When Optional: existing behaviour is unchanged.
- A Register Admin can edit the attestation text via register settings. The next review completed after the change shows the updated text. Previously completed reviews retain the text that was in effect at their time.
- The risk detail view contains a review history section listing all reviews for that risk, showing reviewer, date/time, comment, and calculated next review date.
- All existing review tests pass. New tests cover each `reviewCommentMode` enforcement path in the backend service.

---

### 2. Schema changes required for PM8-CORE

One schema change is required for the first slice:

Add a `reviewCommentMode` enum and column to `Register`:

```
enum ReviewCommentMode {
  DISABLED
  OPTIONAL
  MANDATORY
}

// On Register model:
reviewCommentMode  ReviewCommentMode  @default(OPTIONAL)  @map("review_comment_mode")
```

The PA must approve this change before the backend developer creates the migration. No other schema changes are required for the first slice. The backend developer should create the migration file via `prisma migrate dev` as normal.

---

### 3. Cross-cutting concerns for the first slice

**Permission model:** No changes required. The existing `canEditRisk` check already governs who can complete a review. The attestation text and comment mode settings are register configuration, which is already protected by `canManageRegister`. The permission model document does not need updating for this slice.

**Audit model:** No new audit event types are needed. The existing `RISK_REVIEWED` event is sufficient. The `metadataJson` field in the audit event can be extended to include `commentProvided: boolean` (already present) and optionally `commentMode` for observability — but this is not required for acceptance.

**Notification coupling:** The existing review-complete flow has no notification integration. The first slice does not add notifications. If the notification system is built in a future release, it will hook into the same `completeRiskReview` service function. No architectural coupling concern for this slice.

**Config versioning:** `reviewCommentMode` and `reviewAttestationText` are register-level settings, not config-snapshot settings. They follow the same pattern as `reviewsEnabled` and `defaultReviewFrequencyMonths`: stored on the `Register` row, not in `RegisterConfigVersion`. The `RegisterSettingsTab` update path is already established for this category. No config version concerns.

**Frontend invalidation:** When attestation text or comment mode are saved, the register query (`["register", registerId]`) must be invalidated so `ReviewModal` picks up the updated values. This already happens for other register settings mutations in `RegisterSettingsTab`.

---

### 4. What is explicitly deferred

The following are out of scope for PM8-CORE and should be tracked as separate backlog items:

**Review frequency rules (PRD 10.3):** This requires a new `ReviewFrequencyRule` table with a PA-designed schema, a rule evaluation engine in the backend, a configuration UI, and on-edit recalculation across multiple field types. This is a significant, standalone feature that should be its own release. The PA must produce a design (including an ADR covering the rule model) before implementation begins.

**Risk Response Reviews (PRD 10.2 and 10.4 for actions):** Entirely absent. Requires new schema (`responseReviewsEnabled` on `Register`, review fields on `ResponseAction`, a `ResponseActionReview` table), new backend routes, new permission rules for response action review access, and new frontend flows. This is also a standalone release. The permission model document will need updating to cover response action review permissions before implementation.

**Review outcome/status field on `RiskReview`:** The PRD mentions "review outcome/status, where applicable." The current implementation has no outcome field. This is deferred until there is a clearer product definition of what outcome values would mean and when they apply.

**Notification integration for reviews:** PRD section 11 covers review reminder notifications. This is deferred to the notifications release and has no dependency on PM8-CORE.

**"My Reviews" or overdue review dashboard widgets for Risk Owners:** Currently implemented via the dashboard service queries; no additional work is in scope for PM8-CORE beyond ensuring the history panel is visible.
