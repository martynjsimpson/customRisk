# Custom Risk Security Model

**Version:** 1.1  
**Date:** 2026-05-09  
**Status:** Active  
**Applies to:** Current and future security implementation  
**Related documents:** Technical Architecture v1.0, API Standards v1.0, Permission Model v1.1, Audit Model v1.1, Observability Notes

---

## 1. Purpose

This document defines the durable security model for Custom Risk.

It is the source of truth for:

- authentication and session rules;
- password handling and policy;
- access-token and refresh-token behavior;
- account lockout and auth rate limiting;
- CORS and browser-session controls;
- secret-handling expectations;
- security logging and audit requirements;
- current security-related deferrals.

It is not the route inventory or the canonical schema definition.

---

## 2. Document Ownership Split

- Use this document for security policy and application-security behavior.
- Use `backend/prisma/schema.prisma` as the canonical physical schema.
- Use `docs/postman/` for currently implemented auth and health endpoints.
- Use `docs/operations/observability.md` for request IDs, correlation headers, metrics, tracing, dashboard, and alerting guidance.
- Use post-MVP phase docs for future SAML, MFA, password-reset, API-key, and webhook security extensions.

---

## 3. Security Principles

1. **Server-side enforcement is mandatory.**  
   The backend must enforce authentication, authorization, validation, and field-level restrictions.

2. **Least privilege by default.**  
   Users receive only the access granted by System Admin state, register permissions, or ownership-derived access.

3. **Short-lived bearer access.**  
   Browser API access uses short-lived JWT access tokens stored in frontend memory only.

4. **Refresh tokens are high-value secrets.**  
   Refresh tokens must be opaque, stored only as hashes server-side, rotated on every use, and sent only through HttpOnly cookies.

5. **Secrets are never logged.**  
   Passwords, tokens, API keys, cookie values, hashes, and signing secrets must not appear in logs, audit records, responses, or error payloads.

6. **Security events are auditable.**  
   Logins, lockouts, token reuse detection, permission changes, exports, and meaningful permission-denied events should produce structured audit evidence where implemented.

7. **Production origins must be explicit.**  
   Production CORS must not use wildcard origins.

---

## 4. Authentication Model

### 4.1 Local Authentication

The current authentication model is application-managed local authentication.

User credentials are stored in PostgreSQL through the `user` table. Passwords
are stored only as password hashes.

Plain-text passwords must never be stored, returned, logged, or audited.

Inactive users cannot authenticate successfully.

### 4.2 Login

Current login flow:

```text
POST /api/v1/auth/login
```

Rules:

- validate email and password server-side;
- normalize email consistently before lookup;
- return a generic auth failure for invalid credentials;
- do not reveal whether an email exists;
- apply rate limiting;
- apply account lockout rules;
- issue a new access token and refresh token on success;
- reset failed-login counters on success;
- increment failed-login state on failure;
- audit login success and failure where implemented.

### 4.3 Logout

Current logout flow:

```text
POST /api/v1/auth/logout
```

Rules:

- revoke the presented refresh token where available;
- clear the refresh-token cookie;
- allow the short-lived access token to expire naturally;
- audit logout where implemented.

---

## 5. Password Security

### 5.1 Hashing

Use `bcryptjs` for password hashing.

Default cost factor:

```text
12
```

The cost factor may be overridden by:

```text
BCRYPT_COST_FACTOR
```

Do not implement custom password hashing.

### 5.2 Password Policy

Current password requirements:

- minimum 12 characters;
- at least one uppercase letter;
- at least one lowercase letter;
- at least one digit;
- at least one special character from the approved set;
- must not exactly match the user's email address;
- must not exactly match the user's display name.

Server-side validation is authoritative.

### 5.3 Password Handling

Password values may appear only:

- in the incoming create, update, login, or password-change request;
- in process memory while hashing or verifying.

Password values must not appear in:

- API responses;
- logs;
- audit summaries;
- audit field-change values;
- validation echoes;
- thrown error messages returned to clients.

