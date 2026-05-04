# Custom Risk — MVP Security Model

**Version:** 1.0  
**Date:** 2026-05-04  
**Status:** Draft  
**Applies to:** MVP delivery  
**Related documents:** PRD v3.2, MVP Scope v1.2, MVP Functional Specification v1.2, Technical Architecture v1.0, API Route Map v1.0, Permission Model v1.0, Audit Model v1.0

---

## 1. Purpose

This document defines the security model for the Custom Risk MVP.

It consolidates the authentication, session, password, token, API key, rate limiting, CORS, secret handling, audit, and permission enforcement rules that must be followed during implementation.

The MVP uses application-managed local authentication. SAML, Microsoft Entra ID, MFA, SMTP credential handling, advanced secrets management, and enterprise identity lifecycle features are deferred.

---

## 2. Security Principles

1. **Server-side enforcement is mandatory.**  
   UI hiding is helpful for usability, but the backend must enforce authentication, authorisation, validation, and field-level restrictions.

2. **Least privilege by default.**  
   Users receive only the access granted by System Admin status, register permissions, or risk ownership.

3. **Short-lived bearer access.**  
   Browser API access uses short-lived JWT access tokens stored in frontend memory only.

4. **Refresh tokens are high-value secrets.**  
   Refresh tokens must be opaque, stored only as hashes server-side, rotated on every use, and sent only through secure HttpOnly cookies.

5. **Secrets are never logged.**  
   Passwords, tokens, API keys, cookie values, hashes, and signing secrets must not appear in logs, audit records, responses, or error messages.

6. **Security events are auditable.**  
   Logins, lockouts, token reuse detection, permission changes, exports, and meaningful permission denials should create structured audit evidence.

7. **Production origins must be explicit.**  
   Production CORS must not use wildcard origins.

---

## 3. Authentication Model

## 3.1 Local Authentication

MVP authentication is application-managed local authentication.

User credentials are stored in PostgreSQL through the `user` table. The password credential is stored as:

```text
user.password_hash
```

Plain-text passwords must never be stored, returned by the API, logged, or written to audit records.

Inactive users cannot log in.

## 3.2 Login

Login route:

```text
POST /api/v1/auth/login
```

Login rules:

- validate email and password server-side;
- normalise email consistently before lookup;
- return a generic error for invalid credentials;
- do not reveal whether the email address exists;
- apply rate limiting;
- apply account lockout rules;
- on success, issue an access token and refresh token;
- on success, reset failed login counters where applicable;
- on failure, increment failed login counters where applicable;
- create `LOGIN_SUCCEEDED` or `LOGIN_FAILED` audit events where practical.

## 3.3 Logout

Logout route:

```text
POST /api/v1/auth/logout
```

Logout rules:

- revoke or delete the presented refresh token;
- clear the refresh token cookie;
- allow the access token to expire naturally;
- create a `LOGOUT` audit event where practical.

---

## 4. Password Security

## 4.1 Hashing

Use `bcryptjs` for password hashing.

Default cost factor:

```text
12
```

The cost factor may be overridden by:

```text
BCRYPT_COST_FACTOR
```

Password verification must use bcrypt comparison. Do not implement custom hashing.

## 4.2 Password Policy

Password requirements:

- minimum 12 characters;
- at least one uppercase letter;
- at least one lowercase letter;
- at least one digit;
- at least one special character: `!@#$%^&*()_+-=[]{}|;':",.<>?`;
- must not match the user's email address;
- must not match the user's display name.

Server-side validation is authoritative. Frontend validation may mirror these rules for user experience.

## 4.3 Password Handling

Password values may appear only:

- in the incoming create/update/login request body;
- in process memory while hashing or verifying.

Password values must not appear in:

- API responses;
- logs;
- audit summaries;
- audit field-change values;
- validation error field echoes;
- thrown error messages.

Password changes may be audited with a redacted field-change value such as:

```json
{
  "changed": true
}
```

---

## 5. Session and Token Model

The MVP uses:

- short-lived signed JWT access tokens;
- rotating opaque refresh tokens;
- API keys for external integrations.

## 5.1 Access Tokens

Access token standard:

| Area | Standard |
|---|---|
| Type | Signed JWT |
| Expiry | 60 minutes by default |
| Browser storage | Frontend memory only |
| Transport | `Authorization: Bearer <access_token>` |
| Purpose | Authorise API requests |

Access tokens must not be stored in:

- `localStorage`;
- `sessionStorage`;
- non-HttpOnly cookies;
- persisted application state.

On page load, the frontend must call:

```text
POST /api/v1/auth/refresh
```

