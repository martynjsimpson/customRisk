# Custom Risk Audit Model

**Version:** 1.1  
**Date:** 2026-05-09  
**Status:** Active  
**Applies to:** Current and future audit implementation  
**Related documents:** Technical Architecture v1.1, API Standards v1.0, Permission Model v1.1, Security Model v1.1, PM0-04 Audit and Permission Extension Plan

---

## 1. Purpose

This document defines the durable audit model for Custom Risk.

It is the source of truth for:

- audit principles and redaction rules;
- logical audit storage model;
- event construction rules;
- field-change handling;
- hard-delete snapshot expectations;
- audit access rules;
- backend audit-writing expectations;
- the current implemented audit action set.

It is not the canonical route inventory or physical schema definition.

---

## 2. Document Ownership Split

- Use this document for audit behavior, access rules, and implementation expectations.
- Use `backend/prisma/schema.prisma` as the canonical physical schema.
- Use `docs/postman/` for the currently implemented audit API endpoints and request examples.
- Use `docs/planning/PM0-04-audit-permission-extension.md` for post-MVP additions and future object types/actions.

---

## 3. Audit Principles

1. **Append-only by application behavior.**  
   Audit events, field-change rows, and deletion snapshots must not be edited or deleted through normal application routes.

2. **Structured before narrative.**  
   Human-readable summaries are useful, but key audit facts must be stored in structured columns or JSON.

3. **Same transaction where practical.**  
   Mutating business actions and their required audit evidence should commit together.

4. **Preserve context at time of event.**  
   Actor names, actor emails, object names, and display IDs should be captured at event time rather than resolved later.

5. **Audit reads are permissioned.**  
   Audit data can expose sensitive system and register information, so access must be enforced on the server.

6. **Never log secrets.**  
   Passwords, password hashes, refresh tokens, API keys, JWTs, cookies, and similar secrets must never appear in summaries, field changes, or metadata.

7. **Hard-deleted risks require snapshots.**  
   A hard delete must preserve a full last-known risk snapshot before the risk row is removed.

---

## 4. Logical Storage Model

The current audit model uses three logical stores:

1. `audit_event`
2. `audit_field_change`
3. `audit_risk_snapshot`

An optional export-tracking table may exist for operational reasons, but the
audit event remains the authoritative evidence that an export occurred.

### 4.1 `audit_event`

The primary event record. It stores:

- when the event occurred;
- who performed it, if known;
- what action happened;
- the affected object type and object ID;
- the event scope (`SYSTEM`, `REGISTER`, or `RISK`);
- optional register and risk context;
- a concise summary;
- optional structured metadata.

### 4.2 `audit_field_change`

Structured before/after evidence for events that changed one or more fields.

Use field-change rows when before/after state matters, for example:

- user profile or status changes;
- register settings changes;
- register permission changes where useful;
- custom field and scoring configuration changes;
- risk updates;
- review-related updates to stored risk fields.

### 4.3 `audit_risk_snapshot`

The full last-known snapshot for hard-deleted risks.

Every `RISK_DELETED` event must have exactly one related snapshot row.

---

## 5. Audit Scopes

### 5.1 `SYSTEM`

Use `SYSTEM` for system-wide events such as:

- authentication events;
- user creation and deactivation;
- System Admin role changes;
- account lockout and unlock events;
- system-level permission-denied events where captured.

### 5.2 `REGISTER`

Use `REGISTER` for events scoped to a register but not primarily to a single risk, such as:

- register settings changes;
- register permission changes;
- configuration changes;
- scoring configuration changes;
- register CSV exports.

### 5.3 `RISK`

Use `RISK` for events primarily about a specific risk, such as:

- risk creation and update;
- risk review completion;
- next review date updates;
- risk deletion.

For risk-scoped events, retain `display_risk_id` so the event remains useful
even after hard delete.

---

## 6. Object Types

The implementation uses Prisma `AuditObjectType` enum values. The important
current object families are:

- `AUTH`
- `USER`
- `REGISTER`
- `REGISTER_PERMISSION`
- `RISK`
- `RISK_REVIEW`
- `CUSTOM_FIELD`
- `CUSTOM_FIELD_OPTION`
- `LIKELIHOOD_VALUE`
- `IMPACT_VALUE`
- `RISK_LEVEL`
- `RISK_MATRIX`
- `EXPORT`

Future object types are defined through `PM0-04-audit-permission-extension.md`
as post-MVP phases add new audited domains.

---

## 7. Current Implemented Audit Actions

The current action constants are implemented in
`backend/src/audit/auditActions.ts`.

### 7.1 Authentication and Security

- `LOGIN_SUCCEEDED`
- `LOGIN_FAILED`
- `LOGOUT`
- `REFRESH_TOKEN_REUSE_DETECTED`
- `ACCOUNT_LOCKED`
- `ACCOUNT_UNLOCKED`

### 7.2 Users and Self-Service

- `USER_CREATED`
- `USER_UPDATED`
- `USER_ACTIVATED`
- `USER_DEACTIVATED`
- `SYSTEM_ADMIN_GRANTED`
- `SYSTEM_ADMIN_REMOVED`
- `PROFILE_UPDATED`
- `PASSWORD_CHANGED`
- `PREFERENCES_UPDATED`

### 7.3 Registers and Permissions

- `REGISTER_CREATED`
- `REGISTER_SETTINGS_UPDATED`
- `REGISTER_ADMIN_ADDED`
- `REGISTER_ADMIN_REMOVED`
- `REGISTER_VIEWER_ADDED`
- `REGISTER_VIEWER_REMOVED`

### 7.4 Register Configuration

- `CUSTOM_FIELD_CREATED`
- `CUSTOM_FIELD_UPDATED`
- `CUSTOM_FIELD_ACTIVATED`
- `CUSTOM_FIELD_DEACTIVATED`
- `CUSTOM_FIELD_OPTION_CREATED`
- `CUSTOM_FIELD_OPTION_UPDATED`
- `CUSTOM_FIELD_OPTION_DEACTIVATED`
- `LIKELIHOOD_VALUE_CREATED`
- `LIKELIHOOD_VALUE_UPDATED`
- `LIKELIHOOD_VALUE_DEACTIVATED`
- `IMPACT_VALUE_CREATED`
- `IMPACT_VALUE_UPDATED`
- `IMPACT_VALUE_DEACTIVATED`
- `RISK_LEVEL_CREATED`
- `RISK_LEVEL_UPDATED`
- `RISK_LEVEL_DEACTIVATED`
- `RISK_MATRIX_UPDATED`

### 7.5 Risks, Reviews, Exports, and Person References

- `RISK_CREATED`
- `RISK_UPDATED`
- `RISK_DELETED`
- `RISK_REVIEWED`
- `NEXT_REVIEW_DATE_UPDATED`
- `RISK_EXPORT_GENERATED`
- `PERSON_REFERENCE_CREATED`
- `PERSON_REFERENCE_LINKED`

Post-MVP additions should be defined in `PM0-04-audit-permission-extension.md`
and then added to the implementation and this document together.

---

## 8. Event Construction Rules

### 8.1 Actor Fields

For user-initiated events:

- `actor_user_id` must be populated where available;
- `actor_display_name` should copy the actor name at event time;
- `actor_email` should copy the actor email at event time.

For system-triggered events:

- `actor_user_id` may be null;
- `actor_display_name` may be `System` where useful;
- `actor_email` should be null.

For failed authentication where no matching user exists:

- `actor_user_id` is null;
- attempted identity details may appear in `metadata_json` if needed and if they do not create a security or privacy problem.

### 8.2 Object Fields

`object_type`, `object_id`, and `action` must always be populated.

`object_display_name` should be populated when a human-readable value exists,
for example:

- user name or email;
- register name;
- displayed Risk ID and title;
- custom field name.

### 8.3 Summary

`summary` should be concise and suitable for audit-list display.

It must not contain secrets, raw tokens, or oversized payloads.

### 8.4 Metadata JSON

Use `metadata_json` for structured context that is useful for filtering,
investigation, or detail views but does not deserve a first-class column.

Examples include:

- IP address where captured;
- user agent where useful;
- authentication method;
- export filters and row count.

