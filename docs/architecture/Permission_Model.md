# Custom Risk — MVP Permission Model

**Version:** 1.0  
**Date:** 2026-05-04  
**Status:** Draft  
**Applies to:** MVP delivery  
**Related documents:** PRD v3.2, MVP Scope v1.2, MVP Functional Specification v1.2, MVP Data Model v1.2, Technical Architecture v1.0, API Route Map v1.0

---

## 1. Purpose

This document defines the permission model for the Custom Risk MVP.

It is the implementation reference for how the backend, frontend, and database model should interpret roles, register assignments, risk ownership, export access, configuration access, and audit visibility.

The model is intentionally limited to MVP scope. Product-level exclusions are authoritative in `docs/product/MVP_Scope.md`; permission-specific deferrals are listed in section 14.

---

## 2. Permission Principles

1. **Permissions are additive.**  
   A user receives the highest effective access available from all permission sources.

2. **Backend enforcement is authoritative.**  
   The frontend may hide unavailable UI actions, but every protected API route and service operation must enforce permissions on the server.

3. **Register scope is the main boundary.**  
   Most MVP permissions are evaluated for a specific register.

4. **Risk ownership is derived, not assigned separately.**  
   A user becomes a Risk Owner for a risk when `risk.owner_user_id` references that user.

5. **Configuration access is administrative.**  
   Only System Admins and Register Admins can manage register configuration.

6. **Permission changes take effect immediately.**  
   Access must be evaluated from current database state, not from long-lived cached permission claims.

7. **Do not reveal hidden resources.**  
   Where exposing existence would be inappropriate, return `404 NOT_FOUND` for inaccessible resources.

---

## 3. Permission Sources

## 3.1 System Admin

System Admin is stored on the user record:

```text
user.is_system_admin
```

A System Admin can access all MVP functionality unless a route is explicitly public or unauthenticated.

System Admins can:

- manage users;
- grant and remove System Admin rights;
- create registers;
- manage all registers;
- manage all register permissions;
- configure all registers;
- create, edit, review, export, and hard delete risks;
- view system, register, and risk audit logs;
- access deleted-risk snapshots.

System Admin rights are not stored in `register_permission`.

## 3.2 Register Admin

Register Admin is stored as a register permission row:

```text
register_permission.role = REGISTER_ADMIN
```

A Register Admin can manage the specific register they are assigned to.

Register Admins can:

- view the register;
- update register settings;
- manage register permissions, except System Admin rights;
- configure custom fields;
- configure likelihood, impact, risk levels, matrix cells, and response strategies;
- create and edit risks in the register;
- review risks in the register;
- export register risk data;
- view register and risk audit logs for the register.

Register Admins cannot:

- create registers in the MVP;
- manage system users except by assigning existing users to register permissions;
- grant or remove System Admin rights;
- access registers where they have no permission.

## 3.3 Register Viewer

Register Viewer is stored as a register permission row:

```text
register_permission.role = REGISTER_VIEWER
```

A Register Viewer has read-only access to a specific register.

Register Viewers can:

- view the register;
- view risks in the register;
- filter, sort, search, and open risk records;
- export register risk data only when `register.allow_viewer_export = true`.

Register Viewers cannot:

- create, edit, review, or delete risks;
- configure registers;
- manage permissions;
- view administrative audit logs unless they also have higher permissions.

## 3.4 Risk Owner

Risk Owner is derived from:

```text
risk.owner_user_id
```

A user is a Risk Owner only for the risks assigned to them.

Risk Owners can:

- view assigned risks;
- edit permitted fields on assigned risks;
- complete reviews for assigned risks;
- see due and overdue review status for assigned risks.

Risk Owners cannot:

- create risks in the MVP;
- delete risks;
- configure registers;
- manage permissions;
- export risk data through ownership alone;
- directly edit calculated fields, review history, system metadata, risk score, or risk level;
- override Created Date in the MVP.

When a risk owner changes, the previous owner's derived access is removed immediately and the new owner's derived access is granted immediately.

---

