# Custom Risk Permission Model

**Version:** 1.1  
**Date:** 2026-05-09  
**Status:** Active  
**Applies to:** Current and future permission enforcement  
**Related documents:** Technical Architecture v1.1, API Standards v1.0, Audit Model v1.1, Security Model v1.1, PM0-04 Audit and Permission Extension Plan

---

## 1. Purpose

This document defines the durable permission model for Custom Risk.

It is the source of truth for:

- permission principles;
- permission sources;
- effective access rules;
- field-level edit restrictions;
- permission-management rules;
- backend enforcement expectations;
- frontend permission-shaping expectations.

It is not the route inventory or the canonical schema definition.

---

## 2. Document Ownership Split

- Use this document for permission behavior and enforcement rules.
- Use `backend/prisma/schema.prisma` as the canonical physical schema.
- Use `docs/postman/` for currently implemented endpoints.

---

## 3. Permission Principles

1. **Permissions are additive.**  
   A user receives the highest effective access available from all applicable permission sources.

2. **Backend enforcement is authoritative.**  
   The frontend may hide or disable UI, but every protected route and service operation must enforce permissions on the server.

3. **Register scope is the main boundary.**  
   Most access decisions are evaluated for a specific register.

4. **Ownership-derived access is real but limited.**  
   Risk ownership grants access to the owned risk and container-level register visibility, but it does not grant full register-wide access.

5. **Permission changes take effect immediately.**  
   Access must be evaluated from current database state, not from long-lived cached claims.

6. **Do not reveal hidden resources.**  
   Where exposing existence would be inappropriate, return `404 NOT_FOUND` instead of confirming the resource exists.

---

## 4. Permission Sources

### 4.1 System Admin

System Admin is stored on the user record:

```text
user.is_system_admin
```

System Admins have global access to application functionality unless a route is
explicitly public or unauthenticated.

### 4.2 Register Admin

Register Admin is stored as a register permission row:

```text
register_permission.role = REGISTER_ADMIN
```

Register Admins can manage the specific register they are assigned to.

### 4.3 Register Viewer

Register Viewer is stored as a register permission row:

```text
register_permission.role = REGISTER_VIEWER
```

Register Viewers have read-only access to the assigned register, with export
access only when the register-level viewer-export flag allows it.

### 4.4 Risk Owner

Risk Owner is derived from:

```text
risk.owner_user_id
```

Risk ownership is per-risk, not a separately assigned global role.

---

## 5. Effective Access Rules

### 5.1 Register Access

A user can access a register if any of the following is true:

- the user is a System Admin;
- the user is a Register Admin for the register;
- the user is a Register Viewer for the register;
- the user owns at least one risk in the register.

Ownership-derived register access is container access only. It does not grant
visibility into unassigned risks in that register.

### 5.2 Risk View Access

A user can view a risk if any of the following is true:

- the user is a System Admin;
- the user is a Register Admin for the risk's register;
- the user is a Register Viewer for the risk's register;
- the user is the Risk Owner for that risk.

### 5.3 Risk Edit Access

A user can edit a risk if any of the following is true:

- the user is a System Admin;
- the user is a Register Admin for the risk's register;
- the user is the Risk Owner for that risk.

Risk edit access does not mean every field is editable.

### 5.4 Register Management Access

A user can manage a register if either of the following is true:

- the user is a System Admin;
- the user is a Register Admin for the register.

This includes register settings, register permissions, and current register
configuration endpoints.

### 5.5 Export Access

A user can export register risk data if any of the following is true:

- the user is a System Admin;
- the user is a Register Admin for the register;
- the user is a Register Viewer for the register and `register.allow_viewer_export = true`.

Risk Owners do not gain export permission from ownership alone.

### 5.6 Audit Access

Current behavior is split by audit scope:

- system audit: System Admin only;
- register audit: System Admin or Register Admin for the register;
- risk audit event visibility: users with risk-view access for the risk, subject to the implemented route surface;
- deleted-risk snapshots: System Admin or Register Admin for the deleted risk's register.

