# ADR-0003 — User Preferences Storage

**Status:** Accepted  
**Date:** 2026-05-05  
**Applies to:** Custom Risk — post-MVP user profile and preferences (PM1-01 to PM1-04)  
**Related documents:** Post-MVP Implementation Backlog (PM1-01 to PM1-04), Data Model v1.3, PRD v3.2 section 19.1

---

## 1. Context

Adding user profile and Dark Mode support (PM1-01 to PM1-04) requires a decision on where to persist user display preferences such as colour scheme (light/dark).

Two options were considered:

1. **`localStorage`** — store preferences client-side in the browser, per device.
2. **JSONB column on `user`** — store preferences server-side, per user account.

A third candidate, a separate `user_preferences` key-value table, was considered but ruled out as premature normalisation for the foreseeable preference surface area.

Additionally, a related question arose about table column layouts. These were considered alongside Dark Mode to inform the same decision.

---

## 2. Decision

Store user preferences in a `preferences` JSONB column on the `user` table.

Use `{}` as the default. Treat a null or missing value as an empty object.

Expose preferences via dedicated endpoints:

- `GET /api/v1/users/me/preferences`
- `PATCH /api/v1/users/me/preferences` — merges supplied keys, preserves existing keys

The initial stored shape is:

```json
{ "colorScheme": "light" | "dark" }
```

**Table column layouts are explicitly excluded from server-side preferences at this stage.** They are per-register in nature and complex enough to warrant their own design when needed. Use `localStorage` for column layout state if and when it is implemented.

---

## 3. Decision Drivers

- **Dark Mode should follow the user across devices.** A user who switches to dark mode on their laptop expects the same setting on another machine. `localStorage` cannot satisfy this without a sync mechanism.
- **Timezone and date format preferences are a known future need.** The PRD (section 14) specifies that timestamps are "stored in UTC and displayed according to user/system settings." When this is implemented, the preference must be server-side. Establishing the pattern now avoids a later migration from `localStorage`.
- **JSONB is low cost and future-proof.** Adding new preference keys requires no schema migration. The column grows with the product at zero structural cost.
- **Preferences are not governed data.** They do not require audit logging, field-level change tracking, or the structured change model applied to risk and configuration data. A simple JSONB column is appropriate.
- **A separate preferences table is premature.** There is no current requirement for per-register or per-object preference scoping. A flat JSONB column on `user` covers all foreseeable cases without the overhead of an extra table and join.

---

## 4. Alternatives Considered

### 4.1 `localStorage` only

**Rejected** for cross-device preferences. Acceptable for session-level state (sort order, filter state) and power-user layout preferences that tolerate per-device reset, but not appropriate for appearance preferences that users expect to persist universally.

### 4.2 Separate `user_preferences` table (key-value or structured)

**Rejected as premature.** A key-value table adds join complexity and a dedicated migration for each new preference key. A structured table adds upfront schema design for a preference space that is not yet well defined. JSONB on `user` achieves the same goals with less overhead until the preference surface area justifies its own table.

---

## 5. Consequences

- A Prisma migration must add `preferences Json? @default("{}")` (or equivalent) to the `User` model as part of PM1-03.
- The preferences PATCH endpoint must merge at the key level, not replace the entire object, to prevent one client overwriting preferences set by another.
- Secrets and sensitive values must not be stored in the preferences column. It is not treated as governed data and is not audited.
- Table column layout preferences, if implemented, should use `localStorage` keyed by `registerId` and are explicitly out of scope for this decision.