## 4. Effective Permission Evaluation

## 4.1 Effective Register Access

A user can access a register if any of the following is true:

- the user is a System Admin;
- the user has `REGISTER_ADMIN` permission for the register;
- the user has `REGISTER_VIEWER` permission for the register;
- the user owns at least one risk in the register.

Risk-owner-derived register access allows the user to see the register as a container for assigned risks. It does not grant access to all risks in that register.

## 4.2 Effective Risk View Access

A user can view a risk if any of the following is true:

- the user is a System Admin;
- the user has `REGISTER_ADMIN` permission for the risk's register;
- the user has `REGISTER_VIEWER` permission for the risk's register;
- the user is the Risk Owner for the risk.

## 4.3 Effective Risk Edit Access

A user can edit a risk if any of the following is true:

- the user is a System Admin;
- the user has `REGISTER_ADMIN` permission for the risk's register;
- the user is the Risk Owner for the risk.

Risk edit access does not mean every field is editable. Field-level edit restrictions still apply.

## 4.4 Effective Configuration Access

A user can configure a register if any of the following is true:

- the user is a System Admin;
- the user has `REGISTER_ADMIN` permission for the register.

Configuration access includes register settings, custom fields, dropdown options, likelihood values, impact values, risk levels, matrix cells, and response strategies.

## 4.5 Effective Export Access

A user can export register risk data if any of the following is true:

- the user is a System Admin;
- the user has `REGISTER_ADMIN` permission for the register;
- the user has `REGISTER_VIEWER` permission for the register and `register.allow_viewer_export = true`.

Risk Owners do not receive export permission from ownership alone in the MVP.

## 4.6 Effective Audit Access

System audit access:

- System Admin only.

Register audit access:

- System Admin;
- Register Admin for the register.

Risk audit access:

- System Admin;
- Register Admin for the risk's register;
- Register Viewer for risks in assigned registers;
- Risk Owner for assigned risks.

Deleted-risk snapshot access:

- System Admin;
- Register Admin for the deleted risk's register.

Register Viewers do not receive audit log access in the MVP.

---

## 5. Capability Matrix

| Capability | System Admin | Register Admin | Register Viewer | Risk Owner |
|---|:---:|:---:|:---:|:---:|
| Log in | Yes | Yes | Yes | Yes |
| Manage users | Yes | No | No | No |
| Grant/remove System Admin | Yes | No | No | No |
| Create register | Yes | No | No | No |
| View register | Yes | Assigned registers | Assigned registers | Registers containing assigned risks |
| Update register settings | Yes | Assigned registers | No | No |
| Manage register permissions | Yes | Assigned registers | No | No |
| Configure fields/scoring/matrix | Yes | Assigned registers | No | No |
| View risks | Yes | All risks in assigned registers | All risks in assigned registers | Assigned risks only |
| Create risks | Yes | Assigned registers | No | No |
| Edit risks | Yes | All risks in assigned registers | No | Assigned risks, limited fields |
| Review risks | Yes | All risks in assigned registers | No | Assigned risks |
| Hard delete risks | Yes | No | No | No |
| Export risks | Yes | Assigned registers | If enabled for register | No |
| View system audit | Yes | No | No | No |
| View register audit | Yes | Assigned registers | No | No |
| View deleted-risk snapshots | Yes | Assigned registers | No | No |

If a user has multiple permissions, use the highest applicable capability. For example, a Register Viewer who is also the Risk Owner of one risk can view the whole register as a viewer and edit/review only their assigned risk as owner.

---

## 6. Field-Level Edit Rules

## 6.1 Admin Risk Edit Fields

System Admins and Register Admins may edit normal risk fields, including:

- title;
- description;
- state;
- owner;
- created date;
- likelihood;
- impact;
- response strategy;
- response action;
- custom field values.

They cannot directly edit system-controlled calculated or metadata fields through normal risk update routes.

## 6.2 Risk Owner Edit Fields

Risk Owners may edit permitted business fields on assigned risks:

