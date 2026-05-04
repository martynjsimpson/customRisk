# Custom Risk — MVP Audit Model

**Version:** 1.0  
**Date:** 2026-05-04  
**Status:** Draft  
**Applies to:** MVP delivery  
**Related documents:** PRD v3.2, MVP Scope v1.2, MVP Functional Specification v1.2, MVP Data Model v1.2, Technical Architecture v1.0, API Route Map v1.0, Permission Model v1.0

---

## 1. Purpose

This document defines the audit model for the Custom Risk MVP.

It is the implementation reference for audit event structure, audit scopes, event naming, field-change rows, hard-delete snapshots, audit access, and service-layer audit behaviour.

Audit logging is a first-class MVP capability. The implementation must use structured append-only audit records. A single flat text log is not sufficient because the product must support system, register, and risk audit views with field-level changes, permission evidence, review evidence, security events, export evidence, and hard-delete snapshots.

---

## 2. Audit Principles

1. **Append-only by application behaviour.**  
   Audit events, field-change rows, and deletion snapshots must not be edited or deleted through the application UI or normal service routes.

2. **Structured before narrative.**  
   Human-readable summaries are useful, but key audit facts must be stored in structured columns or JSON fields.

3. **Same transaction where practical.**  
   Mutating business actions and their audit events should be written in the same database transaction.

4. **Preserve context at time of event.**  
   Actor names, actor emails, object display names, display Risk IDs, field labels, and snapshots should preserve useful context even if related records later change.

5. **Audit reads are permissioned.**  
   Audit logs can reveal sensitive system and register information, so audit routes must enforce the Permission Model.

6. **Hard-deleted risks require snapshots.**  
   A System Admin hard delete must preserve a full last-known risk snapshot before the risk row is removed.

7. **Never log secrets.**  
   Plain passwords, refresh tokens, API keys, password hashes, token hashes, and similarly sensitive values must never appear in audit summaries, field changes, or metadata JSON.

---

## 3. Audit Storage Model

The MVP audit model uses three tables:

1. `audit_event`
2. `audit_field_change`
3. `audit_risk_snapshot`

The optional `export_job` table may record export job metadata, but the audit event remains the authoritative evidence that an export occurred.

## 3.1 `audit_event`

`audit_event` stores the primary event.

Required implementation fields:

| Field | Purpose |
|---|---|
| `id` | Internal audit event UUID. |
| `occurred_at` | Business event timestamp in UTC. |
| `actor_user_id` | User who performed the action, null for system or unknown actors. |
| `actor_display_name` | Actor display name at time of event. |
| `actor_email` | Actor email at time of event. |
| `action` | Stable audit action string, such as `RISK_CREATED`. |
| `object_type` | Enum describing the affected object type. |
| `object_id` | ID or stable identifier of the affected object. |
| `object_display_name` | Human-readable affected object name at time of event. |
| `scope_type` | `SYSTEM`, `REGISTER`, or `RISK`. |
| `register_id` | Register context, where applicable. |
| `risk_id` | Risk context while the risk exists. |
| `display_risk_id` | Denormalised displayed Risk ID. Required for risk events. |
| `summary` | Concise human-readable summary. |
| `metadata_json` | Structured context not represented by first-class columns. |
| `created_at` | Row creation timestamp. |

`occurred_at` and `created_at` will usually be the same, but `occurred_at` is the meaningful business timestamp.

## 3.2 `audit_field_change`

`audit_field_change` stores field-level before/after evidence for events that change one or more fields.

Use field-change rows for:

- user profile/status changes;
- System Admin role changes;
- register setting changes;
- register permission changes where useful;
- custom field configuration changes;
- scoring configuration changes;
- risk field changes;
- risk owner changes;
- risk state changes;
- review-related updates to latest-review fields;
- other structured changes where before/after evidence matters.

Do not create field-change rows for:

- failed login attempts unless useful metadata is available;
- successful login/logout;
- exports;
- read-only events;
- values that would expose secrets.

Field values are stored as JSON so values can be typed consistently. User references should include enough display context to remain useful later.

Example `previous_value` for a user field:

```json
{
  "id": "uuid",
  "name": "Alice Register Admin",
  "email": "alice@example.com"
}
```

## 3.3 `audit_risk_snapshot`

`audit_risk_snapshot` stores the full last-known risk snapshot for hard-deleted risks.

Every `RISK_DELETED` event must have exactly one related snapshot.

The snapshot must be written before deleting the risk row. If child rows such as custom field values or reviews are cascade-deleted, their required summary must already be included in `snapshot_json`.