to obtain a new access token before rendering protected routes.

Access token claims may include the user ID and basic session metadata. Register-level permissions and risk ownership must still be evaluated from current database state for protected operations.

## 5.2 Refresh Tokens

Refresh token standard:

| Area | Standard |
|---|---|
| Type | Opaque random token |
| Expiry | 30 days by default |
| Browser storage | HttpOnly, Secure, SameSite=Strict cookie |
| Server storage | Hashed token in `refresh_token.token_hash` |
| Purpose | Obtain new access tokens |

Refresh token rules:

- generate using cryptographically secure randomness;
- store only a hash server-side;
- return the plain token only at login or successful rotation;
- rotate on every successful refresh;
- invalidate the previous token after rotation;
- store token family ID for reuse detection;
- if an already-rotated token is presented, invalidate all refresh tokens for that user;
- user deactivation must revoke all refresh tokens for that user;
- logout must revoke the presented refresh token.

## 5.3 Refresh Route

Refresh route:

```text
POST /api/v1/auth/refresh
```

Rules:

- read refresh token from the HttpOnly cookie;
- do not accept refresh tokens in request bodies for browser sessions;
- reject missing, expired, revoked, or unknown tokens;
- reject refresh for inactive users;
- rotate token on success;
- create security audit events for token reuse detection.

## 5.4 Cookie Settings

Refresh token cookie settings:

| Attribute | MVP value |
|---|---|
| `HttpOnly` | Yes |
| `Secure` | Yes in production |
| `SameSite` | `Strict` |
| Path | Auth refresh/logout path or API root |
| Expiry | Align with refresh token expiry |

For local development over HTTP, `Secure` may be disabled by environment configuration only.

---

## 6. Account Lockout and Rate Limiting

## 6.1 Account Lockout

Account lockout rules:

- maximum failed login attempts: 5;
- failed attempt window: 15 minutes;
- lockout duration: 15 minutes;
- lockout state stored in the database;
- lockout events recorded in audit logs.

Relevant Prisma fields:

- `User.failedLoginAttempts`;
- `User.lastFailedLoginAt`;
- `User.lockedUntil`.

After the lockout window passes, the attempt counter should reset automatically on the next successful login.

MVP relies on time-based lockout expiry rather than manual admin unlock, though an admin unlock endpoint may be included as defined in the API Route Map.

## 6.2 Rate Limiting

Apply `express-rate-limit` to authentication endpoints:

| Endpoint | Limit |
|---|---|
| `POST /api/v1/auth/login` | 10 requests per IP per minute |
| `POST /api/v1/auth/refresh` | 20 requests per IP per minute |

Rate-limited responses must return:

```text
429 RATE_LIMITED
```

Rate limiting is not a replacement for account lockout. Both controls are required.

---

## 7. API Keys

External integrations must use API keys rather than user JWTs.

API key standard:

| Area | Standard |
|---|---|
| Token format | Random 32-byte token, base64url encoded |
| Prefix | `cr_live_...` or environment-specific equivalent |
| Storage | Hashed in `api_key.key_hash` |
| User link | `api_key.user_id` |
| Transport | `Authorization: Bearer <api_key>` |
| Permission model | Inherits linked user's current permissions |
| Revocation | Immediate by deleting or revoking API key record |

API keys must be differentiated from JWTs by prefix detection.

API key values must never be logged or stored in plain form after creation. Audit API key usage with a key identifier or prefix only.

API key management UI is post-MVP. For MVP, keys may be created by System Admins directly in the database or through a restricted admin endpoint.

---

## 8. Authorisation Enforcement

Authorisation follows the Permission Model.

Backend requirements:

- every protected route must require an authenticated actor;
- route middleware may perform broad checks;
- service methods must enforce business permissions;
- field-level edit restrictions must be enforced in risk update services;
- System Admin status used for sensitive actions should be confirmed against current database state;
- register permissions and risk ownership must be evaluated from current database state;
- API keys must use the same permission checks as browser sessions.

Use `404 NOT_FOUND` where returning `403 FORBIDDEN` would reveal the existence of hidden resources.

---

## 9. Request Validation and Input Handling

All request bodies and query parameters must be validated with Zod before reaching service logic.

Validation rules:

- reject unknown or invalid enum values;
- validate UUID path parameters;
- validate pagination and sorting parameters;
- validate date inputs;
- validate custom field payloads against field definitions;
- validate risk updates against role-specific editable fields;
- validate uploaded/imported files only when import is added in a later phase.

Server-side validation is authoritative. Frontend validation is supportive only.

Error responses must not include stack traces or secret values.

---

## 10. Browser and CORS Security

