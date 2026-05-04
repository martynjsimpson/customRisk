# Custom Risk — MVP API Route Map

**Version:** 1.0  
**Date:** 2026-05-04  
**Status:** Draft  
**Applies to:** MVP delivery  
**Location:** `docs/architecture/API_Route_Map.md`  
**Related documents:** PRD v3.2, MVP Scope v1.2, MVP Functional Specification v1.2, MVP Data Model v1.2, Technical Architecture v1.0, Permission Model v1.0, Audit Model v1.0, Security Model v1.0

---

## 1. Purpose

This document defines the REST API route map for the **Custom Risk MVP**.

It translates the MVP functional specification, MVP data model, and technical architecture decisions into an implementation-ready set of API routes for the Node.js / Express backend.

The API supports:

- local authentication and session refresh;
- user management;
- register management;
- register-level permissions;
- register configuration;
- configurable fields;
- likelihood, impact, risk levels, and matrix configuration;
- risk creation, editing, review, deletion, filtering, and export;
- audit log access;
- dashboard and lookup helper endpoints.

The API is intentionally limited to MVP scope. Deferred PRD capabilities such as SAML, SMTP, notifications, imports, templates, saved views, advanced reporting, attachments, webhooks, and child-record Risk Response Actions are not included.

---

## 2. API Conventions

## 2.1 Base Path

```text
/api/v1
```

## 2.2 Content Type

All request and response bodies use JSON unless otherwise stated.

```http
Content-Type: application/json
```

CSV export endpoints return `text/csv`.

## 2.3 Authentication Header

Authenticated API requests use:

```http
Authorization: Bearer <access_token_or_api_key>
```

Browser sessions use:

- short-lived JWT access token in memory;
- rotating refresh token in an HttpOnly, Secure, SameSite cookie.

External integrations may use API keys in the same bearer header. API keys are differentiated by prefix and validated server-side.

## 2.4 Success Response Shape

Single-object response:

```json
{
  "data": {
    "id": "uuid"
  }
}
```

List response:

```json
{
  "data": [],
  "meta": {
    "total": 100,
    "page": 1,
    "pageSize": 25
  }
}
```

