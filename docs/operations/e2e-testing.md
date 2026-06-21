# E2E Testing Operations

This document covers how to run, configure, and maintain the E2E test suite for customRisk. For the architectural rationale and test strategy decisions, see `docs/decisions/ADR-0011-e2e-test-layer.md`.

---

## Important: E2E tests are not run in CI

E2E tests are run **manually by the Test Engineer** when changes affect existing E2E coverage. They are not part of the automated CI pipeline and do not run on every pull request. When CI gating is introduced, this document and ADR-0011 §2.5 will be updated.

---

## Prerequisites

Before running the E2E suite, ensure the following are in place:

1. **Node.js** — same version as the rest of the project (see `.nvmrc` or `package.json > engines`)
2. **Playwright browsers installed** — run once after first checkout or after updating Playwright:
   ```sh
   npx playwright install --with-deps chromium
   ```
3. **Application running** — both the backend and frontend must be running locally before starting tests:
   ```sh
   # In separate terminals (or via docker compose):
   npm run dev:backend
   npm run dev:frontend
   ```
   The frontend must be accessible at `http://localhost:5173` (the `baseURL` in `playwright.config.ts`).

4. **PostgreSQL running** — the backend must have a connected database with all migrations applied.

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string — used by the seed and teardown scripts (Prisma reads this directly) |
| `E2E_TEST_PASSWORD` | Yes | Password used for all E2E fixture user accounts. Set to any strong value that is consistent across seed and test runs |

Set these in a local `.env` file at the repository root, or export them in your shell before running the suite:

```sh
export DATABASE_URL="postgresql://user:pass@localhost:5432/customrisk"
export E2E_TEST_PASSWORD="a-strong-local-test-password"
```

---

## Running the full suite

```sh
# 1. Seed the E2E fixture data
npm run e2e:seed

# 2. Run Playwright (auth setup runs first automatically)
npm run e2e

# 3. Tear down fixture data when done
npm run e2e:teardown
```

The `e2e:seed` script is idempotent — it is safe to run multiple times. The `e2e:teardown` script is destructive — run it only after a test session completes.

---

## Running a single test

To run a single test file:

```sh
npx playwright test e2e/tests/my-test-file.spec.ts
```

To run tests matching a title string:

```sh
npx playwright test --grep "Register Admin"
```

To run a specific project (e.g. the auth setup only):

```sh
npx playwright test --project=auth-setup
```

---

## Viewing the HTML report

After a test run, Playwright generates an HTML report at `playwright-report/`. Open it with:

```sh
npx playwright show-report
```

The report opens in your default browser and shows pass/fail status, traces, and screenshots for each test.

---

## Fixture data

All fixture data is managed by the seed and teardown scripts:

- `e2e/fixtures/seed.ts` — creates named users, registers, risks, actions, and configuration flags
- `e2e/fixtures/teardown.ts` — removes all records identifiable by the `@test.local` email domain and `e2e-` name prefix

Named fixture users (see `docs/spikes/SPIKE-003.md` §4.2 for the full rationale):

| Email | Role |
|---|---|
| `sys-admin@test.local` | System Admin |
| `reg-admin-a@test.local` | Register Admin on Register A |
| `reg-viewer-a@test.local` | Register Viewer on Register A |
| `risk-owner-a@test.local` | Risk Owner on Risk X (no explicit register role) |
| `response-owner-a@test.local` | Risk Response Owner on Action A (no explicit register role) |
| `no-access@test.local` | Authenticated, no register role |

All accounts use the password from `E2E_TEST_PASSWORD`.

---

## Authentication

Each named role has a cached Playwright `storageState` file written by the auth setup project. Files are stored in `e2e/auth/.auth/<role>.json` and are gitignored. They are regenerated at the start of each test session when the auth setup project runs.

The auth setup file is at `e2e/auth/auth.setup.ts`.

---

## data-testid naming convention

All stable selectors used in E2E tests (and in `*.behavior.test.tsx` behavioral tests) must use `data-testid` attributes, not CSS class names, placeholder text, or other implicit selectors.

**Convention:** `kebab-case`, scoped to the component or section, describing the semantic role of the element.

Examples:

| Attribute | Component | Meaning |
|---|---|---|
| `current-password-input` | ProfilePage | Current password field in the change-password form |
| `new-password-input` | ProfilePage | New password field |
| `confirm-password-input` | ProfilePage | Confirm password field |
| `api-key-name-input` | ProfilePage — Generate API Key modal | API key name field |
| `risk-detail-field-table` | RiskDetailModal | Data table containing risk field rows |
| `risk-detail-field-th` | RiskDetailModal | Each field label cell (`<Table.Th>`) in the detail table |

When adding new `data-testid` attributes, follow the same `kebab-case` pattern. Scope the name to the component and describe the element's semantic role, not its visual appearance or position.
