# Custom Risk

Custom Risk is a configurable risk register web application.

## Repository structure

- `frontend/` — React, Vite, TypeScript frontend.
- `backend/` — Node.js, Express, TypeScript API with Prisma.
- `shared/` — shared TypeScript types, enums, and schemas.
- `docs/` — product, architecture, planning, ADRs, and AI build prompts.
- `scripts/` — local development, database, seed, and maintenance scripts.
- `tests/` — cross-application API and E2E tests.

## Local development

Configuration is documented in `.env.example`.

Do not commit real `.env` files or secrets.

### Prerequisites

- Node.js 20 LTS or newer.
- npm with workspace support.
- PostgreSQL 16 for later database-backed phases.

### Install

```sh
npm install
```

### Package scripts

Run these from the repository root:

- `npm run dev:backend` - start the backend package in watch mode on `PORT`.
- `npm run dev:frontend` - start the Vite frontend dev server on port `5173`.
- `npm run typecheck` - typecheck all workspace packages.
- `npm run typecheck:backend` - typecheck only the backend package.
- `npm run typecheck:frontend` - typecheck only the frontend package.
- `npm run typecheck:shared` - typecheck only the shared package.
- `npm run build` - build all workspace packages that define a build script.

The backend and frontend are separate TypeScript packages under npm workspaces.
The shared package is available for API DTOs, enums, and schemas that should not
be duplicated between frontend and backend.
