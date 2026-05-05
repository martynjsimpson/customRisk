# ADR-0001 — Technical Stack

**Status:** Accepted  
**Date:** 2026-05-04  
**Applies to:** Custom Risk MVP  
**Related architecture:** `Technical_Architecture.md`  
**Related documents:** PRD v3.2, MVP Scope v1.2, MVP Functional Specification v1.2, MVP Data Model v1.2

---

## 1. Context

Custom Risk MVP requires a pragmatic, self-hostable technical stack for a risk register application with:

- A browser-based user interface
- A structured REST API
- Strong relational data integrity
- Configurable risk registers
- Role-based permissions
- Audit logging
- Secure local authentication
- A deployment model suitable for local development and small self-hosted production environments

The functional and data specifications remain technology-neutral. This ADR records the first accepted technical stack decision for MVP implementation.

---

## 2. Decision

Use the following MVP technical stack:

| Area | Decision |
|---|---|
| Runtime | Node.js 20 LTS |
| Language | TypeScript in strict mode |
| Backend framework | Express 4.x |
| Frontend framework | React 18 |
| Frontend build tool | Vite |
| Frontend routing | React Router v6 |
| Server state | TanStack Query v5 |
| Component library | Mantine v7 |
| Data tables | Mantine DataTable |
| Form handling | Mantine Form |
| Date handling | Day.js |
| HTTP client | Axios |
| Database | PostgreSQL 16 |
| ORM | Prisma 5.x |
| Containerisation | Docker and Docker Compose |
| Authentication | Application-managed local authentication |
| Password hashing | `bcryptjs`, cost factor 12 |
| Browser session model | Short-lived JWT access token plus rotating refresh token |
| External integrations | Deferred to post-MVP |
| Logging | Pino |
| Validation | Zod |
| Rate limiting | `express-rate-limit` |

---

## 3. Decision Drivers

The stack was selected to support the following goals:

- Fast MVP delivery
- Clear implementation patterns
- Strong type safety across frontend and backend
- Low operational complexity
- Good compatibility with containerised self-hosted deployment
- Strong relational data modelling
- Explicit audit and permission behaviour
- Easy future extension toward SAML, background jobs, observability, and integration/API-key management

---

## 4. Rationale by Area

### 4.1 Node.js 20 LTS and TypeScript

Node.js 20 LTS provides a stable runtime with long-term support suitable for the MVP lifecycle.

TypeScript across both frontend and backend reduces runtime errors, improves IDE support, and allows shared type definitions between frontend and backend where practical.

Using strict mode makes type mismatches and nullable edge cases more visible during development.

### 4.2 Express 4.x

Express was selected because it is minimal, mature, and widely understood.

The application requires a structured REST API rather than a highly opinionated full-stack framework. Express keeps routing, middleware, authentication, permissions, audit logging, and error handling explicit.

This is important because the product has detailed permission and audit requirements that should remain visible in the codebase rather than hidden behind framework conventions.

### 4.3 Zod for Request Validation

Zod supports schema-first validation and allows TypeScript types to be inferred from validation schemas.

This reduces duplication between runtime validation rules and compile-time types.

Zod is especially useful for API request bodies, query parameters, and form validation rules that should align between frontend and backend.

### 4.4 Prisma 5.x

Prisma was selected for:

- Type-safe database access
- Schema-as-code
- Migration management
- Good developer ergonomics
- Clear mapping between application models and PostgreSQL tables

The Prisma schema acts as the canonical implementation of the MVP data model.

### 4.5 React 18 and Vite

React 18 provides a mature frontend foundation with a broad ecosystem and strong hiring/developer familiarity.

Vite provides a fast local development experience and optimised production builds with minimal configuration overhead.

### 4.6 TanStack Query v5

TanStack Query was selected because the frontend is API-driven and will repeatedly need to handle:

- Loading states
- Error states
- Server-side data refresh
- Cache invalidation
- Background refresh
- Mutations
- Pagination and filtering behaviour

Using TanStack Query avoids building custom request lifecycle and caching logic.

### 4.7 Mantine v7 and Mantine DataTable

Mantine was selected because it provides production-quality components needed by the MVP, including:

- Forms
- Modals
- Notifications
- Date components
- Layout primitives
- Accessible UI building blocks

Mantine DataTable fits the core risk register use case, where tables require sorting, filtering, pagination, and readable presentation of register entries.

### 4.8 Day.js

Day.js was selected as a lightweight date handling library.

It supports the MVP's needs for display formatting, relative dates, and review-date calculations. It also aligns with Mantine's date package.

### 4.9 Axios

Axios was selected because it provides simple and explicit request and response interceptors.

The application needs:

- A configured API base URL
- Automatic access token attachment
- Centralised 401 handling
- Token refresh behaviour

Axios provides these without adding significant complexity.

### 4.10 PostgreSQL 16

PostgreSQL was selected because the data model requires:

- Relational integrity
- Transactions
- Indexes
- Constraints
- JSON support for audit metadata and snapshots
- Long-term operational reliability

PostgreSQL's native JSON support is useful for fields such as `metadata_json` and `snapshot_json`, while still preserving a relational core model.

### 4.11 Docker and Docker Compose

Docker and Docker Compose were selected to provide a repeatable local and self-hosted deployment model.

A two-container MVP deployment is sufficient:

- App container
- Database container

The app container serves the React build from Express, avoiding the need for a separate nginx container in MVP.

Multi-stage builds keep the runtime image smaller by excluding build tooling.

### 4.12 Application-Managed Local Authentication

Application-managed local authentication was selected for MVP.

This keeps the deployment simple and avoids adding a second stateful identity service.