- title;
- description;
- state, subject to validation;
- owner;
- likelihood;
- impact;
- response strategy;
- response action;
- custom field values.

Risk Owners cannot edit:

- created date;
- risk score;
- risk level;
- last reviewed timestamp;
- last reviewed by;
- next review date;
- system created at/by;
- system updated at/by;
- review history rows;
- audit rows.

The service layer must ignore or reject attempts to update fields outside the actor's allowed field set.

## 6.3 System-Controlled Fields

The following fields are always system-controlled:

- `risk.risk_score`;
- `risk.risk_level_id`;
- `risk.last_reviewed_at`;
- `risk.last_reviewed_by_user_id`;
- `risk.next_review_date`;
- `risk.system_created_at`;
- `risk.system_created_by_user_id`;
- `risk.system_updated_at`;
- `risk.system_updated_by_user_id`.

These fields are changed only by dedicated service logic, such as risk recalculation, review completion, or persistence metadata handling.

---

## 7. Register Permission Management

## 7.1 Assignment Rules

Register permissions can be assigned only to existing local users.

Allowed roles:

- `REGISTER_ADMIN`;
- `REGISTER_VIEWER`.

The same user may hold both roles for a register, but this is redundant because Register Admin already includes register-view capability. The UI should discourage redundant assignments where practical.

## 7.2 Last Register Admin Protection

The system must prevent accidental removal of the final Register Admin for a register.

Rule:

- If removing a `REGISTER_ADMIN` row would leave the register with zero Register Admins, block the removal unless the actor is a System Admin.

Rationale:

- Register Admins need protection from accidentally orphaning a register.
- System Admins retain global authority and can intentionally leave a register without assigned Register Admins if operationally required.

The rule must be enforced in the backend service layer inside the same transaction as the permission removal.

## 7.3 System Admin Rights

System Admin rights are managed through User Management only.

Register Admins cannot:

- grant System Admin rights;
- remove System Admin rights;
- create users for the purpose of assigning permissions;
- activate or deactivate users.

---

## 8. Authentication Tokens and Permission Freshness

JWT access tokens should identify the authenticated user but must not be treated as the long-term source of register permissions.

Implementation standard:

- Access tokens may include user ID and basic System Admin state for convenience.
- Register permissions and risk ownership must be read from the database for protected operations.
- Permission-sensitive route handlers should use current database state.
- Permission changes take effect no later than the next API request that evaluates permissions.

If System Admin status is included in the JWT, services that perform highly sensitive operations should confirm current `user.is_system_admin` from the database.

API keys inherit the permissions of the linked user account and must use the same effective permission checks as browser sessions.

---

## 9. Backend Implementation Pattern

## 9.1 Authenticated Actor

After authentication, request context should contain at least:

```typescript
type AuthenticatedActor = {
  userId: string;
  authMethod: 'jwt' | 'apiKey';
};
```

The actor context should not be treated as a complete permission object.

## 9.2 Permission Helper Functions

The backend should centralise permission checks in helper functions or a permission service.

Recommended helper names:

```typescript
canAccessRegister(actor, registerId)
canViewRisk(actor, registerId, riskId)
canEditRisk(actor, registerId, riskId)
canConfigureRegister(actor, registerId)
canManageRegisterPermissions(actor, registerId)
canExportRegister(actor, registerId)
canViewSystemAudit(actor)
canViewRegisterAudit(actor, registerId)
canViewDeletedRiskSnapshot(actor, registerId)
```

Helpers should return a boolean or a structured result that includes the effective source of access where useful for logging or UI bootstrap.

## 9.3 Service-Layer Enforcement

Route middleware may perform broad checks, but service methods must enforce business permissions for mutating operations.

Examples:

- Risk update service must filter or reject disallowed field changes for Risk Owners.
- Permission removal service must enforce last Register Admin protection.
- Export service must check `allow_viewer_export`.
- Risk owner reassignment must validate that the new owner is an existing active local user.
- Hard delete service must require System Admin.

## 9.4 Transaction Boundaries