## 2.5 Error Response Shape

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable summary",
    "fields": {
      "title": "Risk title is required"
    }
  }
}
```

## 2.6 Standard Error Codes

| HTTP Status | Error Code | Meaning |
|---:|---|---|
| 400 | `VALIDATION_ERROR` | Request body or query parameter failed validation. |
| 401 | `UNAUTHENTICATED` | No valid token provided. |
| 403 | `FORBIDDEN` | Authenticated but not permitted for this action. |
| 404 | `NOT_FOUND` | Resource does not exist or is not accessible to this user. |
| 409 | `CONFLICT` | Uniqueness conflict, such as duplicate register name. |
| 422 | `UNPROCESSABLE` | Business rule violation, such as removing the last Register Admin. |
| 429 | `RATE_LIMITED` | Too many requests. |
| 500 | `INTERNAL_ERROR` | Unexpected server error. |

Use `404` for both genuine not-found and permission-hidden resources where revealing existence would be inappropriate.

## 2.7 Pagination

List endpoints use MVP offset pagination:

```text
?page=1&pageSize=25
```

Responses include:

```json
{
  "meta": {
    "total": 100,
    "page": 1,
    "pageSize": 25
  }
}
```

## 2.8 Sorting

Sortable endpoints use:

```text
?sortBy=fieldName&sortDir=asc
```

`sortDir` values:

- `asc`
- `desc`

## 2.9 Validation

All request bodies and query parameters should be validated using Zod schemas before reaching service logic.

The frontend may share or mirror request schemas where practical, but server-side validation is authoritative.

## 2.10 Audit Behaviour

Mutating routes should create audit events where listed in this document.

Audit creation should happen in the same transaction as the business change wherever possible.

---

## 3. Access Control Summary

## 3.1 Effective Permissions

Permissions are additive. A user may gain access through:

- System Admin role;
- Register Admin assignment;
- Register Viewer assignment;
- Risk Owner relationship.

System Admin is stored at user level.

Register Admin and Register Viewer are stored as register permissions.

Risk Owner is derived from `risk.owner_user_id`.

## 3.2 Register Access

A user can access a register if any of the following is true:

- the user is a System Admin;
- the user is a Register Admin for the register;
- the user is a Register Viewer for the register;
- the user owns at least one risk in the register.

## 3.3 Risk View Access

A user can view a risk if any of the following is true:

- the user is a System Admin;
- the user is a Register Admin for the risk's register;
- the user is a Register Viewer for the risk's register;
- the user is the Risk Owner.

## 3.4 Risk Edit Access

A user can edit a risk if any of the following is true:

- the user is a System Admin;
- the user is a Register Admin for the risk's register;
- the user is the Risk Owner.

Risk Owners cannot directly edit calculated fields, review history, system metadata, risk score, or risk level.

## 3.5 Configuration Access

A user can configure a register if either of the following is true:

- the user is a System Admin;
- the user is a Register Admin for the register.

## 3.6 Export Access

A user can export register risk data if any of the following is true:

- the user is a System Admin;
- the user is a Register Admin for the register;
- the user is a Register Viewer for the register and `register.allow_viewer_export = true`.

Risk Owners do not receive export permission from ownership alone in MVP.

---

## 4. Health and Session Bootstrap

| Method | Route | Purpose | Auth |
|---|---|---|---|
| `GET` | `/health` | Basic app health check. | No |
| `GET` | `/auth/me` | Return current user and effective permission summary. | Yes |

## 4.1 `GET /health`

Example response:

```json
{
  "data": {
    "status": "ok"
  }
}
```

## 4.2 `GET /auth/me`

Returns the authenticated user and effective permission summary.

Example response:

```json
{
  "data": {
    "user": {
      "id": "uuid",
      "name": "System Admin",
      "email": "admin@example.com",
      "isSystemAdmin": true,
      "isActive": true
    },
    "permissions": {
      "isSystemAdmin": true,
      "registerRoles": [
        {
          "registerId": "uuid",
          "role": "REGISTER_ADMIN"
        }
      ]
    }
  }
}
```

---

## 5. Authentication Routes

| Method | Route | Purpose | Auth | Audit |
|---|---|---|---|---|
| `POST` | `/auth/login` | Login with email and password. | No | `LOGIN_SUCCEEDED` or `LOGIN_FAILED` |
| `POST` | `/auth/refresh` | Rotate refresh token and issue new access token. | Refresh cookie | Security audit on token reuse where applicable |
| `POST` | `/auth/logout` | Revoke refresh token and clear cookie. | Yes | `LOGOUT` |

## 5.1 `POST /auth/login`

Request:

```json
{
  "email": "admin@example.com",
  "password": "TemporaryPassword123!"
}
```

Response:

```json
{
  "data": {
    "accessToken": "jwt",
    "user": {
      "id": "uuid",
      "name": "System Admin",
      "email": "admin@example.com",
      "isSystemAdmin": true
    }
  }
}
```

Validation:

| Field | Rule |
|---|---|
| `email` | Required, valid email. |
| `password` | Required. |

Security rules:

| Rule | Behaviour |
|---|---|
| Invalid credentials | Return a generic login error. |
| Inactive user | Block login. |
| Failed attempts | Apply lockout rules. |
| Rate limiting | Apply auth endpoint rate limits. |
| Refresh token | Set as HttpOnly, Secure, SameSite cookie. |

## 5.2 `POST /auth/refresh`

Request body: none.

Refresh token is read from the HttpOnly cookie.

Response:

```json
{
  "data": {
    "accessToken": "jwt"
  }
}
```

Rules:

- rotate refresh token on every successful refresh;
- invalidate the old token;
- if a reused token is detected, invalidate all refresh tokens for that user;
- inactive users cannot refresh sessions.

## 5.3 `POST /auth/logout`

Request body: none.

Response:

```json
{
  "data": {
    "success": true
  }
}
```

Rules:

- revoke current refresh token;
- clear refresh cookie;
- access token naturally expires.

---

## 6. User Routes

System Admin only.

| Method | Route | Purpose | Auth | Audit |
|---|---|---|---|---|
| `GET` | `/users` | List and search users. | System Admin | None |
| `POST` | `/users` | Create user. | System Admin | `USER_CREATED`, optionally `SYSTEM_ADMIN_GRANTED` |
| `GET` | `/users/:userId` | Get user detail. | System Admin | None |
| `PATCH` | `/users/:userId` | Update user. | System Admin | `USER_UPDATED`, role/status events |
| `POST` | `/users/:userId/activate` | Activate user. | System Admin | `USER_ACTIVATED` |
| `POST` | `/users/:userId/deactivate` | Deactivate user. | System Admin | `USER_DEACTIVATED` |
| `POST` | `/users/:userId/unlock` | Clear account lockout state. | System Admin | `USER_UPDATED` or `ACCOUNT_UNLOCKED` |

## 6.1 `GET /users`

Query parameters:

```text
?page=1&pageSize=25&search=alice&isActive=true&isSystemAdmin=false&sortBy=name&sortDir=asc
```

Response:

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Alice Register Admin",
      "email": "alice@example.com",
      "isSystemAdmin": false,
      "isActive": true,
      "createdAt": "2026-05-04T10:00:00.000Z",
      "updatedAt": "2026-05-04T10:00:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "pageSize": 25
  }
}
```

## 6.2 `POST /users`

Request:

```json
{
  "name": "Alice Register Admin",
  "email": "alice@example.com",
  "password": "TemporaryPassword123!",
  "isSystemAdmin": false,
  "isActive": true
}
```

Validation:

| Field | Rule |
|---|---|
| `name` | Required. |
| `email` | Required, valid format, unique. |
| `password` | Required on create, must satisfy password policy. |
| `isSystemAdmin` | Boolean. |
| `isActive` | Boolean. |

## 6.3 `PATCH /users/:userId`

Request:

```json
{
  "name": "Alice Smith",
  "email": "alice@example.com",
  "password": "NewTemporaryPassword123!",
  "isSystemAdmin": false,
  "isActive": true
}
```

Rules:

- password is optional on update;
- email must remain unique;
- user changes must be audited;
- deactivation must revoke refresh tokens for that user.

---

## 7. Dashboard Routes

| Method | Route | Purpose | Auth |
|---|---|---|---|
| `GET` | `/dashboard/my-work` | Combined role-aware dashboard. | Yes |
| `GET` | `/dashboard/my-risks` | Risks owned by current user. | Yes |
| `GET` | `/dashboard/admin-summary` | Register or system admin summary. | Register Admin or System Admin |

