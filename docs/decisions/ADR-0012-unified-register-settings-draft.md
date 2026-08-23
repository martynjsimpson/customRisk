# ADR-0012 — Unified Draft Promotion for All Register Settings

**Status:** Accepted
**Date:** 2026-08-23
**Feature:** DRAFT-UNIFIED

---

## Context

Register configuration is staged in a `RegisterConfigVersion` draft and applied to the relational
tables in a single transaction by `publishDraft`
(`backend/src/services/configVersion.publish.service.ts`). The snapshot's `register` section
(`ConfigSnapshotRegisterSettings`) carries fourteen register settings fields.

Until now, the block that writes those fields back to the `Register` row was wrapped in a
conditional on `draft.sourceTemplateVersionId`. Register settings were promoted on publish **only**
when the draft originated from a template. For a manually-created draft — the common case — eleven
of the fourteen fields were captured in the snapshot and then discarded on publish. `name` was
never promoted on either branch. Only `scoringFormula` and `responseActionMode` had been given
explicit always-promote special cases.

The conditional was not a decision. Its inline comment reasons that direct edits made to the
register while a manual draft was open must not be overwritten — which was true when the settings
screen wrote every field straight to the `Register` row. Every field added afterwards inherited the
behaviour by default, and the invariant went undocumented.

The cost was realised in v1.27.0. `reviewCommentMode` was correctly routed through the draft in the
UI and correctly blocked from the direct-write path in draft mode, but was never promoted on
publish for manual drafts. The staged change was silently lost. Several rounds of per-field
patching — Zod additions, per-field draft mutations, narrower cache invalidation — each produced a
new failure mode, and the release was ultimately abandoned and reverted.

`docs/spikes/SPIKE-008.md` investigated whether the split was defensible. Its field-by-field verdict
was that no field has a genuine technical blocker to draft treatment: none requires a data
migration except `responseActionMode`, which already has one, and none has a retroactive effect on
existing records. The argument that had previously justified the split — that administrators expect
immediate saves for fields like `name` — rested on a premise that does not hold. **There is no Save
button on the configuration screen in draft mode.** The screen's only commit point is Publish, so
the "stage, then publish" model is already what the screen asks of the administrator for every
other setting on it.

---

## Decision

**Every field in `ConfigSnapshotRegisterSettings` is promoted to the `Register` row unconditionally
on publish, regardless of whether the draft originated from a template.**

The `draft.sourceTemplateVersionId` conditional in `publishDraft` is retained for
`linkedTemplateVersionId` — the register's template sync point — and nothing else.
`linkedTemplateVersionId` is not a settings field and is not part of the snapshot; it is derived
from the draft's origin, which is precisely what the conditional expresses.

Three consequences of the decision are explicit parts of it:

1. **The direct-write path stays.** `PATCH /registers/:registerId` remains correct and supported
   when no draft is active, and is the only path when the `draftConfig` feature flag is off. It is
   neither removed nor deprecated. What changes is branch selection in the UI: in draft mode with a
   draft, every settings field routes through `PATCH /config-versions/draft`; outside draft mode,
   every settings field routes through `PATCH /registers/:registerId`. Never both.

2. **Publishing a manual draft does not unlink a register from its template.**
   `linkedTemplateVersionId` advances only when a template-origin draft is published. A linked
   register that publishes a manual draft stays linked at its current template version and drifts
   from it visibly. Divergence is a normal, recoverable state the administrator should be able to
   see and reconcile, not grounds for silently severing the link.

3. **The rule is prospective.** Any register settings field added in future is always-promote by
   default. Adding a field to `ConfigSnapshotRegisterSettings` without adding it to the
   always-promote block is a bug. The standard, the full add-a-field procedure, and the pitfalls
   are recorded in `docs/architecture/register-config-draft-system.md`, which is the document a
   developer adding a field is expected to read.

`responseActionMode` keeps its `snapshotMode !== undefined` guard. That is a legacy-snapshot guard —
a snapshot written before the field existed must not be read as a request to revert to `SIMPLE` —
not a template-origin conditional, and it does not constitute an exception to the rule.

---

## Alternatives considered

**Continue fixing fields one at a time.** Rejected. v1.27.0 is the empirical case against it: each
patch addressed a symptom of the split and opened a new failure mode, and the split itself
guarantees that the next field added inherits the same defect. The per-field approach cannot
converge because the default is wrong.

**Remove register settings from the snapshot entirely and let the direct path own them.** Rejected.
It would make the config version snapshot an incomplete record of the register's configuration,
breaking config export/import and template comparison, and it would leave the configuration screen
with two commit models — Publish for the matrix and fields, immediate save for settings — on a
screen that has no Save button in draft mode.

**Unlink a register from its template when it publishes a manual draft.** Rejected, per consequence
2 above. It converts a visible, reconcilable drift into an irreversible one, and it does so as a
side effect of an action the administrator did not frame as "stop following the template".

---

## Consequences

**Positive**

- One rule, one procedure, one place to look. The categorisation a developer previously had to
  rediscover no longer exists.
- Staged settings changes actually take effect on publish. The v1.27.0 class of silent data loss is
  removed at its source rather than patched per field.
- The config version snapshot becomes an accurate record of what the register's settings were at
  each published version, which makes version history, export/import and template comparison
  trustworthy for settings as well as for matrix and field configuration.
- PM8-CORE's `reviewCommentMode` and attestation-text work inherits correct behaviour by default.

**Negative / accepted risks**

- **`Register.name` is globally `@unique`.** Promoting it unconditionally means a publish can now
  violate that constraint, and `publishDraft` has no error mapping — a raw `P2002` surfaces as a
  500. The collision must be detected in `analyseImpact` as a blocker. This generalises: any
  database-level constraint on a promoted field must be checked pre-flight, not caught at the write.
- **Validation asymmetry becomes exploitable.** `snapshotRegisterSettingsSchema` is looser than
  `updateRegisterSchema` for `riskIdPrefix` (no format regex), `name` (absent entirely) and
  `defaultNewRiskState` (`z.string()` against a `RiskState` enum column). Where the draft schema was
  previously the weaker route to a value that was discarded on publish, it is now the weaker route
  to the live column. The two schemas must be brought into agreement and kept there.
- **Settings changes made in draft mode appear in the audit trail as `configPublished` rather than
  as `registerSettingsUpdated` with per-field `fieldChanges`.** The config version snapshots remain
  the durable record of what changed. Accepted for this release; a per-field diff on publish would
  belong in `publishDraft`'s audit event if it later becomes a requirement.
- **Every component that writes a settings field must carry the draft branch**, not just
  `RegisterSettingsTab`. `FieldConfigTab`'s `reorderReviewStatusMutation` writes
  `reviewStatusPosition` with no guard and must be brought into line. A missed call site is now
  guaranteed data loss on publish rather than a transient inconsistency.
- **Administrators lose immediate-effect saves for settings while a draft is open**, including
  `allowViewerExport`. Accepted: publishing takes seconds, and the screen already required a
  publish for every other setting on it.

---

## References

- `docs/architecture/register-config-draft-system.md` — the standard, the add-a-field procedure,
  and the pitfalls.
- `docs/spikes/SPIKE-008.md` — the field-by-field analysis behind the decision.
- `docs/decisions/ADR-0004-config-version-storage.md` — why configuration is versioned as a JSON
  snapshot.