Do not store full request bodies or secret values.

---

## 9. Field Change Rules

### 9.1 Field Names and Labels

`field_name` should be a stable machine-oriented identifier.

`field_label` should be the user-facing label at the time of change where that
improves readability.

### 9.2 Value Types

Use `AuditValueType` where practical, including:

- `TEXT`
- `NUMBER`
- `BOOLEAN`
- `DATE`
- `JSON`
- `USER`
- `UUID`

### 9.3 Redaction

Secret-bearing fields must never be recorded in plain form.

The current implementation explicitly treats names such as these as secrets:

- `password`
- `passwordHash`
- `token`
- `refreshToken`
- `jwt`
- `apiKey`
- `secret`
- `cookie`
- `authorization`

If a field is secret-related, record a redacted value or a safe summary instead.

---

## 10. Hard-Deleted Risk Snapshot

### 10.1 Required Flow

Hard delete must:

1. Load the full risk with related data.
2. Build the snapshot JSON.
3. Create the `RISK_DELETED` audit event.
4. Create the related `audit_risk_snapshot` row.
5. Delete the risk row.
6. Commit the transaction.

If any step fails, the transaction must roll back.

### 10.2 Required Snapshot Contents

The snapshot must remain useful after the original risk and related rows are gone.

At minimum it should preserve:

- core risk fields and displayed Risk ID;
- register context;
- owner identity context;
- scoring and response values;
- active and inactive custom field values;
- review history summary;
- system created/updated metadata;
- deletion actor, timestamp, and optional reason.

---

## 11. Audit Access Rules

Audit access follows the Permission Model.

### 11.1 System Audit

- System Admin only.

### 11.2 Register Audit

- System Admin or Register Admin for the register.

### 11.3 Risk Audit

- any actor with risk view access for the risk while it exists.

### 11.4 Audit Event Detail

Access is based on event scope:

- `SYSTEM`: System Admin only;
- `REGISTER`: System Admin or Register Admin for the event's register;
- `RISK`: users with risk-view access while the risk exists, otherwise System Admin or Register Admin for the event's register.

### 11.5 Deleted-Risk Snapshot

- System Admin;
- Register Admin for the snapshot's register.

Risk Owners and Register Viewers do not get deleted-risk snapshot access.

See the Postman collection for the current API paths that expose these views.

---

## 12. Filtering and Sorting Expectations

Audit list endpoints should support, where implemented:

- date range;
- actor;
- action;
- object type;
- register;
- risk ID or display Risk ID;
- client IP address where captured;
- pagination;
- sort by occurred date.

Recommended default sort:

```text
occurred_at desc
```

---

## 13. Backend Implementation Pattern

### 13.1 Centralized Writes

Audit writes should be centralized through shared audit helpers and services,
not hand-written ad hoc in each controller.

### 13.2 Transaction Support

Audit write helpers must support Prisma transaction clients so required audit
evidence commits with the business mutation.

### 13.3 Diffing

For updates:

- only record changed fields;
- prefer readable values where they improve investigation;
- include IDs for referenced records where helpful;
- avoid noisy unchanged derived values.

### 13.4 Failure Behavior

For required audit evidence, failure to write audit must fail the whole mutation.

Examples:

- if a risk update audit write fails, roll back the risk update;
- if a deletion snapshot write fails, do not delete the risk;
- if a register permission audit write fails, roll back the permission change.

For non-critical telemetry such as failed login auditing, the application may
still return the correct authentication response if the audit write fails, but
the server must log the failure.

---

## 14. Retention and Immutability

Current expectations:

- audit records are retained indefinitely unless a later documented retention policy is introduced;
- no normal application route may update or delete audit rows;
- operational database maintenance outside the application is a separate concern.

---

## 15. Current Deferrals

This document does not define future audit models for every post-MVP object.

Those extensions belong in:

- `docs/planning/PM0-04-audit-permission-extension.md`

Examples of deferred or later-phase areas include:

- child-record Risk Response Action audit history;
- configurable retention policies;
- tamper-evident hash chains or digital signatures;
- external SIEM forwarding;
- webhook audit delivery;
- deleted-object snapshots for additional object families.