## 7.1 `GET /dashboard/my-work`

Response:

```json
{
  "data": {
    "myOpenRisks": [],
    "myDueSoonRisks": [],
    "myOverdueRisks": [],
    "adminRegisterSummaries": [],
    "systemSummary": {
      "totalRegisters": 2,
      "totalUsers": 4,
      "openRisks": 12,
      "overdueReviews": 3
    },
    "recentAuditActivity": []
  }
}
```

Rules:

- Risk Owners see assigned risks.
- Register Admins see summaries for administered registers.
- System Admins see system-wide totals and recent audit activity.
- Users only receive data they are permitted to access.

---

## 8. Register Routes

| Method | Route | Purpose | Auth | Audit |
|---|---|---|---|---|
| `GET` | `/registers` | List accessible registers. | Yes | None |
| `POST` | `/registers` | Create register with default configuration. | System Admin | `REGISTER_CREATED`, permission events |
| `GET` | `/registers/:registerId` | Get register detail and settings. | Register access | None |
| `PATCH` | `/registers/:registerId` | Update register settings. | System Admin or Register Admin | `REGISTER_SETTINGS_UPDATED` |
| `GET` | `/registers/:registerId/summary` | Register dashboard counts. | Register access | None |

## 8.1 `GET /registers`

Query parameters:

```text
?page=1&pageSize=25&search=security&sortBy=name&sortDir=asc
```

