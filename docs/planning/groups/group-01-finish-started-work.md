# Group 1 — Finish Started Work

This group is the shortest path to reducing doc/code drift. It focuses on work that is already live in some form but is not fully aligned with its planning acceptance criteria.

## Why this group comes first

- the codebase already contains most of the implementation shape;
- the remaining work is comparatively bounded;
- closing these gaps will make the rest of the roadmap easier to reason about.

## Included tickets

### Phase 1 — Profile and Preferences

- `PM1-01` Partial: password change calls `revokeActiveRefreshTokens` with no exclusion for the current token, so the user gets logged out immediately after changing their password. Fix: pass the current token hash down from the route and exclude it from revocation.
- `PM1-03` Partial (latent): the backend merge is a single-level spread, so sending a partial nested object overwrites the rest. Not currently broken because the frontend always reconstructs the full `riskTableColumns` object before calling the API. Fix at the backend before adding more nested preference keys.
- `PM1-05` Partial: bootstrap failure handling and immediate mutation updates are done. The missing deliverable is query-cache integration — preferences live in `useState` in the session context rather than a React Query cache.

### Phase 2 — Person Identity

- `PM2-02` Partial: the risk schema and service only accept `ownerUserId` for Risk Owner — there is no email-only input path. Custom person fields support unresolved email values; Risk Owner does not. The design decision ("whether Risk Owner can be email-only") was never made, so it was never built.
- `PM2-05` Partial: `riskAccess.ts` and the edit guard in `risks.service.ts` both check `ownerUserId` only, never `ownerPersonId`. Safe today because PM2-02's gap means every Risk Owner has an `ownerUserId`. Will break the moment an email-only owner is supported, so this should be fixed alongside PM2-02.

### Phase 4 — Configuration Lifecycle and Templates

- Verification shows Phase 4 is effectively implemented end-to-end.
- Use this phase mainly for polish, regression checking, and clarifying any acceptance criteria satisfied by a slightly different implementation shape than originally planned.

## Recommended order inside this group

1. Finish `PM2-02` and `PM2-05` together — they are coupled and must land at the same time.
2. Finish `PM1-01` (session preservation after password change).
3. Fix `PM1-03` backend merge depth before any new nested preference keys are added.
4. Address `PM1-05` query-cache integration when preference complexity warrants it.
5. Run one explicit "Phase 4 acceptance closeout" pass.

## Exit condition

This group is done when the shipped features no longer need caveats like "mostly works except..." in the planning index.

## Note on Phase 14

PM14-04, PM14-08, and PM14-09 were previously listed here as partial but are correctly classified as Planned (not started). They belong in a later group once the product-facing gaps above are closed.
