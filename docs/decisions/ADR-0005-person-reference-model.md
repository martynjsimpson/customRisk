# ADR-0005 — Person Reference Model: Normalised Table over Per-Column Email Fields

**Status:** Accepted  
**Date:** 2026-05-07  
**Applies to:** Custom Risk — post-MVP person identity expansion (PM2-01 to PM2-05) and all subsequent phases that assign persons to objects  
**Related documents:** PM0-02 Data Model Extension Plan (Phase 2 section), `docs/planning/phases/phase-02-person-identity.md` (PM2-01 notes)

---

## 1. Context

The MVP models person assignment with direct FK columns: `risk.owner_user_id` (non-nullable) and `risk_custom_field_value.person_user_id` (nullable). Both reference the `user` table and only support users who already have accounts.

Phase 2 requires the product to support:

- assigning a person by email address before they have created an account;
- automatically linking those email assignments to a user account when it is later created or when the user first logs in (PM2-03);
- SAML JIT-provisioned users linking to existing email assignments (PM3-04);
- a person picker that can search and display both resolved and unresolved persons;
- Risk Response Action owners in Phase 7 (PM7-04), which will need the same person assignment capability.

Two approaches to extending the schema were considered.

---

## 2. Decision

Use a **normalised `PersonReference` table** as the canonical person representation. All new person-bearing FK columns in Phase 2 and later phases reference `PersonReference`, not `User` directly.

**New table:**

```prisma
model PersonReference {
  id          String    @id @default(uuid())
  email       String    @unique   // normalised to lowercase, always present
  userId      String?             // null until a matching User account exists
  user        User?     @relation(fields: [userId], references: [id])
  displayName String?             // display name for unresolved entries; user.name takes precedence when resolved
  resolvedAt  DateTime?           // timestamp when userId was first populated
  createdAt   DateTime  @default(now())
}
```

**Changes to existing tables:**

`risk`: add `ownerPersonId String?` — nullable FK to `PersonReference`. The existing `ownerUserId` column is **retained unchanged**. New Phase 2+ assignments write `ownerPersonId`; existing MVP risks keep `ownerUserId` as their authoritative field.

`risk_custom_field_value`: add `personId String?` — nullable FK to `PersonReference`. The existing `personUserId` and `personEmail` columns are retained and deprecated in place (§3.4 of PM0-02: never drop superseded columns in an extension migration).

**Service layer display rule:** when rendering a person field value, prefer the `PersonReference` path (`ownerPersonId` / `personId`) if set; fall back to direct `User` lookup via `ownerUserId` / `personUserId` for MVP-era records. After the Phase 2 backfill this fallback is a safety net only.

**Phase 2 backfill:** for every distinct user referenced in `risk.ownerUserId`, create (or upsert by email) a `PersonReference` row with `userId` and `email` set, then write `risk.ownerPersonId` to point at it. Repeat for `risk_custom_field_value.personUserId`. The product is single-tenant with low record counts; this runs as a single-pass script without batching.

**Pattern reuse in later phases:**

| Phase | Object | New FK |
|---|---|---|
| 7 | `RiskResponseAction` | `ownerPersonId → PersonReference` |
| 3 | SAML JIT user | Set `PersonReference.userId` on login |
| 2 | Unresolved email | Create `PersonReference` with `userId = null` |
| 2 | Auto-link on account creation | Set `PersonReference.userId` where email matches |

---

## 3. Decision Drivers

- **Linking logic is a single operation.** When a user creates an account or first logs in, setting `PersonReference.userId` where `email` matches resolves all references across every table in one UPDATE. The per-column approach requires updating `risk.owner_email`, `risk_custom_field_value.person_email`, and (in Phase 7) `risk_response_action.owner_email` independently, in separate queries, every time.
- **SAML JIT provisioning is straightforward.** PM3-04 (SAML user linking) maps an incoming SAML identity to existing person references by email. With a normalised table this is one query; with per-column fields it is a multi-table UPDATE with no central index on email.
- **Phase 7 reuses the same pattern at no extra cost.** Risk Response Action owners (PM7-04) simply add `ownerPersonId → PersonReference` to the action table. No new dual-field logic is needed. With per-column, Phase 7 would add another `owner_email` / `owner_user_id` pair to yet another table.
- **Display and search have a single source of truth.** "Find all places this person appears" is a single indexed FK scan on `PersonReference.id`. With per-column fields it is a UNION across every person-bearing table.
- **Unresolved email uniqueness is enforced at the database level.** The `@unique` constraint on `PersonReference.email` prevents duplicate unresolved entries for the same address. Per-column email fields have no equivalent constraint across tables.
- **Minimal blast radius on existing MVP code.** The new FK columns are additive and nullable. Existing queries on `ownerUserId` and `personUserId` are unchanged. The service layer adds the new path alongside the old, not as a replacement.

---

## 4. Alternatives Considered

### 4.1 Per-column email fields (additive approach)

Add `risk.owner_email` (nullable String) for unresolved Risk Owners. Rely on the existing `risk_custom_field_value.person_email` (already in the schema, currently null) for person picker unresolved values.

**Rejected** because:

- **Linking requires multi-table updates.** PM2-03 auto-linking and PM3-04 SAML linking must each find and update email references across every table that holds a person. As the schema grows (Phase 7, Phase 12 evidence, etc.) this query set grows indefinitely with no central coordination point.
- **No cross-table uniqueness.** The same unresolved email can appear as `risk.owner_email` in one risk and `risk_custom_field_value.person_email` in another with no shared row to update atomically.
- **Pattern does not scale to later phases.** Phase 7 adds action owners; Phase 9 adds notification recipients; Phase 3 adds SAML identity linking. Each new person-bearing table would need its own `_email` / `_user_id` pair and its own linking logic. The normalised model pays for itself by Phase 3.
- **Display logic is harder.** A "who is this person?" lookup for display purposes requires resolving through different column paths depending on which table the value came from.

---

## 5. Consequences

- `PersonReference` must be created and backfilled before any Phase 2 application logic goes live. The backfill script must be idempotent (upsert by email) and must log rows processed. See PM0-02 §7 for backfill script guidelines.
- `PersonReference.email` is the normalisation key. The application must normalise email addresses to lowercase before inserting or querying `PersonReference`, and must do so consistently across all call sites (person picker input, SAML assertion parsing, account creation hook).
- The `@unique` constraint on `PersonReference.email` means a `CONFLICT` error will occur if two code paths attempt to create a `PersonReference` for the same email concurrently. The service layer must use an upsert (insert-or-ignore / `ON CONFLICT DO NOTHING`) rather than a plain insert.
- Phase 3 (PM3-04) must call the same person-reference resolution service used in PM2-03 when a SAML user is provisioned, rather than implementing its own linking logic.
- Phase 7 (PM7-01) must add `ownerPersonId → PersonReference` to the `RiskResponseAction` table rather than a bare `ownerUserId` or `ownerEmail` column. This is the canonical pattern from this point forward for all person-bearing fields.
- The deprecated `ownerUserId` on `risk` and `personUserId` / `personEmail` on `risk_custom_field_value` must not be removed until a dedicated cleanup migration confirms all rows have been backfilled and the fallback code path is no longer needed.
