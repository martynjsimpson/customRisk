# Group 1 — Finish Started Work

This group is the shortest path to reducing doc/code drift. It focuses on work that is already live in some form but is not fully aligned with its planning acceptance criteria.

## Why this group comes first

- the codebase already contains most of the implementation shape;
- the remaining work is comparatively bounded;
- closing these gaps will make the rest of the roadmap easier to reason about.

## Included tickets

### Phase 1 — Profile and Preferences

- `PM1-01` Done (v1.9.0): password change correctly excludes the current refresh token from revocation. Current session is preserved; other sessions are revoked. Test coverage confirmed.
- `PM1-03` Done (v1.8.0): deepMergeObjects is implemented and used in updateMyPreferences. Nested preference keys are not overwritten on partial update.
- `PM1-05` Done (v1.9.0): preferences are in the React Query cache (not useState). Bootstrap primes the cache; failures are non-fatal; mutations update in-memory state immediately. Behavioral tests added.

### Phase 2 — Person Identity

- `PM2-02` Done (v1.8.0): risks.service.ts resolves ownerEmail via resolvePersonInput on create and update. Risk Owner supports email-only input. Frontend Risk form supports email-only mode.
- `PM2-05` Partially done (v1.9.0): canEditRisk checks ownerPerson.userId in its OR clause; null-userId PersonReference correctly denied edit access. Test coverage confirmed. Remaining open: admin data-quality views for unresolved assignments, full audit event coverage for assignment changes.

### Phase 4 — Configuration Lifecycle and Templates

- Verification shows Phase 4 is effectively implemented end-to-end.
- No further active work in this group.

## Exit condition

Phase 1 is fully closed. Phase 2 permission/access work is closed; remaining open items from PM2-05 (admin views, audit events) are carry-forward to a later group. Phase 4 is closed.

This group is effectively done as of v1.9.0.

## Note on Phase 14

PM14-04, PM14-08, and PM14-09 were previously listed here as partial but are correctly classified as Planned (not started). They belong in a later group once the product-facing gaps above are closed.
