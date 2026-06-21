# Coding Standards

This document defines the coding standards for customRisk. It is intended as a practical reference during code review — not an exhaustive style guide. Standards are grounded in the patterns that exist in this codebase today.

---

## Backend Standards

### Layered Architecture

The backend follows a strict four-layer architecture. Every feature must respect this separation:

| Layer | Directory | Responsibility |
|---|---|---|
| Routes | `backend/src/routes/` | Register Express routes; apply middleware; bind controllers |
| Controllers | `backend/src/controllers/` | Extract request parameters; call service; call `sendData` |
| Services | `backend/src/services/` | Business logic; database access via Prisma; throw `ApiError` on failure |
| Validators | `backend/src/validators/` | Zod schemas; `infer` TypeScript types from schemas |

Controllers must contain no business logic. A controller function body should be a single `sendData(response, await someService(...))` call. If a controller is doing anything more than extracting params and calling a service, the logic belongs in the service layer.

Services must contain no HTTP concerns. Services must not reference `Request`, `Response`, or Express types. Services throw `ApiError`; they do not write HTTP responses.

Repositories are used only where a data access pattern is complex enough to warrant isolation — see `backend/src/repositories/risks.repository.ts` as the current example. Prefer direct Prisma calls within a service unless the same query is reused across multiple services.

### Error Handling

All domain errors are expressed as `ApiError` instances (see `backend/src/errors/apiError.ts`). The error handler middleware (`backend/src/middleware/errorHandler.ts`) intercepts these and renders the correct HTTP response. Services must never call `response.json()` directly.

Rules:
- Use the narrowest appropriate `ApiErrorCode`. Do not use `INTERNAL_ERROR` for conditions the service can detect and name — use `NOT_FOUND`, `CONFLICT`, `FORBIDDEN`, `UNPROCESSABLE`, etc.
- Never include stack traces or internal identifiers in the `message` field; the message is user-facing.
- Field-level validation errors go in the `fields` map keyed by field path. Field warnings (non-blocking) go in the `warnings` array using `FieldWarning`.
- Unhandled errors bubble to the error handler, which logs the stack internally and returns a safe `INTERNAL_ERROR` response.

### Validation

Every request body, params object, and query string that enters a controller must be validated by a Zod schema registered through `validateRequest` middleware. Schemas live in `backend/src/validators/`. TypeScript types are inferred from the schema using `z.infer<>` — do not write a separate interface that duplicates a schema shape.

### Async Route Handling

All controller functions are wrapped with `asyncRoute` (see `backend/src/utils/asyncRoute.ts`). Do not add try/catch blocks in controllers; let errors propagate to the error handler.

### DRY and Consistency

- If a Prisma `select` shape is used in more than one service function, extract it as a named constant.
- If a data transformation (e.g. `toDateOnlyString`, `decimalOrNull`) is used in more than one module, move it to a shared utility or the relevant service's top-level scope.
- If two services share a concept (e.g. `personReferenceSelect`, `formatPersonDisplay` in `personReference.service.ts`), extract a shared service rather than duplicating.
- Helper functions that do not depend on Prisma or `ApiError` belong in `backend/src/utils/`.

### Permissions

Permission checks are enforced in the service layer, not in controllers or middleware alone. The `requirePermission` middleware enforces coarse-grained route access; fine-grained checks (e.g. register role checks, ownership checks) are performed inside service functions using the `permissions/` module. Never expose data that the actor is not entitled to see, even if they can reach the route.

### Audit Events

Every state-changing operation on a significant entity must record an audit event using `recordAuditEvent` from `audit.service.ts`. See `backend/src/audit/auditActions.ts` for the canonical list of action constants. Do not invent ad-hoc audit action strings inline.

### Refactoring Triggers — Backend

Refactor rather than extend when:

- A service function exceeds roughly 80 lines of logic (excluding blank lines and comments). This is a signal that the function has taken on more than one responsibility.
- The same Prisma query or `select` shape appears in three or more places.
- A controller function body contains an `if` statement, a loop, or any computation beyond extracting request fields.
- A new feature requires duplicating an existing service function with minor differences — extract a shared helper with parameters instead.
- A Zod schema is duplicated across two validator files — factor out the shared portion as a named sub-schema.
- A service needs to know about HTTP status codes to decide what to do — this indicates business logic has leaked from the wrong layer.

---

## Frontend Standards

### Directory Structure

| Directory | Contents |
|---|---|
| `frontend/src/pages/` | Page-level components; one file per route; minimal logic |
| `frontend/src/features/` | Domain-scoped feature modules (risks, configuration, audit) |
| `frontend/src/components/` | Shared, domain-agnostic components usable across features |
| `frontend/src/hooks/` | Shared React hooks |
| `frontend/src/api/` | API client functions and TypeScript types mirroring the API contract |
| `frontend/src/utils/` | Pure utility functions with no React dependency |

### Component Placement

A component belongs in `frontend/src/components/` when it has no dependency on a specific domain and can reasonably be reused across multiple features. Examples: `ApiErrorAlert`, `PersonPicker`, `ReviewStatusBadge`, `RiskLevelBadge`.

A component belongs in `frontend/src/features/<domain>/` when it is tightly coupled to a specific domain model and unlikely to be reused elsewhere. Examples: `RiskFormModal`, `ResponseActionsPanel`, `FieldConfigTab`.

Page components (`frontend/src/pages/`) should delegate all meaningful rendering to feature components. A page component that contains substantial JSX is a signal to extract a feature component.

### State Management

Server state (anything fetched from the API) is managed with TanStack Query (`useQuery`, `useMutation`). Do not use `useState` to store data that came from the API.

