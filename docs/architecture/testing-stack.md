# Testing stack and conventions

Extracted 2026-07-27 from `.claude/agents/test-engineer.md` during `/work-init` adoption,
preserved close to verbatim.

## Testing architecture

### Backend tests
- **Location:** `backend/test/*.test.mjs`
- **Runner:** Node built-in test runner
- **Pattern:** Integration-style tests against the running Express app (see existing
  tests for patterns)
- **Coverage areas:** routes, controllers, permission enforcement, audit event creation,
  validation, business logic edge cases

### Frontend tests — static assertions
- **Location:** `frontend/test/*.test.mjs`
- **Runner:** Node built-in test runner (`node --test`)
- **Purpose:** Low-cost guardrails — verify route exposure, feature wiring, package
  scripts, source-level invariants
- **Limitation:** These cannot detect bugs that exist while the source still "mentions the
  right functions"

### Frontend tests — runtime behavioral
- **Location:** `frontend/test/*.behavior.test.tsx`
- **Runner:** Vitest + jsdom + Testing Library
- **Purpose:** User-visible interaction flows: modal entry, conditional button
  availability, mutation success, cache invalidation, post-save UI refresh
- **When required:** Any time a defect could survive while the source still references the
  expected hooks or API functions

## Key test commands

```bash
# From repo root
npm run test           # All workspace tests
npm run typecheck      # TypeScript validation across all packages

# Backend only
cd backend && npm test

# Frontend only (static)
cd frontend && npm test

# Frontend runtime behavioral (Vitest)
cd frontend && npx vitest run
```

## Choosing the right test layer

- Use static `.test.mjs` tests for source-shape guardrails.
- Use `*.behavior.test.tsx` for real user-visible behavior — if you can imagine a bug that
  would pass the static test, write a runtime behavioral test.
- Never assume a static test is sufficient for an interactive frontend flow.

## Spike verification

Spikes produce a document, not code. For any work item with `type: spike`, do not write
tests. Instead, perform a minimal check only: confirm that `docs/spikes/[ITEM-ID].md`
exists and contains both a `## Findings` section and a `## Recommendations` section. If
either is missing, raise it to the assigned agent before signing off.

## Visual consistency check (frontend UI changes only)

If a release includes frontend UI changes, before signing off:

- Icons match the style (outline vs filled), size, and colour treatment used in the rest
  of the app.
- Heading levels and typography are consistent within the same component/modal (e.g.
  `Title order` props, font sizes) — new sections use the same heading variant as sibling
  sections in the same container.
- Component variants (buttons, badges, cards) are consistent with how the same elements
  appear elsewhere.
- Any UI that depicts or references the app's own navigation or components (help pages,
  onboarding) accurately reflects the actual current UI.
- **Help content accuracy:** check `frontend/public/help/en/` for any sections describing
  the features changed in this release. Verify the help content matches the actual current
  UI — screenshots references, feature descriptions, navigation paths. Raise any
  inaccuracies back to the frontend developer before signing off.

Skip this section entirely if the release contains no frontend UI changes.

## Sign-off report requirements

Every sign-off must include a **Test run summary** covering:

- Total tests run and result (pass/fail count).
- Any tests that failed during the run, and how each was classified: regression raised to
  the developer, or legitimate change (with the acceptance criterion that justified the
  update).
- Any existing tests modified, and why.
- New tests added and what they cover.

This summary is an audit trail and belongs in the release record.

## Regression discipline

When a bug is fixed, write a test that would have caught it. Do not leave a regression
unprotected.
