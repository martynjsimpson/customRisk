# Group 2 — Auth, Fields, and Scoring Foundations

This group contains the next real platform unlocks after the already-started work is cleaned up.

## Why this group matters

- Phase 5 and Phase 6 unlock later reporting, imports, and integrations.
- Phase 3 is still mostly absent, so it should be treated as new work rather than polish.

## Included tickets

### Phase 3 — Enterprise Authentication

- `PM3-01` to `PM3-08`: effectively not started in product terms.
- only a `samlAuth` feature-flag placeholder exists today.

### Phase 5 — Advanced Fields

- not started for the core feature set: warn-on-save, multi-select, calculated fields, visibility, and response-owner visibility are absent.
- partial foundations exist in:
- `PM5-08`: type-change warning groundwork inside config impact analysis.
- `PM5-09`: soft activation/deactivation and audit for custom fields.
- `PM5-10`: configuration UI foundation exists, but not the advanced controls.

### Phase 6 — Advanced Scoring

- partial foundations exist in:
- `PM6-01`: fixed safe scoring logic exists, but not a general formula engine.
- `PM6-04`: recalculation exists for current fixed scoring.
- `PM6-08`: simple configurable risk-ID prefix/zero-padding exists.
- `PM6-09`: basic state handling exists, but not an advanced workflow model.
- the main planned capabilities remain absent:
- formula configuration and builder
- inherent/residual risk
- bulk edit

## Recommended order inside this group

1. Phase 5 core model first: `PM5-01` to `PM5-07`.
2. Phase 6 formula and scoring foundation second: `PM6-01` to `PM6-07`.
3. Phase 6 workflow and bulk operations third: `PM6-08` to `PM6-10`.
4. Phase 3 in parallel only if enterprise auth is now a real roadmap priority.

## Suggested implementation slices

- Field validation and lifecycle: `PM5-01`, `PM5-08`, `PM5-09`, `PM5-10`
- New field capabilities: `PM5-03`, `PM5-04`, `PM5-05`
- Visibility and permission-aware data shaping: `PM5-06`, `PM5-07`
- Formula engine and scoring migration: `PM6-01`, `PM6-02`, `PM6-03`, `PM6-04`
- Inherent/residual risk: `PM6-05`, `PM6-06`, `PM6-07`
- Risk ID / workflow / bulk operations: `PM6-08`, `PM6-09`, `PM6-10`

## Exit condition

This group is done when the app has a stable advanced field/scoring foundation that downstream reporting, imports, and integrations can safely build on.
