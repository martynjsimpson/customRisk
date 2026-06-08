# Group 3 — Actions, Reviews, and Notifications

This group is the largest missing workflow chain in the app. It should be treated as a dependency stack, not as three independent phases.

## Why this group matters

- child actions do not meaningfully exist yet;
- advanced review rules depend on that action model;
- notifications depend on both the workflow model and background-job behavior.

## Included tickets

### Phase 7 — Child-Record Actions

- `PM7-01` to `PM7-10` and `PM7-12` are not found.
- `PM7-11` is only partially represented by existing risk hard-delete snapshotting.

### Phase 8 — Advanced Reviews

- partial MVP-era foundations exist in:
- `PM8-01`: register-level default review frequency
- `PM8-02`: next-review-date calculation
- `PM8-04`: optional review comments
- `PM8-05`: attestation text snapshotting in review records
- the main planned review-rule and action-review capabilities remain absent.

### Phase 9 — Notifications

- `PM9-05` has a partial foundation through due/overdue review logic.
- everything else is effectively absent beyond feature-flag placeholders.

## Recommended order inside this group

1. Build the child-action data and permission model: `PM7-01` to `PM7-06`.
2. Build the action UX surfaces: `PM7-07` to `PM7-12`.
3. Extend reviews from MVP risk reviews into rule-driven reviews: `PM8-01` to `PM8-08`.
4. Add notification infrastructure only after the workflow model is stable: `PM9-01` to `PM9-09`.

## Suggested implementation slices

- Action model and CRUD
- Action ownership, linking, and audit
- Review rules and review outcomes
- Reminder and escalation infrastructure
- SMTP and in-app delivery surfaces

## Exit condition

This group is done when actions are first-class records, reviews can target both risks and actions, and reminders/escalations are backed by real delivery infrastructure rather than manual chasing.