---

## 4. Audit Scopes

## 4.1 `SYSTEM`

Use `SYSTEM` for events whose primary meaning is system-wide.

Examples:

- authentication events;
- user creation and deactivation;
- System Admin role changes;
- account lockout events;
- register creation;
- system-level permission denied events.

`register_id` and `risk_id` are usually null for system events. Register creation may use `SYSTEM` scope because only System Admins can create registers in MVP, while still recording the created register as the object.

## 4.2 `REGISTER`

Use `REGISTER` for events scoped to a register but not primarily to a single risk.

Examples:

- register setting changes;
- register permission changes;
- custom field configuration changes;
- dropdown option changes;
- likelihood value changes;
- impact value changes;
- risk level changes;
- matrix changes;
- response strategy changes;
- register CSV export.

`register_id` must be populated for register-scoped events.

## 4.3 `RISK`

Use `RISK` for events primarily about a specific risk.

Examples:

- risk creation;
- risk field changes;
- risk owner changes;
- risk score/level recalculation;
- risk review completion;
- next review date updates;
- risk hard deletion.

`register_id` and `display_risk_id` must be populated for risk-scoped events. `risk_id` should be populated while the risk exists. For hard-deleted risks, keep `display_risk_id` and the snapshot even after the `risk_id` relation becomes null or inaccessible.

---

## 5. Object Types

Use the Prisma `AuditObjectType` enum values:

| Object type | Use for |
|---|---|
| `USER` | User creation, update, activation, deactivation, lockout, System Admin role changes. |
| `REGISTER` | Register creation and settings updates. |
| `REGISTER_PERMISSION` | Register Admin and Register Viewer assignment changes. |
| `RISK` | Risk creation, update, recalculation, ownership changes, deletion. |
| `RISK_REVIEW` | Review completion and review history evidence. |
| `CUSTOM_FIELD` | Custom field definition changes. |
| `CUSTOM_FIELD_OPTION` | Dropdown option changes. |
| `LIKELIHOOD_VALUE` | Likelihood configuration changes. |
| `IMPACT_VALUE` | Impact configuration changes. |
| `RISK_LEVEL` | Risk level configuration changes. |
| `RISK_MATRIX` | Risk matrix cell changes. |
| `RESPONSE_STRATEGY` | Response strategy configuration changes. |
| `EXPORT` | CSV export events. |
| `AUTH` | Login, refresh token, logout, lockout, API key authentication events. |
| `API_KEY` | API key creation, revocation, or usage where applicable. |

---

## 6. Required Audit Actions

The following action names are the MVP standard. Use exact uppercase snake-case strings.

## 6.1 Authentication and Security

- `LOGIN_SUCCEEDED`
- `LOGIN_FAILED`
- `LOGOUT`
- `REFRESH_TOKEN_ROTATED`
- `REFRESH_TOKEN_REUSE_DETECTED`
- `ACCOUNT_LOCKED`
- `ACCOUNT_UNLOCKED`
- `PERMISSION_DENIED`
- `API_KEY_CREATED`
- `API_KEY_REVOKED`
- `API_KEY_USED`

For MVP, logging every successful refresh or API key use may be noisy. `REFRESH_TOKEN_REUSE_DETECTED`, lockout events, API key creation/revocation, and security-relevant failures are more important than high-volume successful events.

## 6.2 Users and System Roles

- `USER_CREATED`
- `USER_UPDATED`
- `USER_ACTIVATED`
- `USER_DEACTIVATED`
- `SYSTEM_ADMIN_GRANTED`
- `SYSTEM_ADMIN_REMOVED`

## 6.3 Registers and Permissions

- `REGISTER_CREATED`
- `REGISTER_SETTINGS_UPDATED`
- `REGISTER_ADMIN_ADDED`
- `REGISTER_ADMIN_REMOVED`
- `REGISTER_VIEWER_ADDED`
- `REGISTER_VIEWER_REMOVED`

## 6.4 Register Configuration

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
- `RESPONSE_STRATEGY_CREATED`
- `RESPONSE_STRATEGY_UPDATED`
- `RESPONSE_STRATEGY_DEACTIVATED`

## 6.5 Risks, Reviews, and Export

- `RISK_CREATED`
- `RISK_UPDATED`
- `RISK_FIELD_CHANGED`
- `RISK_OWNER_CHANGED`
- `RISK_STATE_CHANGED`
- `RISK_SCORE_RECALCULATED`
- `RISK_REVIEWED`
- `NEXT_REVIEW_DATE_UPDATED`
- `RISK_DELETED`
- `RISK_EXPORT_GENERATED`

