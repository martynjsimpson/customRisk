# ADR-0002 - GitHub Actions Node 24 Runtime Compatibility

**Status:** Accepted
**Date:** 2026-05-04
**Applies to:** CI workflow runtime
**Related architecture:** `docs/architecture/Technical_Architecture.md`
**Related decision:** `ADR-0001-technical-stack.md`

---

## 1. Context

GitHub Actions is deprecating Node.js 20 as the JavaScript action runtime.

The repository CI workflow used:

- `actions/checkout@v4`
- `actions/setup-node@v4`

Those action versions target the older GitHub Actions JavaScript runtime and can
trigger deprecation warnings.

This warning concerns the runtime used internally by GitHub-hosted JavaScript
actions. It is separate from the Node.js version used by the Custom Risk
application and by CI commands such as `npm ci`, `npm run typecheck`, and
`npm run test`.

---

## 2. Decision

Update the CI workflow to use Node 24-capable GitHub-maintained actions:

- `actions/checkout@v6`
- `actions/setup-node@v6`

Keep the project Node.js version set to Node.js 20 in `actions/setup-node`.

The workflow step is named `Set up project Node.js 20` to make the distinction
explicit.

---

## 3. Consequences

CI should no longer depend on JavaScript actions that target the deprecated
Node.js 20 action runtime.

The Custom Risk MVP technical stack is unchanged:

- application runtime remains Node.js 20 LTS;
- Docker runtime remains `node:20-alpine`;
- backend/frontend TypeScript, Express, React, Vite, Prisma, and PostgreSQL
  decisions remain as accepted in `ADR-0001`.

This decision does not introduce a new framework, language runtime for the
application, package manager, deployment model, or product-scope change.

If the application runtime itself is upgraded later, that should be recorded as
a separate ADR and reflected in `Technical_Architecture.md`, Docker files,
README prerequisites, and CI project Node setup.