Password-change auditing, if recorded, must use redacted or summary-only values.

---

## 6. Session and Token Model

The current browser session model uses:

- short-lived signed JWT access tokens;
- rotating opaque refresh tokens.

### 6.1 Access Tokens

| Area | Standard |
|---|---|
| Type | Signed JWT |
| Expiry | 60 minutes by default |
| Browser storage | Frontend memory only |
| Transport | `Authorization: Bearer <access_token>` |
| Purpose | Authorize API requests |

Access tokens must not be stored in:

- `localStorage`;
- `sessionStorage`;
- non-HttpOnly cookies;
- persisted frontend application state.

The frontend may refresh session state on page load by calling:

```text
POST /api/v1/auth/refresh
```

Access-token claims may identify the user, but register permissions and
ownership-derived access must still be evaluated from current database state.

### 6.2 Refresh Tokens

| Area | Standard |
|---|---|
| Type | Opaque random token |
| Expiry | 30 days by default |
| Browser storage | HttpOnly cookie, Secure in production, SameSite=Strict |
| Server storage | Hashed token in `refresh_token.token_hash` |
| Purpose | Obtain new access tokens |

Rules:

- generate with cryptographically secure randomness;
- store only a hash server-side;
- return the plain token only at login or successful rotation;
- rotate on every successful refresh;
- invalidate the previous token after rotation;
- track token families for reuse detection;
- if an already-rotated token is presented, invalidate the user's token family as implemented;
- user deactivation must revoke active refresh tokens;
- logout must revoke the presented refresh token.

### 6.3 Refresh Route

Current refresh flow:

```text
POST /api/v1/auth/refresh
```

Rules:

- read the refresh token from the HttpOnly cookie;
- do not accept browser refresh tokens in request bodies;
- reject missing, expired, revoked, replaced, or unknown tokens;
- reject refresh for inactive users;
- rotate the token on success;
- audit token reuse detection and related security events where implemented.

### 6.4 Cookie Settings

Current refresh-cookie expectations:

| Attribute | Current value |
|---|---|
| `HttpOnly` | Yes |
| `Secure` | Yes in production |
| `SameSite` | `Strict` |
| Path | Auth cookie path |
| Expiry | Align with refresh-token expiry |

For local HTTP development, `Secure` may be disabled by environment-aware server behavior.

---

## 7. Account Lockout and Rate Limiting

### 7.1 Account Lockout

Current account lockout rules:

- maximum failed login attempts: 5;
- failed-attempt window: 15 minutes;
- lockout duration: 15 minutes;
- lockout state stored in the database;
- lockout events recorded in audit logs where implemented.

Relevant fields:

- `User.failedLoginAttempts`
- `User.lastFailedLoginAt`
- `User.lockedUntil`

### 7.2 Rate Limiting

Auth endpoints are rate-limited.

Current intended limits:

| Endpoint | Limit |
|---|---|
| `POST /api/v1/auth/login` | configured by env, default-aligned to current implementation |
| `POST /api/v1/auth/refresh` | 20 requests per IP per minute |

Rate-limited responses must return:

```text
429 RATE_LIMITED
```

Rate limiting is not a replacement for account lockout. Both controls are required.

---

## 8. Authorization Enforcement

Authorization follows `permission-model.md`.

Backend requirements:

- every protected route must require an authenticated actor;
- route middleware may perform broad checks;
- service methods must enforce business permissions;
- field-level edit restrictions must be enforced in risk update services;
- System Admin status used for sensitive actions should be checked against current database state;
- register permissions and ownership-derived access must be evaluated from current database state;
- use hidden `404 NOT_FOUND` where returning `403 FORBIDDEN` would reveal a protected resource.

---

## 9. Request Validation and Input Handling

All request bodies, params, and query values must be validated before reaching business logic.

Current expectations:

- validate UUID path parameters;
- validate enum inputs;
- validate pagination and sorting parameters;
- validate date inputs;
- validate role-specific editable fields;
- reject malformed JSON and invalid request bodies cleanly.

Server-side validation is authoritative.