Use `RISK_UPDATED` for broad update summaries where multiple fields changed. Use `RISK_FIELD_CHANGED` only when the implementation chooses one event per changed field. The preferred MVP approach is one `RISK_UPDATED` event with multiple `audit_field_change` rows.

---

## 7. Event Construction Rules

## 7.1 Actor Fields

For user-initiated events:

- `actor_user_id` must be populated;
- `actor_display_name` must copy the user's name at event time;
- `actor_email` must copy the user's email at event time.

For system events:

- `actor_user_id` may be null;
- `actor_display_name` should be `System` where useful;
- `actor_email` should be null.

For failed login where no matching user exists:

- `actor_user_id` is null;
- `actor_email` may store the attempted email in `metadata_json`, normalised and rate-limited as appropriate.

## 7.2 Object Fields

`object_type`, `object_id`, and `action` must always be populated.

`object_display_name` should be populated when a human-readable value exists:

- user name or email;
- register name;
- displayed Risk ID and title;
- custom field name;
- permission target user and role;
- export file/register name.

## 7.3 Summary

`summary` should be concise and suitable for display in an audit list.

Examples:

- `Alice Register Admin created risk SEC-0001.`
- `Bob Risk Owner reviewed risk SEC-0001.`
- `System Admin granted Register Admin access to Alice for Information Security.`
- `System Admin hard-deleted risk SEC-0001.`

Summaries must not include secrets or large JSON payloads.

## 7.4 Metadata JSON

Use `metadata_json` for structured context that is useful for filtering, investigation, or event detail but does not deserve a first-class column.

Examples:

```json
{
  "ipAddress": "203.0.113.10",
  "userAgent": "Mozilla/5.0",
  "authMethod": "jwt"
}
```

```json
{
  "export": {
    "filters": {
      "state": "OPEN",
      "includeClosed": false
    },
    "rowCount": 42,
    "format": "csv"
  }
}
```

Do not store plain tokens, API keys, password values, password hashes, refresh token hashes, or full request bodies.

---

## 8. Field Change Rules

## 8.1 Field Names and Labels

`field_name` should be a stable machine-oriented identifier.

Examples:

- `name`
- `isSystemAdmin`
- `riskIdPrefix`
- `ownerUserId`
- `likelihoodValueId`
- `customField.<customFieldId>`

`field_label` should be the user-facing label at the time of the change.

Examples:

- `Name`
- `System Admin`
- `Risk ID Prefix`
- `Risk Owner`
- `Likelihood`
- `Supplier Criticality`

## 8.2 Value Types

Use `AuditValueType` where practical:

| Value type | Use for |
|---|---|
| `TEXT` | Strings and labels. |
| `NUMBER` | Numeric values and scores. |
| `BOOLEAN` | True/false settings. |
| `DATE` | Dates and timestamps. |
| `JSON` | Structured objects or arrays. |
| `USER` | User references. |
| `UUID` | Raw identifiers where no richer representation is available. |

## 8.3 Redaction

The following fields must never be recorded in plain form:

- passwords;
- password hashes;
- refresh tokens;
- refresh token hashes;
- API keys;
- API key hashes;
- session cookies;
- JWTs;
- MFA secrets if added later.

For secret-related changes, record a safe summary instead.

Example:

```json
{
  "fieldName": "password",
  "fieldLabel": "Password",
  "previousValue": null,
  "newValue": {
    "changed": true
  },
  "valueType": "JSON"
}
```

---

## 9. Hard-Deleted Risk Snapshot

## 9.1 Required Flow

Risk hard delete is System Admin only.

The delete service must:

1. Load the full risk with related data.
2. Build the snapshot JSON.
3. Create the `RISK_DELETED` audit event.
4. Create the related `audit_risk_snapshot` row.
5. Delete the risk row.
6. Commit the transaction.

If any step fails, the transaction must roll back and the risk must remain.

## 9.2 Required Snapshot Contents

`snapshot_json` must include, at minimum:

- internal risk ID;
- register ID and register name;
- displayed Risk ID;
- risk sequence;
- title;
- description;
- state;
- owner ID, name, and email;
- created date;
- likelihood ID, name, numeric value, and display order;
- impact ID, name, numeric value, and display order;
- risk score;
- risk level ID, name, and display order;
- response strategy ID, name, and display order;
- response action;
- last reviewed timestamp;
- last reviewed by user ID, name, and email;
- next review date;
- system created at/by;
- system updated at/by;
- active and inactive custom field values;
- review history summary;
- deletion actor ID, name, and email;
- deletion timestamp;
- deletion reason, where provided.

