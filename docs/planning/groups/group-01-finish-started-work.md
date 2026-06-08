# Group 1 — Finish Started Work

This group is the shortest path to reducing doc/code drift. It focuses on work that is already live in some form but is not fully aligned with its planning acceptance criteria.

## Why this group comes first

- the codebase already contains most of the implementation shape;
- the remaining work is comparatively bounded;
- closing these gaps will make the rest of the roadmap easier to reason about.

## Included tickets

### Phase 1 — Profile and Preferences

- `PM1-01` Partial: self-service profile and password change exist, but password change currently revokes all refresh tokens rather than preserving the current session.
- `PM1-03` Partial: preferences storage and endpoints exist, but nested preference updates are only shallow-merged.
- `PM1-05` Partial: preference bootstrap exists, but it still sits on the protected-route critical path and lacks a clear query-cache pattern.

### Phase 2 — Person Identity

- `PM2-02` Partial: unresolved email person values work for custom person fields, but not for the main Risk Owner flow.
- `PM2-05` Partial: unresolved-person review and assignment auditing exist, but effective permission logic still relies on legacy `ownerUserId` checks.

### Phase 4 — Configuration Lifecycle and Templates

- verification shows Phase 4 is effectively implemented end-to-end.
- use this phase mainly for polish, regression checking, and clarifying any acceptance criteria that are now satisfied by a slightly different implementation shape than originally planned.

### Phase 14 — Hardening Already Started

- `PM14-04` Partial: session/token behavior is reasonably centralised, but there is no explicit multi-instance job-locking or scaling plan.
- `PM14-08` Partial: some compliance evidence surfaces exist, but not a consolidated control pack.
- `PM14-09` Partial: the UI has responsive basics, but there is no dedicated mobile/PWA decision or review output.

## Recommended order inside this group

1. Finish `PM2-02` and `PM2-05` so person identity and permissions stop straddling old and new ownership models.
2. Finish `PM1-01`, `PM1-03`, and `PM1-05` to tighten session and preference behavior.
3. Run one explicit "Phase 4 acceptance closeout" pass rather than reopening the implementation scope.
4. Capture `PM14-04`, `PM14-08`, and `PM14-09` as explicit platform follow-through once the product-facing gaps above are closed.

## Exit condition

This group is done when the shipped features no longer need caveats like "mostly works except..." in the planning index.
