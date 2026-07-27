# Frontend stack and conventions

Extracted 2026-07-27 from `.claude/agents/frontend-developer.md` during `/work-init`
adoption, preserved close to verbatim. Cross-cutting rules (API base path, response
envelopes) live in `docs/architecture/domain-rules.md` instead — see that file first.

## Technical stack

| Area | Technology |
|---|---|
| Framework | React 18 |
| Language | TypeScript (strict mode) |
| Build tool | Vite |
| Routing | React Router v6 |
| Server state | TanStack Query v5 |
| Component library | Mantine v7 (`@mantine/core`, `@mantine/hooks`, `@mantine/form`, `@mantine/notifications`, `@mantine/dates`) |
| Data tables | `mantine-datatable` |
| Form state | `@mantine/form` |
| Date handling | Day.js |
| HTTP client | Axios (configured instance in `frontend/src/api/`) |
| Static tests | Node built-in test runner (`*.test.mjs` files in `frontend/test/`) |
| Runtime component tests | Vitest + jsdom + Testing Library (`*.behavior.test.tsx` files in `frontend/test/`) |

## Frontend directory structure

```
frontend/src/
  api/           # Axios instance and API call functions grouped by domain
  components/    # Shared UI components
  features/      # Feature-scoped components, hooks, and pages
    auth/
    registers/
    risks/
    configuration/
    users/
    audit/
  hooks/         # Shared custom hooks
  test/          # Frontend tests
  types/         # Shared TypeScript types
  utils/         # Utility functions
  router/        # Route definitions
  main.tsx       # Entry point
```

## Code consistency

- Before implementing a new pattern, search the existing codebase for how similar things
  are already done and match that pattern exactly.
- Before using a Mantine component for the first time in a file, check
  `frontend/src/main.tsx` for theme `defaultProps` — do not repeat props that are already
  the theme default.
- For table row action buttons, use `variant="subtle" size="xs"` — check nearby tables to
  confirm the pattern.
- Shared API types (response wrappers, pagination shapes) belong in
  `frontend/src/api/types.ts` — import from there, do not redefine.
- Type unions defined in one API module must not be inlined or redeclared in another —
  import the existing type.
- Lists of domain values used in more than one component must be extracted to a shared
  constant and imported.

## Visual consistency

Responsible for ensuring new UI is visually consistent with the rest of the application.
Before considering a feature complete, check:

- **Icons:** use the same icon set, style (outline vs filled), size, and colour treatment
  as the surrounding UI. Never hardcode icon colours — check how the same icon is used in
  adjacent components and match exactly.
- **Colour usage:** do not introduce ad-hoc colours. Use Mantine theme colours and the
  colour conventions already established in the app.
- **Component variants:** if a component (badge, button, icon, card) uses a specific
  variant in one part of the app, use the same variant when rendering the same conceptual
  element elsewhere.
- **Adjacent screen check:** before marking a feature done, open the nearest existing
  screen in the codebase that contains similar UI elements and compare your implementation
  against it. Resolve any visual discrepancies before signalling readiness.
- **Referencing app UI in content:** if a new screen (help page, onboarding guide, tooltip)
  depicts or describes the app's own UI elements, those depictions must accurately reflect
  the actual current UI, not assumed or approximated versions.

## State management

- All API-backed data goes through TanStack Query. Do not use local state for
  server-owned data.
- Use the configured Axios instance with the base URL and auth token interceptor — do not
  create ad-hoc Axios instances.
- Display API errors to the user using the app's shared error display pattern, including
  field-level validation messages where the API returns them.

## Forms

- Use `@mantine/form` for form state, validation, and submission.
- The login page must use credential autocomplete tokens (`username` and
  `current-password`) so password managers work correctly.
- All other app data-entry fields should have password-manager ignore attributes (already
  configured as theme defaults in `main.tsx`).

## Testing layer choice

- `frontend/test/*.test.mjs` — static source assertions for route exposure, feature
  wiring, package scripts, source-level invariants.
- `frontend/test/*.behavior.test.tsx` — runtime behavioral tests with Vitest + jsdom +
  Testing Library for user-visible interaction flows (modal entry, conditional button
  availability, mutation success, cache invalidation, post-save UI refresh).
- If a bug can exist while the source still "mentions the right functions", add or update
  a runtime behavioral test. Static assertions are not sufficient for interactive frontend
  flows.

## API contract

- Build against the API contracts defined by the Principal Architect and the backend
  developer.
- Reference `docs/architecture/api-standards.md` for response envelope shapes and error
  codes.
- Do not hardcode API paths — use the configured API functions in `frontend/src/api/`.

## Feature flags

- Guard frontend nav links and routes with `useFeatureFlags()` from
  `frontend/src/hooks/useFeatureFlags.ts`.
- The `EnabledFeatures` type in `frontend/src/auth/session.tsx` and the `allOff` constant
  in `frontend/src/hooks/useFeatureFlags.ts` must be kept in sync when new flags are added.
  Feature flags are not derived automatically — both locations must be updated explicitly.

## Working conventions

- Read the `## Frontend Standards` section of `docs/engineering/coding-standards.md`
  before writing any code — it defines directory structure, state management rules, API
  call patterns, and refactoring triggers for this codebase.
- Before building UI for a new endpoint, confirm the API contract with the backend
  developer (method, path, request/response shapes, error codes). Build against the
  contract, not assumptions.
- Search for existing patterns in `frontend/src/` before writing new abstractions.
- **Update help content** — if your work changes any user-facing UI behaviour, navigation,
  or feature, update the relevant Markdown files in `frontend/public/help/en/` to reflect
  the current state. Help content is user-facing documentation and must stay accurate. If
  there is no relevant help section yet, create one.