## 9.3 Snapshot Shape

Recommended top-level shape:

```json
{
  "risk": {},
  "register": {},
  "owner": {},
  "scoring": {},
  "response": {},
  "customFields": [],
  "reviews": [],
  "systemMetadata": {},
  "deletion": {}
}
```

The snapshot is intentionally denormalised. It should be useful even when the original risk, custom field values, and review rows no longer exist.

---

## 10. Required Event Coverage

## 10.1 Authentication

| Action | Scope | Object type | Field changes |
|---|---|---|---|
| `LOGIN_SUCCEEDED` | `SYSTEM` | `AUTH` | No |
| `LOGIN_FAILED` | `SYSTEM` | `AUTH` | No |
| `LOGOUT` | `SYSTEM` | `AUTH` | No |
| `REFRESH_TOKEN_REUSE_DETECTED` | `SYSTEM` | `AUTH` | No |
| `ACCOUNT_LOCKED` | `SYSTEM` | `AUTH` or `USER` | Optional |
| `ACCOUNT_UNLOCKED` | `SYSTEM` | `USER` | Optional |

## 10.2 User Management

| Action | Scope | Object type | Field changes |
|---|---|---|---|
| `USER_CREATED` | `SYSTEM` | `USER` | Optional |
| `USER_UPDATED` | `SYSTEM` | `USER` | Yes |
| `USER_ACTIVATED` | `SYSTEM` | `USER` | Yes |
| `USER_DEACTIVATED` | `SYSTEM` | `USER` | Yes |
| `SYSTEM_ADMIN_GRANTED` | `SYSTEM` | `USER` | Yes |
| `SYSTEM_ADMIN_REMOVED` | `SYSTEM` | `USER` | Yes |

## 10.3 Register and Permission Management

| Action | Scope | Object type | Field changes |
|---|---|---|---|
| `REGISTER_CREATED` | `SYSTEM` | `REGISTER` | Optional |
| `REGISTER_SETTINGS_UPDATED` | `REGISTER` | `REGISTER` | Yes |
| `REGISTER_ADMIN_ADDED` | `REGISTER` | `REGISTER_PERMISSION` | Optional |
| `REGISTER_ADMIN_REMOVED` | `REGISTER` | `REGISTER_PERMISSION` | Optional |
| `REGISTER_VIEWER_ADDED` | `REGISTER` | `REGISTER_PERMISSION` | Optional |
| `REGISTER_VIEWER_REMOVED` | `REGISTER` | `REGISTER_PERMISSION` | Optional |

## 10.4 Configuration

| Action family | Scope | Object type | Field changes |
|---|---|---|---|
| `CUSTOM_FIELD_*` | `REGISTER` | `CUSTOM_FIELD` or `CUSTOM_FIELD_OPTION` | Yes for updates |
| `LIKELIHOOD_VALUE_*` | `REGISTER` | `LIKELIHOOD_VALUE` | Yes for updates |
| `IMPACT_VALUE_*` | `REGISTER` | `IMPACT_VALUE` | Yes for updates |
| `RISK_LEVEL_*` | `REGISTER` | `RISK_LEVEL` | Yes for updates |
| `RISK_MATRIX_UPDATED` | `REGISTER` | `RISK_MATRIX` | Yes or metadata JSON |
| `RESPONSE_STRATEGY_*` | `REGISTER` | `RESPONSE_STRATEGY` | Yes for updates |

## 10.5 Risks and Reviews

| Action | Scope | Object type | Field changes |
|---|---|---|---|
| `RISK_CREATED` | `RISK` | `RISK` | Optional |
| `RISK_UPDATED` | `RISK` | `RISK` | Yes |
| `RISK_OWNER_CHANGED` | `RISK` | `RISK` | Yes |
| `RISK_STATE_CHANGED` | `RISK` | `RISK` | Yes |
| `RISK_SCORE_RECALCULATED` | `RISK` | `RISK` | Yes |
| `RISK_REVIEWED` | `RISK` | `RISK_REVIEW` | Optional |
| `NEXT_REVIEW_DATE_UPDATED` | `RISK` | `RISK` | Yes |
| `RISK_DELETED` | `RISK` | `RISK` | Snapshot required |

## 10.6 Export

| Action | Scope | Object type | Field changes |
|---|---|---|---|
| `RISK_EXPORT_GENERATED` | `REGISTER` | `EXPORT` | No |