See the Postman collection for the currently exposed API endpoints.

---

## 6. Current Capability Summary

| Capability | System Admin | Register Admin | Register Viewer | Risk Owner |
|---|:---:|:---:|:---:|:---:|
| Log in | Yes | Yes | Yes | Yes |
| Manage users | Yes | No | No | No |
| Grant/remove System Admin | Yes | No | No | No |
| Create register | Yes | No | No | No |
| View register | Yes | Assigned registers | Assigned registers | Registers containing owned risks |
| Update register settings | Yes | Assigned registers | No | No |
| Manage register permissions | Yes | Assigned registers | No | No |
| Configure register fields/scoring | Yes | Assigned registers | No | No |
| View risks | Yes | All risks in assigned registers | All risks in assigned registers | Owned risks only |
| Create risks | Yes | Assigned registers | No | No |
| Edit risks | Yes | All risks in assigned registers | No | Owned risks, limited fields |
| Review risks | Yes | All risks in assigned registers | No | Owned risks |
| Hard delete risks | Yes | No | No | No |
| Export risks | Yes | Assigned registers | If enabled for register | No |
| View system audit | Yes | No | No | No |
| View register audit | Yes | Assigned registers | No | No |
| View deleted-risk snapshots | Yes | Assigned registers | No | No |

If a user has multiple applicable permission sources, the highest effective
capability applies.

---

## 7. Field-Level Edit Rules

### 7.1 Admin Risk Editing

System Admins and Register Admins may edit normal risk business fields,
including:

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

They should not directly edit system-controlled calculated or metadata fields
through ordinary risk update flows.

### 7.2 Risk Owner Editing

Risk Owners may edit permitted business fields on owned risks, including:

- title;
- description;
- state, subject to validation;
- likelihood;
- impact;
- response strategy;
- response action;
- custom field values.

Risk Owners may not edit:

- created date;
- calculated risk score;
- calculated risk level;
- review timestamps or review history;
- system-created/system-updated metadata;
- audit rows.

The backend service layer must ignore or reject changes outside the actor's
allowed field set.

### 7.3 System-Controlled Fields

Fields such as these are always system-controlled:

- `risk.risk_score`
- `risk.risk_level_id`
- `risk.last_reviewed_at`
- `risk.last_reviewed_by_user_id`
- `risk.next_review_date`
- `risk.system_created_at`
- `risk.system_created_by_user_id`
- `risk.system_updated_at`
- `risk.system_updated_by_user_id`

---

## 8. Register Permission Management Rules

### 8.1 Assignment Rules

Register permissions can be assigned only to existing local users.

Current assignable register roles are:

- `REGISTER_ADMIN`
- `REGISTER_VIEWER`

### 8.2 Last Register Admin Protection

The backend must prevent accidental removal of the final Register Admin for a
register.

Rule:

- if removing a `REGISTER_ADMIN` row would leave the register with zero Register Admins, block the removal unless the actor is a System Admin.

This rule must be enforced in backend service logic inside the same transaction
as the permission removal.

### 8.3 System Admin Rights

System Admin rights are managed through user management, not register
permissions.

Register Admins cannot:

- grant System Admin rights;
- remove System Admin rights;
- create users just to assign register permissions;
- activate or deactivate users.

---

## 9. Permission Freshness and Authentication

JWT access tokens identify the authenticated user, but must not be treated as
the long-term source of register permissions or ownership-derived access.

Implementation expectations:

- register permissions and ownership-derived access are evaluated from the database;
- permission-sensitive handlers use current database state;
- permission changes take effect no later than the next API request that evaluates permissions.

The current session bootstrap payload from `GET /auth/me` exposes:

- `isSystemAdmin`
- `registerRoles`

That payload is useful for UI shaping, but it is not a replacement for backend
authorization checks.

---

## 10. Backend Enforcement Pattern

### 10.1 Authenticated Actor

Authenticated request context should carry a lightweight actor object rather
than a full cached permission graph.