OpenLDAP was not selected for MVP because it would:

- Add operational complexity
- Introduce another stateful service
- Duplicate user state between LDAP and PostgreSQL
- Complicate future SAML integration
- Provide limited benefit for the MVP's local authentication requirement

Password hashing at the application layer with bcrypt gives appropriate security for the MVP without the overhead of LDAP.

### 4.13 bcrypt Cost Factor 12

bcrypt with cost factor 12 was selected as the MVP password hashing standard.

It is widely used, well understood, and suitable for a web application of this scale.

The cost factor is configurable through environment variables so it can be adjusted later if performance or security requirements change.

### 4.14 JWT Access Token and Rotating Refresh Token

The selected browser session model is:

- Short-lived JWT access token
- Access token stored in frontend memory only
- Opaque refresh token stored in an HttpOnly, Secure, SameSite=Strict cookie
- Refresh token stored hashed in the database
- Refresh token rotation on every use

This balances API usability, browser session behaviour, and operational simplicity.

JWT access tokens allow stateless API authorisation during their validity period.

Rotating refresh tokens allow the browser app to behave like a normal session-based web application while limiting exposure of long-lived credentials.

### 4.15 Memory-Only Access Tokens

Access tokens are stored in memory only rather than localStorage.

This reduces exposure to token theft through XSS because localStorage is accessible to JavaScript.

The tradeoff is that access tokens are lost on page refresh. The refresh token cookie addresses this by allowing the frontend to call `POST /api/v1/auth/refresh` on page load.

### 4.16 User Deactivation Tradeoff

When a user is deactivated, all of their refresh tokens are deleted immediately.

Existing access tokens may remain valid until expiry. For MVP, the accepted access token expiry is 60 minutes.

This is an accepted tradeoff for stateless access tokens.

If a shorter deactivation window is needed later, the access token expiry can be reduced, for example to 15 minutes, at the cost of more frequent refresh calls.

### 4.17 External Integrations

External integration authentication, including API keys, is deferred to post-MVP.

The MVP stack should not implement API-key authentication, API-key management routes, or manual API-key creation helpers. PM13 in the post-MVP backlog will define the API-key persistence, scope, revocation, and audit model.

### 4.18 REST and Path-Based API Versioning

REST was selected because the MVP's domain maps naturally to resources such as:

- Registers
- Risks
- Reviews
- Users
- Configuration entities
- Audit events

Path-based versioning with `/api/v1/` provides a simple mechanism for future breaking changes.

### 4.19 Offset Pagination for MVP

Offset pagination was selected for MVP because it is straightforward to implement and sufficient for expected MVP data volumes.

Cursor pagination may be considered later if list sizes or performance requirements increase.

### 4.20 Monorepo

A monorepo was selected because the frontend and backend are tightly coupled during MVP delivery.

The monorepo allows:

- Shared types where useful
- Simpler local development
- Single Docker build context
- Easier coordination between API and UI changes

The frontend and backend remain separate packages to keep boundaries clear.

---

## 5. Alternatives Considered

### 5.1 OpenLDAP for Local Authentication

OpenLDAP was considered and rejected for MVP.

Reasons:

- Adds a second stateful service
- Increases deployment and backup complexity
- Requires user state synchronisation
- Complicates future SAML integration
- Does not materially improve MVP security compared with application-layer bcrypt password hashing

### 5.2 Separate Web Server for Static Frontend Assets

A separate nginx container was considered and deferred.

Reasons:

- Express can serve the static React build adequately for MVP
- A separate web server adds more configuration and deployment complexity
- Docker Compose remains simpler with app and database only

A reverse proxy or separate static web server can be revisited for larger production deployments.

### 5.3 Redis or Server-Side Session Store

Redis or a server-side session store was considered and deferred.

Reasons:

- Adds another infrastructure component
- MVP can meet its session requirements with JWT access tokens and rotating refresh tokens
- Refresh token state is already stored in PostgreSQL
- Stateless access tokens keep API request handling simple

### 5.4 Cursor Pagination

Cursor pagination was considered and deferred.

Reasons:

- Offset pagination is simpler
- MVP data volumes are expected to be manageable
- Offset pagination is easier to expose to users for numbered pages

Cursor pagination may be revisited if performance or data volume requires it.

### 5.5 SAML / Microsoft Entra ID

SAML 2.0 integration was identified as a future requirement but deferred from MVP.

The local authentication architecture should not prevent future external identity provider integration.

---

## 6. Consequences

### 6.1 Positive Consequences

- Clear and familiar full-stack TypeScript implementation model
- Low infrastructure footprint for MVP
- Strong relational database foundation
- Good developer productivity
- Good fit for AI-assisted implementation because patterns are explicit and conventional
- Security-sensitive areas are implemented explicitly
- Future SAML integration remains possible
- Future operational enhancements such as Redis, observability, and background jobs remain possible

### 6.2 Tradeoffs and Limitations

- Express requires more explicit structure than opinionated frameworks.
- Serving static files from Express is acceptable for MVP but may not be ideal for larger production deployments.
- Stateless JWT access tokens mean deactivation is not instantaneous for already-issued access tokens.
- Offset pagination may need replacing if data volumes grow significantly.
- External integration authentication, including API keys, is deferred to post-MVP PM13.

---

## 7. Follow-Up Actions

The following implementation documents should be produced using this ADR and the technical architecture as inputs:

1. API Route Map
2. Prisma Schema
3. Implementation Backlog

---

## 8. Supersession

This ADR is superseded only by a later accepted ADR that explicitly changes one or more technical stack decisions.

Any change to the definitive architecture must reference the ADR that authorised the change.