The export event must record filters, included/excluded closed-risk setting, actor, register, and row count where known.

---

## 11. Audit Views and Access

Audit access follows the Permission Model.

## 11.1 System Audit Log

Route:

```text
GET /api/v1/audit/system
```

Access:

- System Admin only.

Includes:

- all system-scoped events;
- user management events;
- System Admin role changes;
- authentication and lockout events;
- register creation;
- captured system-level permission denied events.

## 11.2 Register Audit Log

Route:

```text
GET /api/v1/registers/:registerId/audit
```

Access:

- System Admin;
- Register Admin for the register.

Includes:

- events where `register_id = :registerId`;
- register settings changes;
- register permission changes;
- configuration changes;
- risk creation, update, review, deletion;
- CSV exports.

## 11.3 Risk Audit Log

Route:

```text
GET /api/v1/registers/:registerId/risks/:riskId/audit
```

Access:

- risk view access.

Includes:

- audit events where `risk_id = :riskId`;
- review history from `risk_review` where useful;
- deletion events only when accessed from audit context after hard delete.

## 11.4 Audit Event Detail

Route:

```text
GET /api/v1/audit/events/:auditEventId
```

Access is based on event scope:

- `SYSTEM`: System Admin only;
- `REGISTER`: System Admin or Register Admin for `register_id`;
- `RISK`: risk view access while the risk exists, otherwise System Admin or Register Admin for `register_id`.

## 11.5 Deleted-Risk Snapshot

Route:

```text
GET /api/v1/audit/events/:auditEventId/snapshot
```

Access:

- System Admin;
- Register Admin for the snapshot's register.

Risk Owners and Register Viewers cannot access deleted-risk snapshots in the MVP.

---

## 12. Filtering and Sorting

MVP audit list routes must support:

- date range;
- actor;
- action;
- object type;
- register;
- risk ID or display Risk ID where applicable;
- client IP address where captured;
- pagination;
- sort by occurred date.

Recommended default sort:

```text
occurred_at desc
```

Date filters should be interpreted as UTC boundaries after the API has converted or validated client input.

---

## 13. Backend Implementation Pattern

## 13.1 Audit Service

Centralise audit writes in an audit service.

Recommended service methods:

```typescript
recordAuditEvent(input)
recordFieldChanges(auditEventId, changes)
recordRiskDeletionSnapshot(input)
recordRiskUpdateAudit(input)
recordRegisterConfigAudit(input)
```

Business services should call the audit service rather than writing audit rows ad hoc.

## 13.2 Transaction Use

The audit service must support receiving a Prisma transaction client so audit writes can be committed with the business change.

Required transactional audit writes:

- user changes;
- register creation and settings changes;
- register permission changes;
- configuration changes;
- risk creation and update;
- risk review completion;
- risk hard delete and snapshot;
- export job creation if `export_job` is used.

Login failure audit may happen outside a business transaction because there may be no business row mutation.

## 13.3 Diffing

For updates, services should compute field changes from the previous persisted value and the new persisted value.

Rules:

- only record changed fields;
- use display values where they improve readability;
- include IDs for referenced records;
- avoid recording noisy unchanged derived fields;
- include calculated score and level changes when recalculation changes the stored values.

## 13.4 Failure Behaviour

For business mutations where audit is required, failure to write the audit event should fail the whole mutation.

Examples:

- If risk update succeeds but audit write fails, roll back the risk update.
- If risk deletion snapshot fails, do not delete the risk.
- If register permission audit fails, roll back the permission change.

For non-critical security telemetry such as a failed login event, the application may still return the correct authentication response if audit write fails, but the server must log the audit write failure.

---

## 14. Retention and Immutability

MVP does not define an audit retention/deletion feature.

Implementation requirements:

- audit records are retained indefinitely for MVP;
- no UI route may update or delete audit rows;
- no normal API route may update or delete audit rows;
- database administrators may still perform operational maintenance outside application behaviour;
- future retention rules must be documented before implementation.

---

## 15. MVP Deferrals

Product-level MVP exclusions are authoritative in:

- `docs/product/MVP_Scope.md`

Audit-specific capabilities deferred from MVP are:

- audit logs for child-record Risk Response Actions;
- full audit export feature;
- configurable retention policies;
- tamper-evident hash chains;
- digital signatures;
- external SIEM forwarding;
- webhook audit delivery;
- field-level visibility filtering inside audit event detail;
- full deleted-object snapshots for objects other than hard-deleted risks;
- import audit events.

These deferrals should not block implementing the structured audit event model required for MVP.