Response:

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Information Security Risk Register",
      "description": "Information security risks",
      "effectiveRole": "REGISTER_ADMIN",
      "openRisksCount": 12,
      "overdueRisksCount": 3,
      "updatedAt": "2026-05-04T10:00:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "pageSize": 25
  }
}
```

## 8.2 `POST /registers`

Request:

```json
{
  "name": "Information Security Risk Register",
  "description": "Information security risks",
  "riskIdPrefix": "ISEC",
  "riskIdZeroPaddingEnabled": true,
  "riskIdZeroPaddingWidth": 4,
  "initialRegisterAdminUserIds": ["uuid"]
}
```

Create transaction should create:

- register;
- initial Register Admin permission rows;
- default likelihood values;
- default impact values;
- default risk levels;
- default risk matrix cells;
- default response strategies;
- audit events.

Validation:

| Field | Rule |
|---|---|
| `name` | Required, unique. |
| `riskIdPrefix` | Optional; must be safe for display IDs if provided. |
| `riskIdZeroPaddingEnabled` | Boolean. |
| `riskIdZeroPaddingWidth` | Required when zero-padding is enabled; integer >= 2. |
| `initialRegisterAdminUserIds` | Existing users only. |

## 8.3 `PATCH /registers/:registerId`

Request:

```json
{
  "name": "Information Security Risk Register",
  "description": "Updated description",
  "riskIdPrefix": "ISEC",
  "riskIdZeroPaddingEnabled": true,
  "riskIdZeroPaddingWidth": 4,
  "reviewsEnabled": true,
  "defaultReviewFrequencyMonths": 12,
  "reviewAttestationText": "I confirm that I have reviewed this risk.",
  "allowViewerExport": false
}
```

Rules:

- changes to prefix or padding do not alter existing Risk IDs;
- review frequency is required when reviews are enabled;
- review attestation text is required when reviews are enabled;
- changes must be audited.

---

## 9. Register Permission Routes

| Method | Route | Purpose | Auth | Audit |
|---|---|---|---|---|
| `GET` | `/registers/:registerId/permissions` | List register permissions. | System Admin or Register Admin | None |
| `POST` | `/registers/:registerId/permissions` | Add register permission. | System Admin or Register Admin | `REGISTER_ADMIN_ADDED` or `REGISTER_VIEWER_ADDED` |
| `DELETE` | `/registers/:registerId/permissions/:permissionId` | Remove register permission. | System Admin or Register Admin | `REGISTER_ADMIN_REMOVED` or `REGISTER_VIEWER_REMOVED` |

## 9.1 `POST /registers/:registerId/permissions`

Request:

```json
{
  "userId": "uuid",
  "role": "REGISTER_ADMIN"
}
```

Validation:

| Rule |
|---|
| User must exist. |
| Duplicate assignment is not allowed. |
| Register Admin cannot assign or remove System Admin rights. |
| Removing final Register Admin is blocked unless the actor is a System Admin. |

---

## 10. Register Configuration Bundle Routes

These routes support the register configuration UI and risk create/edit forms.

| Method | Route | Purpose | Auth |
|---|---|---|---|
| `GET` | `/registers/:registerId/config` | Full register configuration bundle. | Register access |
| `GET` | `/registers/:registerId/risk-form-config` | Active fields and values for risk forms. | Register access |

## 10.1 `GET /registers/:registerId/config`

Response:

```json
{
  "data": {
    "register": {},
    "customFields": [],
    "likelihoodValues": [],
    "impactValues": [],
    "riskLevels": [],
    "matrixCells": [],
    "responseStrategies": []
  }
}
```

## 10.2 `GET /registers/:registerId/risk-form-config`

Response:

```json
{
  "data": {
    "states": ["DRAFT", "OPEN", "CLOSED"],
    "users": [],
    "customFields": [],
    "likelihoodValues": [],
    "impactValues": [],
    "responseStrategies": []
  }
}
```

Rules:

- include active custom fields by default;
- include dropdown options for dropdown fields;
- include active likelihood, impact, and response strategy values;
- include inactive referenced values when needed to render existing risk records.

---

## 11. Custom Field Routes

| Method | Route | Purpose | Auth | Audit |
|---|---|---|---|---|
| `GET` | `/registers/:registerId/custom-fields` | List custom fields. | System Admin or Register Admin | None |
| `POST` | `/registers/:registerId/custom-fields` | Create custom field. | System Admin or Register Admin | `CUSTOM_FIELD_CREATED` |
| `GET` | `/registers/:registerId/custom-fields/:fieldId` | Get custom field detail. | System Admin or Register Admin | None |
| `PATCH` | `/registers/:registerId/custom-fields/:fieldId` | Update custom field. | System Admin or Register Admin | `CUSTOM_FIELD_UPDATED` |
| `POST` | `/registers/:registerId/custom-fields/:fieldId/activate` | Activate custom field. | System Admin or Register Admin | `CUSTOM_FIELD_ACTIVATED` |
| `POST` | `/registers/:registerId/custom-fields/:fieldId/deactivate` | Deactivate custom field. | System Admin or Register Admin | `CUSTOM_FIELD_DEACTIVATED` |

## 11.1 `POST /registers/:registerId/custom-fields`

Request:

```json
{
  "fieldName": "Business Unit",
  "fieldType": "DROPDOWN",
  "helpText": "Select the business unit affected by this risk.",
  "isRequired": true,
  "displayOrder": 10,
  "options": [
    {
      "label": "IT",
      "displayOrder": 1
    },
    {
      "label": "Finance",
      "displayOrder": 2
    }
  ]
}
```

Supported field types:

- `TEXT`
- `MULTILINE_TEXT`
- `BOOLEAN`
- `NUMBER`
- `DATE`
- `DROPDOWN`
- `PERSON_PICKER`

Validation:

| Field | Rule |
|---|---|
| `fieldName` | Required, unique within register. |
| `fieldType` | Required; cannot be changed after creation. |
| `displayOrder` | Required, unique within register. |
| `options` | Required for active dropdown fields. |

Person Picker rule:

- MVP Person Picker values must reference an existing active local user when set.
- Raw email-only unresolved person values are deferred.

## 11.2 `PATCH /registers/:registerId/custom-fields/:fieldId`

Request:

```json
{
  "fieldName": "Business Area",
  "helpText": "Updated help text.",
  "isRequired": false,
  "displayOrder": 20,
  "isActive": true
}
```

Rules:

- field type cannot be changed in MVP;
- deactivation retains existing risk values;
- required field changes affect future saves;
- changes must be audited.

---

## 12. Custom Field Option Routes

| Method | Route | Purpose | Auth | Audit |
|---|---|---|---|---|
| `GET` | `/registers/:registerId/custom-fields/:fieldId/options` | List dropdown options. | System Admin or Register Admin | None |
| `POST` | `/registers/:registerId/custom-fields/:fieldId/options` | Add dropdown option. | System Admin or Register Admin | `CUSTOM_FIELD_OPTION_CREATED` |
| `PATCH` | `/registers/:registerId/custom-fields/:fieldId/options/:optionId` | Update dropdown option. | System Admin or Register Admin | `CUSTOM_FIELD_OPTION_UPDATED` |
| `POST` | `/registers/:registerId/custom-fields/:fieldId/options/:optionId/deactivate` | Deactivate dropdown option. | System Admin or Register Admin | `CUSTOM_FIELD_OPTION_DEACTIVATED` |

## 12.1 `POST /registers/:registerId/custom-fields/:fieldId/options`

Request:

```json
{
  "label": "IT",
  "displayOrder": 1,
  "isActive": true
}
```

Rules:

- option labels must be unique within the field;
- display order should be unique within the field;
- used options should be deactivated rather than deleted.

---

## 13. Likelihood Value Routes

| Method | Route | Purpose | Auth | Audit |
|---|---|---|---|---|
| `GET` | `/registers/:registerId/likelihood-values` | List likelihood values. | Register access | None |
| `POST` | `/registers/:registerId/likelihood-values` | Create likelihood value. | System Admin or Register Admin | `LIKELIHOOD_VALUE_CREATED` |
| `PATCH` | `/registers/:registerId/likelihood-values/:likelihoodId` | Update likelihood value. | System Admin or Register Admin | `LIKELIHOOD_VALUE_UPDATED` |
| `POST` | `/registers/:registerId/likelihood-values/:likelihoodId/deactivate` | Deactivate likelihood value. | System Admin or Register Admin | `LIKELIHOOD_VALUE_DEACTIVATED` |

## 13.1 `POST /registers/:registerId/likelihood-values`

Request:

```json
{
  "name": "Possible",
  "numericValue": 3,
  "displayOrder": 3,
  "isActive": true
}
```

Validation:

| Field | Rule |
|---|---|
| `name` | Required, unique within register. |
| `numericValue` | Required, unique within register unless deliberately allowed later. |
| `displayOrder` | Required, unique within register. |
| `isActive` | Boolean. |

Rules:

- at least one active likelihood value must remain;
- inactive values cannot be selected for new risk updates;
- existing risks retain historical references.

---

## 14. Impact Value Routes

| Method | Route | Purpose | Auth | Audit |
|---|---|---|---|---|
| `GET` | `/registers/:registerId/impact-values` | List impact values. | Register access | None |
| `POST` | `/registers/:registerId/impact-values` | Create impact value. | System Admin or Register Admin | `IMPACT_VALUE_CREATED` |
| `PATCH` | `/registers/:registerId/impact-values/:impactId` | Update impact value. | System Admin or Register Admin | `IMPACT_VALUE_UPDATED` |
| `POST` | `/registers/:registerId/impact-values/:impactId/deactivate` | Deactivate impact value. | System Admin or Register Admin | `IMPACT_VALUE_DEACTIVATED` |

## 14.1 `POST /registers/:registerId/impact-values`

Request:

```json
{
  "name": "Major",
  "numericValue": 4,
  "displayOrder": 4,
  "isActive": true
}
```

Validation and rules mirror likelihood values.

---

## 15. Risk Level Routes

| Method | Route | Purpose | Auth | Audit |
|---|---|---|---|---|
| `GET` | `/registers/:registerId/risk-levels` | List risk levels. | Register access | None |
| `POST` | `/registers/:registerId/risk-levels` | Create risk level. | System Admin or Register Admin | `RISK_LEVEL_CREATED` |
| `PATCH` | `/registers/:registerId/risk-levels/:riskLevelId` | Update risk level. | System Admin or Register Admin | `RISK_LEVEL_UPDATED` |
| `POST` | `/registers/:registerId/risk-levels/:riskLevelId/deactivate` | Deactivate risk level. | System Admin or Register Admin | `RISK_LEVEL_DEACTIVATED` |

## 15.1 `POST /registers/:registerId/risk-levels`

Request:

```json
{
  "name": "High",
  "description": "Requires active management attention.",
  "displayOrder": 3,
  "isActive": true
}
```

Validation:

| Field | Rule |
|---|---|
| `name` | Required, unique within register. |
| `description` | Optional. |
| `displayOrder` | Required, unique within register. |
| `isActive` | Boolean. |

Rules:

- at least one active risk level must remain;
- inactive risk levels cannot be selected in matrix updates for new configuration;
- existing risks retain historical references.

---

## 16. Risk Matrix Routes

| Method | Route | Purpose | Auth | Audit |
|---|---|---|---|---|
| `GET` | `/registers/:registerId/matrix` | Get matrix cells. | Register access | None |
| `PUT` | `/registers/:registerId/matrix` | Replace or update matrix cells in bulk. | System Admin or Register Admin | `RISK_MATRIX_UPDATED` |
| `PATCH` | `/registers/:registerId/matrix/:cellId` | Update one matrix cell. | System Admin or Register Admin | `RISK_MATRIX_UPDATED` |

## 16.1 `GET /registers/:registerId/matrix`

Response:

```json
{
  "data": {
    "likelihoodValues": [],
    "impactValues": [],
    "riskLevels": [],
    "cells": []
  }
}
```

## 16.2 `PUT /registers/:registerId/matrix`

Request:

```json
{
  "cells": [
    {
      "likelihoodValueId": "uuid",
      "impactValueId": "uuid",
      "riskLevelId": "uuid"
    }
  ],
  "recalculateExistingRisks": true
}
```

Rules:

- every referenced likelihood, impact, and risk level must belong to the register;
- every active likelihood and impact combination must have a matrix cell;
- matrix changes should recalculate affected risks immediately where practical;
- changes must be audited.

---

## 17. Response Strategy Routes

The MVP requires response strategies per register, with default values:

- Accept
- Mitigate
- Transfer
- Avoid

A dedicated configuration screen is optional, but the API supports later editing without redesign.

| Method | Route | Purpose | Auth | Audit |
|---|---|---|---|---|
| `GET` | `/registers/:registerId/response-strategies` | List response strategies. | Register access | None |
| `POST` | `/registers/:registerId/response-strategies` | Create response strategy. | System Admin or Register Admin | `RESPONSE_STRATEGY_CREATED` |
| `PATCH` | `/registers/:registerId/response-strategies/:strategyId` | Update response strategy. | System Admin or Register Admin | `RESPONSE_STRATEGY_UPDATED` |
| `POST` | `/registers/:registerId/response-strategies/:strategyId/deactivate` | Deactivate response strategy. | System Admin or Register Admin | `RESPONSE_STRATEGY_DEACTIVATED` |

## 17.1 `POST /registers/:registerId/response-strategies`

Request:

```json
{
  "name": "Mitigate",
  "displayOrder": 2,
  "isActive": true
}
```

Rules:

- name must be unique within register;
- display order should be unique within register;
- used response strategies should be deactivated rather than deleted.

---

## 18. Risk Routes

| Method | Route | Purpose | Auth | Audit |
|---|---|---|---|---|
| `GET` | `/registers/:registerId/risks` | List, filter, search, and sort risks. | Register access | None |
| `POST` | `/registers/:registerId/risks` | Create risk. | System Admin or Register Admin | `RISK_CREATED` |
| `GET` | `/registers/:registerId/risks/:riskId` | Get risk detail. | Risk view access | None |
| `PATCH` | `/registers/:registerId/risks/:riskId` | Edit risk. | Risk edit access | `RISK_UPDATED`, field events |
| `DELETE` | `/registers/:registerId/risks/:riskId` | Hard delete risk. | System Admin | `RISK_DELETED` plus snapshot |

## 18.1 `GET /registers/:registerId/risks`

Query parameters:

```text
?page=1
&pageSize=25
&state=OPEN
&state=DRAFT
&riskLevelId=uuid
&ownerUserId=uuid
&reviewStatus=OVERDUE
&dueForReview=true
&overdue=true
&includeClosed=false
&search=vendor
&sortBy=riskScore
&sortDir=desc
```

Supported filters:

| Filter | Notes |
|---|---|
| `state` | Multi-value. |
| `riskLevelId` | Filter by risk level. |
| `ownerUserId` | Filter by risk owner. |
| `reviewStatus` | Derived display label. |
| `dueForReview` | Derived from review dates. |
| `overdue` | Uses `nextReviewDate < current date`, including never-reviewed risks. |
| `includeClosed` | Defaults to `false`. |
| `search` | Matches Risk ID, title, and description. |

Default behaviour:

- show `DRAFT` and `OPEN` risks;
- exclude `CLOSED` risks unless `includeClosed=true`.

Response:

```json
{
  "data": [
    {
      "id": "uuid",
      "displayRiskId": "ISEC-0001",
      "title": "Unsupported operating system on legacy server",
      "state": "OPEN",
      "owner": {
        "id": "uuid",
        "name": "Bob Risk Owner",
        "email": "bob@example.com"
      },
      "likelihood": {
        "id": "uuid",
        "name": "Possible"
      },
      "impact": {
        "id": "uuid",
        "name": "Major"
      },
      "riskScore": 12,
      "riskLevel": {
        "id": "uuid",
        "name": "High"
      },
      "nextReviewDate": "2026-11-04",
      "reviewStatus": "NOT_DUE",
      "isOverdue": false,
      "systemUpdatedAt": "2026-05-04T10:00:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "pageSize": 25
  }
}
```

## 18.2 `POST /registers/:registerId/risks`

Request:

```json
{
  "title": "Unsupported operating system on legacy server",
  "description": "Legacy server is no longer receiving vendor security updates.",
  "state": "DRAFT",
  "ownerUserId": "uuid",
  "createdDate": "2026-05-04",
  "likelihoodValueId": "uuid",
  "impactValueId": "uuid",
  "responseStrategyId": "uuid",
  "responseAction": "Plan migration to a supported platform.",
  "customFields": [
    {
      "customFieldDefinitionId": "uuid",
      "value": "IT"
    }
  ]
}
```

Server-controlled fields:

- `displayRiskId`
- `riskSequence`
- `riskScore`
- `riskLevelId`
- `nextReviewDate`
- `systemCreatedAt`
- `systemCreatedByUserId`
- `systemUpdatedAt`
- `systemUpdatedByUserId`

Validation:

| Field | Rule |
|---|---|
| `title` | Required. |
| `description` | Required. |
| `state` | Required; defaults to `DRAFT`. |
| `ownerUserId` | Required; existing active local user when assigning. |
| `createdDate` | Required. |
| `likelihoodValueId` | Required; belongs to register. |
| `impactValueId` | Required; belongs to register. |
| `responseStrategyId` | Required; belongs to register. |
| `customFields` | Required fields must be completed. |

Create-risk transaction:

1. Lock or transactionally update register sequence.
2. Generate `riskSequence` and `displayRiskId`.
3. Calculate risk score.
4. Resolve risk level from matrix.
5. Calculate next review date if reviews are enabled.
6. Create risk.
7. Create custom field values.
8. Create audit event.

## 18.3 `GET /registers/:registerId/risks/:riskId`

Response:

```json
{
  "data": {
    "id": "uuid",
    "displayRiskId": "ISEC-0001",
    "riskSequence": 1,
    "title": "Unsupported operating system on legacy server",
    "description": "Legacy server is no longer receiving vendor security updates.",
    "state": "OPEN",
    "owner": {},
    "createdDate": "2026-05-04",
    "likelihood": {},
    "impact": {},
    "riskScore": 12,
    "riskLevel": {},
    "responseStrategy": {},
    "responseAction": "Plan migration to a supported platform.",
    "customFields": [],
    "lastReviewedAt": null,
    "lastReviewedBy": null,
    "nextReviewDate": "2027-05-04",
    "reviewStatus": "NOT_REVIEWED",
    "isOverdue": false,
    "systemCreatedAt": "2026-05-04T10:00:00.000Z",
    "systemCreatedBy": {},
    "systemUpdatedAt": "2026-05-04T10:00:00.000Z",
    "systemUpdatedBy": {}
  }
}
```

## 18.4 `PATCH /registers/:registerId/risks/:riskId`

Request:

```json
{
  "title": "Updated title",
  "description": "Updated description",
  "state": "OPEN",
  "ownerUserId": "uuid",
  "createdDate": "2026-05-04",
  "likelihoodValueId": "uuid",
  "impactValueId": "uuid",
  "responseStrategyId": "uuid",
  "responseAction": "Updated response action.",
  "customFields": [
    {
      "customFieldDefinitionId": "uuid",
      "value": true
    }
  ]
}
```

Rules:

- Risk Owners cannot change `createdDate`.
- Risk Owners cannot directly edit calculated fields.
- Changing likelihood or impact recalculates risk score and risk level.
- Changing created date may recalculate next review date if the risk has never been reviewed and reviews are enabled.
- Changing owner immediately changes access permissions.
- Field-level changes should create audit field-change rows.

## 18.5 `DELETE /registers/:registerId/risks/:riskId`

System Admin only.

Request:

```json
{
  "confirmation": "DELETE",
  "deletionReason": "Duplicate risk created in error."
}
```

Rules:

- confirmation is required;
- create `RISK_DELETED` audit event;
- create full last-known risk snapshot before deleting;
- include active and inactive custom field values in snapshot;
- include review history summary in snapshot;
- hard delete the risk after audit snapshot is safely written.

---

## 19. Risk Review Routes

| Method | Route | Purpose | Auth | Audit |
|---|---|---|---|---|
| `GET` | `/registers/:registerId/risks/:riskId/reviews` | List review history. | Risk view access | None |
| `POST` | `/registers/:registerId/risks/:riskId/reviews` | Complete risk review. | Risk edit access | `RISK_REVIEWED`, `NEXT_REVIEW_DATE_UPDATED` |

## 19.1 `GET /registers/:registerId/risks/:riskId/reviews`

Response:

```json
{
  "data": [
    {
      "id": "uuid",
      "reviewedBy": {
        "id": "uuid",
        "name": "Bob Risk Owner",
        "email": "bob@example.com"
      },
      "reviewedAt": "2026-05-04T10:00:00.000Z",
      "comment": "Reviewed with system owner.",
      "attestationText": "I confirm that I have reviewed this risk.",
      "calculatedNextReviewDate": "2027-05-04"
    }
  ]
}
```

## 19.2 `POST /registers/:registerId/risks/:riskId/reviews`

Request:

```json
{
  "confirmed": true,
  "comment": "Reviewed with system owner. Treatment remains on track."
}
```

Rules:

- reviews must be enabled for the register;
- user must confirm the review;
- comment is optional in MVP;
- attestation text is copied from current register settings into the review record;
- next review date is calculated from review date plus default review frequency;
- risk latest-review fields are updated in the same transaction;
- audit events are created.

---

## 20. CSV Export Routes

| Method | Route | Purpose | Auth | Audit |
|---|---|---|---|---|
| `GET` | `/registers/:registerId/risks/export` | Export filtered risks as CSV. | Export access | `RISK_EXPORT_GENERATED` |
| `POST` | `/registers/:registerId/exports` | Optional: create export job record. | Export access | `RISK_EXPORT_GENERATED` |
| `GET` | `/registers/:registerId/exports` | Optional: list export history. | System Admin or Register Admin | None |

## 20.1 `GET /registers/:registerId/risks/export`

Query parameters mirror the risk table filters:

```text
?state=OPEN&overdue=true&includeClosed=false&search=vendor
```

Response headers:

```http
Content-Type: text/csv
Content-Disposition: attachment; filename="information-security-risk-register.csv"
```

Rules:

- export respects current filters;
- closed risks are excluded unless included by filter;
- Register Viewer export is allowed only when `allowViewerExport = true`;
- Risk Owners do not receive export permission through ownership alone;
- export action is audited.

---

## 21. Audit Routes

| Method | Route | Purpose | Auth |
|---|---|---|---|
| `GET` | `/audit/system` | System-wide audit log. | System Admin |
| `GET` | `/registers/:registerId/audit` | Register audit log. | System Admin or Register Admin |
| `GET` | `/registers/:registerId/risks/:riskId/audit` | Risk-specific audit/history. | Risk view access |
| `GET` | `/audit/events/:auditEventId` | Audit event detail. | Based on event scope |
| `GET` | `/audit/events/:auditEventId/snapshot` | Deleted risk snapshot. | System Admin or Register Admin for register |

## 21.1 Audit Query Filters

```text
?page=1
&pageSize=50
&dateFrom=2026-05-01
&dateTo=2026-05-31
&actorUserId=uuid
&action=RISK_UPDATED
&objectType=RISK
&registerId=uuid
&riskId=uuid
&displayRiskId=ISEC-0001
&ipAddress=203.0.113.10
```

## 21.2 `GET /audit/system`

System Admin only.

Includes:

- authentication events;
- user management events;
- System Admin role changes;
- register creation;
- system-level permission denied events where captured.

## 21.3 `GET /registers/:registerId/audit`

System Admin or Register Admin for the register.

Includes:

- register settings changes;
- register permission changes;
- field configuration changes;
- scoring configuration changes;
- matrix changes;
- risk creation, update, review, deletion;
- CSV exports.

## 21.4 `GET /registers/:registerId/risks/:riskId/audit`

Risk view access required.

Includes:

- risk created;
- field changes;
- owner changes;
- state changes;
- score recalculation events;
- review events.

## 21.5 `GET /audit/events/:auditEventId/snapshot`

Used for deleted risk snapshots.

Rules:

- only available where the audit event has an associated snapshot;
- System Admin can access all snapshots;
- Register Admin can access snapshots for administered registers.

---

## 22. Lookup Routes

Lookup routes support forms and autocomplete. They do not create business objects.

| Method | Route | Purpose | Auth |
|---|---|---|---|
| `GET` | `/lookups/users` | Active user autocomplete. | Yes |
| `GET` | `/lookups/registers` | Accessible register picker. | Yes |
| `GET` | `/lookups/audit-actions` | Audit action filter values. | System Admin or Register Admin |

## 22.1 `GET /lookups/users`

Query parameters:

```text
?search=ali&activeOnly=true&page=1&pageSize=10
```

Used for:

- assigning Risk Owner;
- assigning Register Admins;
- assigning Register Viewers;
- Person Picker custom fields;
- filtering audit by actor.

Response:

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Alice Register Admin",
      "email": "alice@example.com",
      "isActive": true
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "pageSize": 10
  }
}
```

---

## 23. Derived Values and Service Rules

The following are not directly editable via the API.

## 23.1 Risk ID Generation

Risk ID is generated from register settings.

Examples:

| Prefix | Zero Padding | Output |
|---|---|---|
| None | No | `1` |
| `RISK` | No | `RISK-1` |
| None | Yes, width 4 | `0001` |
| `RISK` | Yes, width 4 | `RISK-0001` |

Generation rules:

1. Use `register.nextRiskSequence`.
2. Apply zero padding if enabled.
3. Apply prefix if present.
4. Store both sequence and display Risk ID.
5. Increment sequence in the same transaction as risk creation.

## 23.2 Risk Score

```text
riskScore = likelihood.numericValue × impact.numericValue
```

Rules:

- recalculate when likelihood or impact changes;
- never allow direct user editing.

## 23.3 Risk Level

Risk level is resolved from the matrix cell matching:

- register;
- likelihood value;
- impact value.

Rules:

- block risk save if no matching matrix cell exists;
- recalculate when likelihood, impact, or relevant matrix mapping changes.

## 23.4 Next Review Date

If review is completed:

```text
nextReviewDate = reviewedAt date + register.defaultReviewFrequencyMonths
```

If never reviewed:

```text
nextReviewDate = risk.createdDate + register.defaultReviewFrequencyMonths
```

If reviews are disabled:

```text
nextReviewDate = null
```

## 23.5 Review Status Display

Display status:

| Condition | Display Status |
|---|---|
| Reviews disabled | `NOT_REQUIRED` |
| Never reviewed | `NOT_REVIEWED` |
| Reviewed and next review date is in the past | `OVERDUE` |
| Reviewed and next review date is today or within 30 days | `DUE_SOON` |
| Otherwise | `NOT_DUE` |

Important distinction:

A never-reviewed risk displays as `NOT_REVIEWED`. However, if its `nextReviewDate` is in the past, it must still be included in overdue filters and overdue dashboard counts.

Overdue filter logic:

```text
isOverdue =
  register.reviewsEnabled = true
  AND risk.nextReviewDate < current_date
  AND risk.state != 'CLOSED'
```

---

## 24. Suggested Express Route Structure

```text
backend/src/routes/
  index.ts
  health.routes.ts
  auth.routes.ts
  dashboard.routes.ts
  users.routes.ts
  registers.routes.ts
  register-permissions.routes.ts
  custom-fields.routes.ts
  scoring.routes.ts
  risks.routes.ts
  reviews.routes.ts
  exports.routes.ts
  audit.routes.ts
  lookups.routes.ts
```

Suggested mounting:

```typescript
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/registers', registersRoutes);
app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/lookups', lookupRoutes);
```

Nested register routes can be mounted under `/api/v1/registers`:

```typescript
router.use('/:registerId/permissions', registerPermissionRoutes);
router.use('/:registerId/custom-fields', customFieldRoutes);
router.use('/:registerId/risks', riskRoutes);
router.use('/:registerId/audit', registerAuditRoutes);
```

---

## 25. Routes Deliberately Excluded From MVP

Do not implement these routes for MVP:

```text
/imports
/templates
/notifications
/saml
/smtp
/webhooks
/risk-response-actions
/saved-views
/reports/advanced
/attachments
/configuration-versions
```

These map to deferred PRD areas and should not be added unless the MVP scope changes.

---

## 26. Recommended Build Order

Suggested implementation order:

1. `GET /health`
2. `POST /auth/login`
3. `POST /auth/refresh`
4. `POST /auth/logout`
5. `GET /auth/me`
6. User management routes
7. Register creation and listing routes
8. Register permission routes
9. Register default configuration seed service
10. Custom field routes
11. Likelihood, impact, risk level, matrix routes
12. Risk create/list/detail/edit routes
13. Risk review routes
14. CSV export route
15. Dashboard routes
16. Audit log routes
17. Lookup helper routes

---

## 27. Notes for Implementation Backlog

When turning this route map into build tickets, each route should have:

- route definition;
- Zod request schema;
- permission middleware;
- service method;
- Prisma query or transaction;
- audit event coverage where required;
- integration tests;
- frontend API client method.

High-risk areas that should receive dedicated tests:

- register access rules;
- risk owner access rules;
- last Register Admin protection;
- transactional Risk ID generation;
- score and matrix recalculation;
- never-reviewed but overdue risk behaviour;
- hard delete snapshot creation;
- Register Viewer export permission;
- inactive user login blocking;
- refresh token rotation and reuse detection.
