# Custom Risk API Standards

**Version:** 1.0  
**Date:** 2026-05-09  
**Status:** Active  
**Applies to:** Current and future API development  
**Related documents:** Technical Architecture v1.1, Permission Model v1.1, Audit Model v1.1, Security Model v1.1, Postman Collection

---

## 1. Purpose

This document defines the durable API conventions for Custom Risk.

It is the source of truth for cross-cutting API rules such as:

- versioned base path;
- request and response envelopes;
- error response shape and standard error codes;
- pagination and sorting conventions;
- validation expectations;
- route naming principles;
- audit expectations for mutating routes.

It does **not** attempt to list every implemented endpoint. The current route
surface should be maintained in the Postman collection under `docs/postman/`.

---

## 2. API Ownership Split

- Use `docs/postman/` as the reference for currently implemented endpoints and example requests.
- Use this document for API-wide conventions and compatibility expectations.
- Use `permission-model.md`, `audit-model.md`, and `security-model.md` for policy rules that apply across routes.

---

## 3. Base Path and Media Types

### 3.1 Base Path

```text
/api/v1
```

### 3.2 Content Types

- JSON is the default request and response format.
- CSV exports return `text/csv`.
- Operational endpoints may use other formats where appropriate, for example
  Prometheus metrics using `text/plain`.

---

## 4. Authentication Conventions

Authenticated API requests use:

```http
Authorization: Bearer <access_token>
```

Browser-session JWT access tokens remain the default authentication mechanism
unless a later documented feature adds another supported bearer-token type.

---

## 5. Response Shapes

### 5.1 Success Envelope

Single-object response:

```json
{
  "data": {
    "id": "uuid"
  }
}
```

List response:

```json
{
  "data": [],
  "meta": {
    "total": 100,
    "page": 1,
    "pageSize": 25
  }
}
```

### 5.2 Error Envelope

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable summary",
    "fields": {
      "title": "Risk title is required"
    },
    "requestId": "uuid"
  }
}
```

`fields` is optional and is used for validation-style failures. `requestId` is
optional but should be included whenever the request context has generated one.

---

## 6. Standard Error Codes

| HTTP Status | Error Code | Meaning |
|---:|---|---|
| 400 | `VALIDATION_ERROR` | Request body or query parameter failed validation. |
| 401 | `UNAUTHENTICATED` | No valid authentication credentials were provided. |
| 403 | `FORBIDDEN` | Authenticated but not permitted for this action. |
| 404 | `NOT_FOUND` | Resource does not exist or should not be disclosed to this caller. |
| 409 | `CONFLICT` | Uniqueness conflict or duplicate state transition. |
| 422 | `UNPROCESSABLE` | Business rule violation after syntactic validation passed. |
| 429 | `RATE_LIMITED` | Too many requests. |
| 500 | `INTERNAL_ERROR` | Unexpected server error. |

Use `404` for both genuine not-found and permission-hidden resources where
revealing existence would be inappropriate.

### 6.1 Adding New Error Codes

- Prefer existing generic codes where they are sufficient.
- Add a new code only when clients need to branch on a specific failure reason.
- New codes use `SCREAMING_SNAKE_CASE`.
- New codes should be documented in this file and reflected in the Postman collection when implemented.
- New codes should map to an existing HTTP status unless there is a strong documented reason to extend the status set.

---

## 7. Pagination and Sorting

### 7.1 Pagination

List endpoints use offset pagination by default:

```text
?page=1&pageSize=25
```

Responses include:

```json
{
  "meta": {
    "total": 100,
    "page": 1,
    "pageSize": 25
  }
}
```

### 7.2 Sorting

Sortable endpoints use:

```text
?sortBy=fieldName&sortDir=asc
```

`sortDir` values:

- `asc`
- `desc`

Any exception to these conventions should be documented in the relevant phase
ticket and reflected in the Postman collection.

---

## 8. Validation

- Validate request bodies and query parameters before they reach service logic.
- Zod is the preferred request validation mechanism in the current backend stack.
- Server-side validation is authoritative even if the frontend mirrors the same rules.
- Field-specific validation failures should populate `error.fields` where practical.

---

## 9. Route Design Principles

- Name routes after resources, not actions.
- Use plural nouns for collections.
- Use kebab-case for multi-word path segments.
- Use `:id` for UUID path parameters unless a more specific parameter name improves clarity.
- Nest sub-resources only when they are meaningfully owned by the parent resource.
- Use HTTP verbs consistently:
  - `GET` for read
  - `POST` for create
  - `PATCH` for partial update
  - `PUT` for full replacement where needed
  - `DELETE` for delete operations
- Non-CRUD actions should usually be modeled as sub-resources rather than verb-style route names.

---

## 10. Audit Expectations

- Mutating routes should create audit events where required by `audit-model.md`.
- Audit creation should happen in the same transaction as the business change wherever practical.
- Route handlers must not expose secrets or sensitive operational values through audit or error payloads.

---

## 11. Implemented Route Reference

The live route inventory belongs in the Postman collection:

- collection files: `docs/postman/postman/collections/Custom Risk API/`
- usage notes: `docs/postman/README.md`

When a route is added, removed, or materially changed:

1. Update the backend implementation and tests.
2. Update the Postman collection to reflect the implemented behavior.
3. Update this document only if a cross-cutting API convention changed.