Permission-sensitive mutations should perform permission checks and writes in a single transaction where stale state could matter.

This is required for:

- removing Register Admin rows;
- changing risk ownership;
- hard deleting risks and writing deletion snapshots;
- writing audit events for permission changes.

---

## 10. Frontend Behaviour

The frontend should use effective permissions to shape navigation and action availability.

Rules:

- Hide navigation items the user cannot access.
- Disable or hide actions the user cannot perform.
- Treat `GET /api/v1/auth/me` as the initial permission bootstrap endpoint.
- Re-fetch relevant data after permission-changing mutations.
- Do not rely on hidden UI as a security control.

Frontend examples:

- System Admin sees Users and all registers.
- Register Admin sees configuration links for assigned registers.
- Register Viewer sees read-only register views.
- Risk Owner sees assigned risks and review actions for those risks.
- Risk Owner should not see unassigned-risk dashboard counts unless they also have Register Admin or System Admin access.

---

## 11. Error Handling

Use the standard API error shape from the API Route Map.

Recommended status behaviour:

| Situation | Status | Error code |
|---|---:|---|
| No valid authentication | 401 | `UNAUTHENTICATED` |
| Authenticated but action is not allowed | 403 | `FORBIDDEN` |
| Resource does not exist or should be hidden | 404 | `NOT_FOUND` |
| Last Register Admin removal blocked | 422 | `UNPROCESSABLE` |
| Duplicate register permission assignment | 409 | `CONFLICT` |

Use `404 NOT_FOUND` instead of `403 FORBIDDEN` when returning `403` would confirm the existence of a register, risk, audit event, or deleted-risk snapshot the user should not know about.

---

## 12. Audit Requirements

Permission-related changes must be audited.

Required audit events:

- `SYSTEM_ADMIN_GRANTED`;
- `SYSTEM_ADMIN_REMOVED`;
- `REGISTER_ADMIN_ADDED`;
- `REGISTER_ADMIN_REMOVED`;
- `REGISTER_VIEWER_ADDED`;
- `REGISTER_VIEWER_REMOVED`;
- `RISK_OWNER_CHANGED`;
- `RISK_EXPORT_GENERATED`;
- permission-denied security events where practical and useful.

Audit events should capture:

- actor user ID;
- actor display name and email at time of event;
- affected user ID where applicable;
- affected register ID where applicable;
- affected risk ID and display Risk ID where applicable;
- previous value and new value where applicable;
- concise human-readable summary.

Permission change audit events should be written in the same transaction as the permission change.

---

## 13. Data Model Mapping

| Permission concept | Prisma model / field |
|---|---|
| System Admin | `User.isSystemAdmin` |
| User active state | `User.isActive` |
| Register Admin | `RegisterPermission.role = REGISTER_ADMIN` |
| Register Viewer | `RegisterPermission.role = REGISTER_VIEWER` |
| Risk Owner | `Risk.ownerUserId` |
| Viewer export setting | `Register.allowViewerExport` |
| Audit actor | `AuditEvent.actorUserId` |
| Permission audit object | `AuditEvent.objectType` and `AuditEvent.action` |
| API key inherited permission | `ApiKey.userId` linked to `User` |

Database constraints support uniqueness of register permission rows:

```text
unique(register_id, user_id, role)
```

The database does not enforce every permission rule. Application service logic must enforce last-admin protection, field-level edit rules, ownership-derived access, export access, and hidden-resource behaviour.

---

## 14. MVP Deferrals

Product-level MVP exclusions are authoritative in:

- `docs/product/MVP_Scope.md`

Permission-specific capabilities deferred from MVP are:

- child-record Risk Response Action permissions;
- configurable field-level visibility;
- raw email or unresolved person ownership;
- team/group-based permissions;
- register templates with inherited permissions;
- workflow-specific state transition permissions;
- per-field edit permissions;
- custom export visibility rules beyond Register Viewer export enablement;
- public sharing links.

These deferrals should not be partially implemented in MVP permission logic unless a later planning document explicitly moves them into scope.