Local UI state (modal open/closed, selected tab, form values) uses `useState` or `@mantine/form`. Use `useForm` from `@mantine/form` for all forms with validation or multi-field state; do not manage individual form field state with separate `useState` calls.

Do not use React context for server state. Do not introduce a global state library.

### API Calls

All API calls go through `frontend/src/api/client.ts` (the configured Axios instance). API functions are grouped by domain in `frontend/src/api/<domain>.api.ts` files. TypeScript types for request/response shapes are defined in those same files or in `frontend/src/api/types.ts` for shared types.

Do not call `apiClient` directly from components or hooks — call the named API function from the relevant `*.api.ts` module.

### Error Handling

Use `ApiErrorAlert` from `frontend/src/components/ApiErrorAlert.tsx` to render mutation errors. Use `getApiErrorMessage`, `getApiErrorFields`, `getApiErrorCode`, and `getApiErrorWarnings` from the same module to extract error details programmatically. Do not write inline Axios error inspection code in feature components.

### Shared Hooks

A custom hook belongs in `frontend/src/hooks/` when it encapsulates logic that is (or could be) used from more than one component. Examples: `usePermissions`, `useCurrentUser`, `useFeatureFlags`, `usePreferences`.

Do not reach into `useAuth()` directly from feature components to read permissions — use `usePermissions()` instead.

### Avoiding Duplicate UI Patterns

Before building a new modal, check whether the pattern used in `RiskFormModal` or `ResponseActionModal` already handles the create/edit/loading/error cycle. Prefer extending the existing pattern over introducing a new one.

Before building a new badge or status indicator, check `components/ReviewStatusBadge` and `components/RiskLevelBadge` for the established pattern.

### Refactoring Triggers — Frontend

Refactor rather than extend when:

- A page component contains more than one `useQuery`/`useMutation` call or more than trivial JSX — extract a feature component.
- The same API call appears in more than one component rather than being shared through TanStack Query cache keys — align on the query key and extract a shared hook if needed.
- A pattern for displaying or editing a type of data (e.g. a modal lifecycle, a filter bar, a config tab) is implemented a second time from scratch — extract a reusable component or hook.
- A feature component imports from another feature's directory — extract the shared element to `components/` or `hooks/`.
- A `useEffect` is being used to synchronise React state that could instead be derived — derive it directly from props or query data.

---

## Test Standards

### When Tests Are Required

A test is required for every piece of logic that is not trivially derivable from reading the code. Specifically:

- **Backend services**: unit tests for non-trivial business logic (calculations, conditional branching, error conditions). Integration tests for service functions that coordinate multiple Prisma operations.
- **Frontend behaviour**: behaviour tests for any component that has conditional rendering logic (show/hide, state-dependent rendering), form submission flows, or user interaction sequences.
- **Regression**: every bug fix must include a test that would have caught the bug. The test is committed with the fix.

Tests are not required for:
- Pure type definitions.
- Pass-through controller functions with no branching logic.
- Trivial one-liner utilities that are fully covered by their callers' tests.

### Test Levels

| Level | Tool | When to use |
|---|---|---|
| Unit | Node built-in `node:test` (backend) / Vitest (frontend utils) | Pure functions, formula evaluation, data transformation |
| Behaviour / component | Vitest + jsdom + Testing Library | React component behaviour, form flows, conditional rendering |
| Static assertion | `node:test` (frontend) | Verify source-level presence of required attributes, aria labels, text content without rendering |
| Integration | Node built-in `node:test` | Service-level coordination across multiple Prisma models |

Do not introduce end-to-end browser tests without an ADR — the current stack does not include a browser test runner.

### Naming and Structure

Test files for frontend behaviour live in `frontend/test/` and are named `<subject>.behavior.test.tsx`. Static assertion tests follow the same naming pattern with `.test.ts`.

Backend test files live adjacent to the module under test or in a `tests/` directory at the backend root.

Each test file must open with a block comment describing what the file covers and why — see `frontend/test/responseActions.behavior.test.tsx` and `frontend/test/riskDetailModal.behavior.test.tsx` as the canonical examples.

Group related tests with `describe`. Name each test with `it('...')` using present-tense phrasing that describes the observable outcome: `it('hides the delete button for response action owners')`, not `it('test delete button')`.

### Mocking

In behaviour tests, mock at the module boundary (the API function, not the Axios client). Use `vi.mock('../src/api/<domain>.api', async (importOriginal) => { ... })` and spread `actual` to preserve non-mocked exports. Declare mock functions (`vi.fn()`) at the top of the file, before `vi.mock` calls, and reset them in `beforeEach`.

Do not mock Mantine UI components unless a specific component creates an intractable test environment problem — test the real component tree where possible.

### Fixture Usage

Test data helpers (e.g. `makeRisk()`, `makeResponseAction()`) should be defined as functions at the top of the test file, not as static objects. Functions allow each test to get a fresh instance and override individual fields without mutating shared state.

Do not inline large JSON literals directly inside `it()` blocks — put them in a named helper function.

### Avoiding Brittle Assertions

- Assert on user-visible text and ARIA roles, not on CSS class names or internal component structure.
- Assert on the presence or absence of specific text content and `data-testid` attributes rather than on DOM structure (e.g. avoid `container.querySelector('div > div > button')`).
- When testing that something is not shown, use `expect(screen.queryByText('...')).toBeNull()` rather than asserting the count of a rendered list.
- Do not assert on exact date strings that depend on the system clock without controlling the clock.

### Regression Coverage

When a bug is fixed, the accompanying test must:
1. Reproduce the failure condition before the fix (or be written to verify it would fail on the unfixed code — include a comment explaining this).
2. Assert the specific observable behaviour that was broken.
3. Be named to identify it as a regression test where the context is not obvious from the test description alone.