### 10.2 Centralized Helpers

Permission checks should be centralized in helper functions and middleware such as:

- `canViewRegister`
- `canManageRegister`
- `canManageRegisterPermissions`
- `canExportRegister`
- `canViewRisk`
- `canEditRisk`
- `canDeleteRisk`
- `requireRegisterAccess`
- `requireRegisterManagement`
- `requireRiskView`
- `requireRiskEdit`
- `requireExportAccess`
- `requireSystemAdmin`

### 10.3 Service-Layer Enforcement

Route middleware may perform broad access checks, but service methods must still
enforce business-specific permission rules.

Examples:

- risk updates must enforce field-level restrictions for Risk Owners;
- permission removal must enforce last Register Admin protection;
- export logic must enforce `allowViewerExport`;
- risk owner reassignment must validate the new owner;
- hard delete must require System Admin.

### 10.4 Hidden Resource Behavior

Where revealing a resource would be inappropriate, permission middleware should
return hidden `404 NOT_FOUND` responses rather than confirming existence.

---

## 11. Frontend Behavior

The frontend should use effective permissions to shape navigation and available
actions, but never as a security boundary.

Current expectations:

- hide navigation items the user cannot reach;
- hide or disable actions the user cannot perform;
- use `GET /auth/me` as the initial permission bootstrap;
- re-fetch relevant data after permission-changing mutations.

Examples:

- System Admin sees global admin navigation such as Users and system audit.
- Register Admin sees management views for assigned registers.
- Register Viewer sees read-only register views.
- Risk Owner sees owned-risk actions but not wider administrative controls unless another role grants them.

---

## 12. Error Handling

Use the standard API error shape from `api-standards.md`.

Recommended status behavior:

| Situation | Status | Error code |
|---|---:|---|
| No valid authentication | 401 | `UNAUTHENTICATED` |
| Authenticated but action is not allowed | 403 | `FORBIDDEN` |
| Resource does not exist or should be hidden | 404 | `NOT_FOUND` |
| Last Register Admin removal blocked | 422 | `UNPROCESSABLE` |
| Duplicate register permission assignment | 409 | `CONFLICT` |

Use hidden `404 NOT_FOUND` when returning `403 FORBIDDEN` would confirm the
existence of a resource the caller should not learn about.

---

## 13. Audit Expectations

Permission-related changes must be audited according to `audit-model.md`.

Important events include:

- `SYSTEM_ADMIN_GRANTED`
- `SYSTEM_ADMIN_REMOVED`
- `REGISTER_ADMIN_ADDED`
- `REGISTER_ADMIN_REMOVED`
- `REGISTER_VIEWER_ADDED`
- `REGISTER_VIEWER_REMOVED`
- ownership-related events where implemented
- export events where permission decisions matter

Permission-change audit writes should happen in the same transaction as the
underlying change where practical.

---

## 14. Data Model Mapping

| Permission concept | Current model / field |
|---|---|
| System Admin | `User.isSystemAdmin` |
| User active state | `User.isActive` |
| Register Admin | `RegisterPermission.role = REGISTER_ADMIN` |
| Register Viewer | `RegisterPermission.role = REGISTER_VIEWER` |
| Risk Owner | `Risk.ownerUserId` |
| Viewer export setting | `Register.allowViewerExport` |

Database constraints help enforce permission-row uniqueness, but application
logic still owns higher-level rules such as last-admin protection and
ownership-derived access.

---

## 15. Current Deferrals

This document does not define future permission subjects for every later-phase
feature area.

Those extensions belong in:

- `docs/planning/PM0-04-audit-permission-extension.md`

Examples of deferred or later-phase areas include:

- child-record Risk Response Action permissions;
- configurable field-level visibility;
- unresolved-person ownership models beyond the current implementation;
- team or group-based permissions;
- template inheritance of permissions;
- workflow-specific transition permissions;
- per-field edit permissions;
- custom export visibility rules beyond Register Viewer export enablement;
- public sharing links.