Error responses must not include stack traces or secret values.

---

## 10. Browser and CORS Security

### 10.1 CORS

Use `cors` middleware with explicit allowed origins.

Production rules:

- configure allowed origins through `CORS_ALLOWED_ORIGINS`;
- do not allow wildcard origins in production;
- allow credentials only for trusted origins;
- reject unknown browser origins.

### 10.2 Browser Storage

Browser storage rules:

- access tokens in memory only;
- refresh token in HttpOnly cookie only;
- no tokens in `localStorage`;
- no tokens in `sessionStorage`;
- no secrets in persisted frontend state.

### 10.3 CSRF

The current browser session model uses bearer access tokens for API
authorization and a refresh-token cookie only for refresh/logout flows.

With `SameSite=Strict` and no broader cookie-authenticated state-changing
surface, CSRF exposure is currently constrained.

If the application later relaxes `SameSite`, supports cross-site embedding, or
accepts broader cookie-authenticated mutations, CSRF protections must be
reassessed before release.

### 10.4 XSS

Current XSS controls rely on:

- React escaping for normal rendering;
- avoiding `dangerouslySetInnerHTML`;
- avoiding server-provided HTML rendering by default;
- keeping bearer tokens out of JavaScript-readable persistent storage.

Any future rich-text or HTML-bearing feature must add explicit sanitization.

---

## 11. Secrets and Environment Configuration

Security-relevant environment variables include:

| Variable | Purpose |
|---|---|
| `JWT_ACCESS_SECRET` | Access-token signing secret |
| `JWT_REFRESH_SECRET` | Refresh-token secret or related refresh auth secret |
| `JWT_ACCESS_EXPIRY` | Access-token expiry, default `60m` |
| `JWT_REFRESH_EXPIRY_DAYS` | Refresh-token expiry, default `30` |
| `BCRYPT_COST_FACTOR` | Password hashing cost factor |
| `CORS_ALLOWED_ORIGINS` | Explicit allowed browser origins |
| `RATE_LIMIT_WINDOW_MS` | Auth rate-limit window |
| `RATE_LIMIT_MAX_LOGIN` | Login rate-limit max |
| `SEED_ADMIN_PASSWORD` | Bootstrap admin password |

Secrets must:

- be cryptographically strong;
- be provided through environment or deployment secret injection;
- never be committed to source control;
- never be printed in startup logs;
- never be echoed back to clients.

Example env files may document required variables, but must never contain real
secret values.

---

## 12. Security Logging and Audit

Security-relevant events must follow `audit-model.md`.

Important current events include:

- `LOGIN_SUCCEEDED`
- `LOGIN_FAILED`
- `LOGOUT`
- `REFRESH_TOKEN_REUSE_DETECTED`
- `ACCOUNT_LOCKED`
- `ACCOUNT_UNLOCKED`
- permission-related admin events where applicable

Logs and audit records must not contain:

- plain passwords;
- password hashes;
- refresh tokens;
- refresh-token hashes;
- access tokens;
- cookie headers;
- full credential-bearing request bodies.

Observability-specific guidance for request IDs, correlation IDs, metrics, and
tracing belongs in `docs/operations/observability.md`.

---

## 13. Data Protection Notes

Current implementation expectations:

- use TLS in production;
- store timestamps in UTC;
- restrict audit logs through the permission model;
- avoid collecting unnecessary personal data;
- preserve hard-delete audit snapshots as defined by the audit model.

Deployment concerns such as encryption at rest, managed key rotation, and
external secret managers may be handled outside application code unless a later
target explicitly brings them into scope.

---

## 14. Current Deferrals

This document does not define the future implementation for every enterprise or
integration security feature.

Later-phase security areas include:

- SAML or other external identity-provider authentication;
- MFA;
- self-service password reset;
- SCIM or directory synchronization;
- group- or team-based access;
- API keys and external integration authentication;
- advanced anomaly detection;
- formal secret-manager integration;
- configurable password policies beyond the current baseline.

See the relevant post-MVP phase documents for those extensions.
