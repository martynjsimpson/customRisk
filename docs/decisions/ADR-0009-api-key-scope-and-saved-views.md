# ADR-0009 — API Key Scope Model and Saved View Data Model

**Status:** Accepted
**Date:** 2026-06-16
**Applies to:** Custom Risk — post-MVP Phase 13 (PM13-01 API key management) and Phase 11 (PM11-01 saved views), shipping in v1.9.0
**Related documents:** PM0-02 Data Model Extension Plan (Phase 11 and Phase 13 sections), PM0-04 Audit and Permission Extension Plan (§14, §15), `backend/prisma/schema.prisma`

---

## 1. Context

v1.9.0 expands scope to add three feature areas. Two of them carry cross-cutting architectural decisions that must be settled before backend implementation begins:

1. **PM13-01 — API key scope model.** The `api_key` table and SHA-256 hashing utilities (`backend/src/auth/tokens.ts`) already ship in the MVP schema. PM13-02 will build the admin UI to create/list/revoke keys. Before that, one design question is open (PM0-02 §Phase 13, PM0-04 §14.4): do API keys inherit the creating/owning user's permissions, or do they carry their own independent scope?

2. **PM11-01 — saved view data model.** A new `saved_view` table is required to persist a user's filter, sort, and column configuration. The shape of that table, and confirmation that it needs no new libraries, must be settled before PM11-02 (API + frontend) starts.

PM10-10 (audit log CSV export) is also in scope but requires no schema change and no architectural decision; it is addressed in the sign-off notes below, not in this ADR.

---

## 2. Decision

### 2.1 API keys inherit the owning user's permissions (no independent scope) for v1.9.0

An API key is authenticated as, and carries exactly the permissions of, the `user` referenced by `api_key.user_id`. There is no per-key scope, register restriction, or capability subset in v1.9.0. This matches the principle already recorded in PM0-04 §14.4 ("an authenticated API key session follows the same role model as a user session; the key carries the permissions of the user it is associated with").

API keys are **user-scoped, not system-scoped**: every key has a non-nullable `user_id` FK. Users manage their own keys via `/users/me/api-keys` (create, list, self-revoke); System Admins have read-only visibility across all keys and can revoke any key via `/admin/api-keys`. The key itself always acts as its owning user.

No `scope` column is added to `api_key` in v1.9.0. PM0-02 §Phase 13 anticipated an optional nullable `scope` column where `null` = "inherit user permissions"; we defer adding that column until scoped keys are an actual requirement. The current table already represents the "inherit" case implicitly (absence of a scope column = always inherit), so adding the column later is a clean additive migration with `null` as the backfill default. Adding it now would be speculative schema with no consuming code.

**Consequence for revocation:** because a key carries its owner's full permissions, revocation must be immediate and evaluated from current DB state on every request (`revoked_at IS NULL AND (expires_at IS NULL OR expires_at > now())`). Deactivating the owning user must also invalidate the key — the request middleware must check `user.is_active` as well as the key's own status.

### 2.2 No `api_key` migration is required for v1.9.0

The existing `api_key` model already contains every field PM13-02 needs:

| Requirement | Column | Status |
|---|---|---|
| Key prefix storage | `key_prefix` (`@unique`) | Present |
| Hash-only storage (no plaintext) | `key_hash` (`@unique`, SHA-256 hex) | Present — `tokens.ts` stores only the hash; plaintext is returned once at creation and never persisted |
| Expiry | `expires_at` (nullable) | Present |
| Revocation / status | `revoked_at` (nullable timestamp; null = active) | Present |
| Last used | `last_used_at` (nullable) | Present |
| User association | `user_id` (non-nullable FK, `onDelete: Cascade`) | Present |
| Creator attribution | `created_by_user_id` (nullable FK) | Present |
| Display name | `name` | Present |

No DDL change is needed. PM13-02 builds directly on the current table.

### 2.3 Saved View data model — personal views only

A new `saved_view` table is added. For v1.9.0 it is strictly **personal**: a saved view belongs to exactly one user and is only ever readable/writable by that user. Register-level sharing of views is deferred until Phase 5 field-level visibility exists, to avoid a view authored by an admin leaking column/filter state over fields a viewer should not see.

Approved schema:

```prisma
model SavedView {
  id         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId     String   @map("user_id") @db.Uuid
  registerId String?  @map("register_id") @db.Uuid
  name       String
  filterJson  Json?   @map("filter_json") @db.JsonB
  sortJson    Json?   @map("sort_json") @db.JsonB
  columnsJson Json?   @map("columns_json") @db.JsonB
  createdAt  DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt  DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)

  user     User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  register Register? @relation(fields: [registerId], references: [id], onDelete: Cascade)

  @@unique([userId, registerId, name])
  @@index([userId])
  @@index([registerId])
  @@map("saved_view")
}
```

Refinements made to the PM's proposed shape:

- **UUID PK via `gen_random_uuid()`** and **`Timestamptz(6)`** timestamps, per the architecture rules (all PKs UUID, all timestamps UTC). The PM's `id` was untyped.
- **`onDelete: Cascade` on both relations.** A personal view has no meaning once its owner or its register is gone, so cascade deletion is correct and avoids orphan rows. (`registerId` cascade only fires for register-scoped views; global views have `registerId = null` and are unaffected.)
- **`registerId` nullable** as proposed — supports both register-scoped views and global (cross-register) views.
- **JSON columns nullable** rather than required. A view may legitimately persist only a column set, or only a filter; requiring all three forces the caller to write empty objects. Application logic treats `null` as "not constrained".
- **`@@unique([userId, registerId, name])`** added so a user cannot create two views with the same name in the same scope. Postgres treats `null` register IDs as distinct in a unique index, which is acceptable here — global views are deduplicated per user by name at the application layer if stricter behaviour is wanted later.
- Back-relations (`savedViews`) must be added to `User` and `Register`.

No new npm library is required. `filterJson` / `sortJson` / `columnsJson` are stored as JSONB and shaped/validated by Zod in the service layer, reusing the exact pattern already used by `export_job.filter_json` and `register_config_version.snapshot_json`. The frontend serialises its existing mantine-datatable column/sort state and TanStack-Query filter state — no new dependency.

---

## 3. Decision Drivers

- **Inherit-scope keys are the pragmatic v1.9.0 choice.** Scoped keys (register-restricted, capability-subset) are a meaningful feature but require a permission-evaluation layer that intersects key scope with user permissions on every request. There is no consumer for that yet, and PM3 enterprise auth (which would shape how scopes are modelled) is out of scope. Shipping inherit-only now, with a clean additive path to a `scope` column later, avoids building unused machinery.
- **No speculative schema.** PM0-02 §3.2 and §3.3 caution against adding columns or enum values before a feature consumes them. Deferring the `api_key.scope` column honours that.
- **Personal-only saved views avoid a field-visibility leak.** Sharing a view that encodes a column set or filter over fields gated by Phase 5 visibility could expose the existence of hidden fields to a viewer. Keeping views personal until PM5 visibility lands is the safe sequencing, and is exactly the constraint the PM set for this release.
- **Reuse over novelty.** JSONB + Zod is the established pattern for serialised config in this codebase. No library evaluation was needed.

---

## 4. Consequences

- PM13-02 can build the API key routes with zero schema migration. Routes: `POST /users/me/api-keys`, `GET /users/me/api-keys`, `DELETE /users/me/api-keys/:id` (user self-service); `GET /admin/api-keys`, `DELETE /admin/api-keys/:id` (System Admin cross-user). The only new audit object/actions (`API_KEY`, `API_KEY_CREATED/REVOKED/USED`) are already enumerated in `AuditObjectType` (the `API_KEY` enum value is present in the schema) and PM0-04 §14.2.
- A future "scoped API keys" feature is an additive migration (nullable `scope` column, default `null` = inherit). This ADR does not block it; it defers it. A follow-up ADR should record the scope model when that work is scheduled.
- The `saved_view` table is purely additive (PM0-02 §Phase 11). Rollback is a single `DROP TABLE`. No backfill.
- When register-level view sharing is introduced (post-PM5), the `saved_view` table will need a sharing/visibility column and a re-evaluation of the unique constraint. That is a separate future decision, not in scope here.
- API key request middleware must verify, on every request: key hash match, `revoked_at IS NULL`, expiry not passed, **and** the owning `user.is_active = true`. A revoked key or deactivated owner must fail authentication immediately (evaluated from current DB state, never cached). **Known gap (PM13-03):** automated enforcement that a deactivated user's keys stop working is deferred to the PM13-03 API hardening pass. For v1.9.0, the offboarding case is covered by the admin revoke action.

---

## 5. Alternatives Considered

**A. Add a `scope` column to `api_key` now (JSONB or text), default null = inherit.**
Rejected for v1.9.0. PM0-02 anticipated this column but as an *optional* PM13-01 decision. With no scoped-key feature consuming it, the column would be dead schema. The migration to add it later is trivial and additive, so there is no cost to deferring.

**B. System-scoped (ownerless) API keys.**
Rejected. Every key would need a synthetic permission set with no user to attribute actions to, breaking audit actor attribution (`audit_event.actor_user_id`) and the existing role model. User-owned keys reuse the entire permission and audit stack unchanged.

**C. Make all three JSON columns on `saved_view` non-nullable.**
Rejected. Forces callers to persist empty objects for unused facets and conflates "no filter" with "empty filter". Nullable columns with application-layer defaulting are cleaner and match the `export_job.filter_json` precedent.

**D. Register-scoped (shareable) saved views in v1.9.0.**
Rejected for this release. Sharing a view risks leaking field-visibility-gated column/filter state before Phase 5 enforcement exists. Deferred until PM5 lands, per the release constraint.
