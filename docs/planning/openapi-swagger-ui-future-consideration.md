# OpenAPI and Swagger UI Future Consideration

**Status:** Working note  
**Date:** 2026-05-20  
**Purpose:** Preserve context for a possible future move from manually maintained Postman route docs toward generated API documentation

---

## 1. Why this note exists

The current implemented API surface is documented in `docs/postman/`.

That works, but it requires manual maintenance whenever backend routes change.
After reviewing the current backend route inventory and refreshing the Postman
collection, the follow-up question came up:

> Should Custom Risk move toward OpenAPI-generated documentation with Swagger UI?

This note captures the current thinking so the work can be picked up later
without having to reconstruct the discussion.

---

## 2. Short answer

Yes, this looks feasible in the current backend stack.

However, it is unlikely to be fully automatic from the current codebase without
some additional route metadata and response-schema work.

The practical target would be:

1. generate an OpenAPI spec from backend schemas and route definitions;
2. serve interactive docs with Swagger UI;
3. decide later whether Postman remains primary, becomes secondary, or is
   generated from the OpenAPI spec.

---

## 3. Why this is feasible here

The backend already has several ingredients that make this realistic:

- Express 5 route definitions under `backend/src/routes/`
- Zod request validation schemas under `backend/src/validators/`
- consistent API response envelope conventions in `docs/architecture/api-standards.md`
- a single versioned API base path at `/api/v1`

This is a better fit for schema-driven OpenAPI generation than for a
decorator-heavy approach that would require restructuring the route layer.

---

## 4. Most likely implementation path

If this is resumed later, the most likely approach is:

- use `@asteasolutions/zod-to-openapi` to generate OpenAPI components and route
  documentation from Zod-backed definitions;
- use `swagger-ui-express` to host Swagger UI from the backend, for example at
  `/api-docs`;
- add a build-time or runtime step that produces the OpenAPI document from the
  backend route inventory.

This approach fits the current TypeScript + Express + Zod stack better than
switching to a new API framework.

Reference links:

- `https://github.com/asteasolutions/zod-to-openapi`
- `https://www.npmjs.com/package/swagger-ui-express`
- `https://swagger.io/specification/`

---

## 5. Important limitation

This should not be described as "automatic docs from code" unless the scope is
qualified carefully.

Current request validation is already represented in Zod, but the backend does
not currently define all of the following in a form that an OpenAPI generator
can infer cleanly:

- response schemas for each endpoint;
- operation summaries and descriptions;
- tags and grouping metadata;
- auth requirements at operation level;
- standard error response variants;
- examples for request and response payloads;
- feature-flag visibility rules such as `draftConfig` and `userPreferences`.

So the realistic result is:

- **partially generated from existing code and schemas**
- plus **explicit annotations for missing API documentation metadata**

---

## 6. Expected benefits

- reduced drift between implemented routes and published docs
- interactive in-browser API explorer for developers
- easier onboarding for future contributors
- better long-term base for client generation or contract checks if needed later
- a stronger single-source-of-truth model than manually maintaining only Postman

---

## 7. Expected costs and tradeoffs

- upfront implementation effort to add OpenAPI metadata
- likely need to define explicit response schemas, not only request schemas
- possible duplication at first while Postman and OpenAPI coexist
- need to decide how feature-flagged routes should appear in docs
- risk of producing low-quality docs if generation is added before endpoint
  metadata is modeled properly

The main risk is not technical impossibility. The main risk is ending up with a
generated document that is technically valid but not actually useful.

---

## 8. Recommended adoption approach

If this work is resumed, the safest path is incremental:

1. Keep `docs/postman/` as the current source of truth initially.
2. Add a minimal OpenAPI generation spike for a small route set first.
3. Confirm the resulting Swagger UI is genuinely useful and maintainable.
4. Expand coverage route group by route group.
5. Decide only after that whether Postman remains:
   - the primary maintained artifact,
   - a secondary executable example set,
   - or something generated from OpenAPI later.

This should be treated as an evolutionary improvement, not a big-bang
documentation rewrite.

---

## 9. Suggested first spike scope

A small proof-of-concept should focus on a narrow, representative set of routes:

- `/api/v1/health`
- `/api/v1/auth/login`
- `/api/v1/auth/me`
- one simple register list/read route
- one mutation route that uses Zod body validation

That spike should answer:

- how much manual route annotation is required;
- whether response envelope modeling is straightforward;
- how cleanly auth and error responses can be represented;
- whether the generated output is good enough to justify broader rollout.

---

## 10. Recommended next step when revisiting

When this is picked up again, the first task should be:

**Create a small OpenAPI proof of concept in the backend without replacing the
existing Postman collection.**

Success criteria for that spike:

- one generated OpenAPI document exists;
- Swagger UI is viewable locally;
- at least a few real routes are represented accurately;
- the amount of required manual annotation is understood;
- a recommendation can then be made on whether to proceed.

---

## 11. Current recommendation

Do not switch documentation systems immediately.

For now:

- keep the Postman collection current;
- treat OpenAPI + Swagger UI as a future improvement candidate;
- revisit when there is time to do a proper proof of concept rather than a
  rushed migration.