## 10.1 CORS

Use the `cors` middleware.

Production CORS rules:

- configure explicit allowed origins through `CORS_ALLOWED_ORIGINS`;
- do not use wildcard origins in production;
- allow credentials only for trusted origins;
- reject unknown origins.

## 10.2 Browser Storage

Browser storage rules:

- access tokens in memory only;
- refresh token in HttpOnly cookie only;
- no tokens in localStorage;
- no tokens in sessionStorage;
- no secrets in persisted frontend state.

## 10.3 CSRF

The browser session model uses bearer access tokens for API authorisation and a refresh token cookie for obtaining new access tokens.

Refresh-token cookie controls:

- `SameSite=Strict`;
- HttpOnly;
- Secure in production.

If the app later relaxes SameSite settings, supports cross-site embedding, or accepts state-changing cookie-authenticated requests beyond refresh/logout, CSRF protection must be revisited before release.

## 10.4 XSS

MVP XSS controls:

- rely on React escaping for normal rendering;
- avoid `dangerouslySetInnerHTML`;
- sanitise any future rich-text content before rendering;
- do not store access tokens in JavaScript-readable persistent storage;
- avoid rendering server-provided HTML.

---

## 11. Secrets and Environment Configuration

Required security-related environment variables:

| Variable | Purpose |
|---|---|
| `JWT_ACCESS_SECRET` | Access JWT signing secret. |
| `JWT_REFRESH_SECRET` | Refresh JWT signing secret, if JWTs are used for refresh implementation details. |
| `JWT_ACCESS_EXPIRY` | Access token expiry, default `60m`. |
| `JWT_REFRESH_EXPIRY_DAYS` | Refresh token expiry, default `30`. |
| `BCRYPT_COST_FACTOR` | Password hashing cost factor, default `12`. |
| `CORS_ALLOWED_ORIGINS` | Explicit allowed browser origins. |
| `RATE_LIMIT_WINDOW_MS` | Auth rate-limit window. |
| `RATE_LIMIT_MAX_LOGIN` | Login rate-limit max. |
| `SEED_ADMIN_PASSWORD` | Local/dev seed admin password. |

Secrets must:

- be cryptographically random;
- be at least 256 bits where applicable;
- be injected through environment variables;
- never be committed to source control;
- never be printed in startup logs.

`.env.example` must document required variables without real secret values.

---

## 12. Audit and Logging

Security-relevant events must follow the Audit Model.

Required or recommended security audit events:

- `LOGIN_SUCCEEDED`;
- `LOGIN_FAILED`;
- `LOGOUT`;
- `REFRESH_TOKEN_REUSE_DETECTED`;
- `ACCOUNT_LOCKED`;
- `ACCOUNT_UNLOCKED`;
- `SYSTEM_ADMIN_GRANTED`;
- `SYSTEM_ADMIN_REMOVED`;
- `REGISTER_ADMIN_ADDED`;
- `REGISTER_ADMIN_REMOVED`;
- `REGISTER_VIEWER_ADDED`;
- `REGISTER_VIEWER_REMOVED`;
- `PERMISSION_DENIED` where practical;
- `API_KEY_CREATED`;
- `API_KEY_REVOKED`.

Logs and audit records must not contain:

- plain passwords;
- password hashes;
- refresh tokens;
- refresh token hashes;
- access JWTs;
- API keys;
- API key hashes;
- cookie headers;
- full request bodies containing credentials.

Server logs may include stack traces server-side only. API responses must not return stack traces.

---

## 13. Data Protection Notes

The MVP stores business risk data, user identity data, audit evidence, and security metadata.

Implementation requirements:

- use TLS in production deployments;
- store timestamps in UTC;
- restrict audit logs through the Permission Model;
- exclude internal IDs, administrative metadata, and sensitive fields from Register Viewer exports unless explicitly allowed by later design;
- retain hard-deleted risk snapshots as defined by the Audit Model;
- avoid collecting unnecessary personal data.

Database encryption at rest, managed key rotation, and dedicated secrets management are deployment concerns outside the MVP application code unless a later deployment target requires them.

---

## 14. MVP Deferrals

The following security capabilities are out of scope for MVP:

- SAML authentication;
- Microsoft Entra ID integration;
- MFA;
- self-service password reset emails;
- SMTP credential encryption and notification delivery security;
- SCIM or directory synchronisation;
- user groups or teams;
- row-level security in PostgreSQL;
- advanced anomaly detection;
- tamper-evident audit hashing;
- formal secrets manager integration;
- configurable password policies;
- API key self-service UI.

These deferrals must be revisited before broader production or enterprise deployment.
