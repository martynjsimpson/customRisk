# Post-MVP Audit and Permission Extension Plan

**Ticket:** PM0-04  
**Version:** 1.0  
**Date:** 2026-05-07  
**Status:** Approved  
**Related documents:** Audit Model v1.0, Permission Model v1.0, PM0-01 Scope Baseline, PM0-02 Data Model Extension Plan, Post-MVP Implementation Backlog v1.0

---

## 1. Purpose

This document extends the MVP audit and permission models to cover new object types introduced in post-MVP phases. It records:

- new audit object types and action names required per phase;
- new permission subjects and rules required per phase;
- field-visibility enforcement principles;
- deleted-object snapshot rules for new object types;
- audit event redaction rules for new sensitive areas.

It supplements `docs/architecture/audit-model.md` and `docs/architecture/permission-model.md`. Those documents remain authoritative for existing MVP rules. Phase tickets reference this document; they do not define audit and permission rules independently.

---

## 2. Principles Carried Forward

The following principles from the MVP audit and permission models apply unchanged to all post-MVP phases:

**Audit principles:**
- Append-only by application behaviour. No editing or deletion through the application UI or service routes.
- Same transaction where practical. Audit events and business changes commit together.
- Preserve context at time of event. Actor display names, object names, and display IDs are captured at event time, not at read time.
- Never log secrets. Passwords, tokens, API key plaintext, SAML private keys, SMTP credentials, attachment content, and similarly sensitive values must never appear in audit summaries, field changes, or `metadata_json`.
- Audit reads are permissioned. New audit routes enforce the same scope rules as MVP routes.

**Permission principles:**
- Permissions are additive. A user receives the highest effective access across all permission sources.
- Backend enforcement is authoritative. The frontend may hide UI, but every protected route must enforce permissions on the server.
- Do not reveal hidden resources. Return `404 NOT_FOUND` for inaccessible resources where revealing existence would be inappropriate.
- Permission changes take effect immediately. Evaluate from current database state.

---

## 3. Phase 1 — User Experience, Profile, Preferences (PM1)

### 3.1 New Audit Object Types

| Object type | Use for |
|---|---|
| `USER_PREFERENCE` | User preference read/write events (if audited) |

Note: preference reads are not expected to be audited. Preference updates may use the existing `USER` object type with a `USER_PREFERENCES_UPDATED` action rather than a new enum value, to minimise schema migration cost. The phase ticket (PM1-03) will confirm.

### 3.2 New Audit Actions

| Action | Scope | Notes |
|---|---|---|
| `USER_DISPLAY_NAME_UPDATED` | `SYSTEM` | Actor updated own display name. Field-change rows for before/after name. |
| `USER_PASSWORD_CHANGED` | `SYSTEM` | Actor changed own password. No field-change rows; values are secrets. |
| `USER_PREFERENCES_UPDATED` | `SYSTEM` | Actor updated own preferences. `metadata_json` may record which keys changed, not their values. |

### 3.3 Audit Redaction

- Do not record old or new password values anywhere in the audit event, field changes, or metadata.
- Do not record `colorScheme` or other preference values that could later carry sensitive semantic meaning. Record only which preference keys changed.

### 3.4 Permission Changes

No new permission subjects. All Phase 1 endpoints are self-service: authenticated users can only read/update their own profile and preferences. No role elevation is introduced.

---

## 4. Phase 2 — Person Identity Expansion (PM2)

### 4.1 New Audit Object Types

| Object type | Use for |
|---|---|
| `PERSON_REFERENCE` | Person reference record creation, update, resolution events |

### 4.2 New Audit Actions

| Action | Scope | Notes |
|---|---|---|
| `PERSON_REFERENCE_CREATED` | `SYSTEM` | New person reference record created (email-only entry). |
| `PERSON_REFERENCE_RESOLVED` | `SYSTEM` | Unresolved email reference linked to a real user account. |
| `RISK_OWNER_UNRESOLVED_SET` | `RISK` | Risk owner set to an unresolved email reference. Field-change rows. |

### 4.3 Permission Changes

Phase 2 introduces a person reference model. Key permission rules:
- Creating unresolved person references is permitted to any user who has risk edit access for the risk being updated (System Admin, Register Admin, Risk Owner for own risks).
- Person reference resolution (email-to-user linking) is a system-triggered event (on login or account creation). No user-initiated permission gate is needed.
- The `GET /api/v1/persons` lookup endpoint (PM2-01) must filter results to users the caller can legitimately see:
  - System Admins see all users.
  - Non-system-admin users see only active users (for assignment purposes); they do not receive user management data.

---

## 5. Phase 3 — Enterprise Auth and Account Recovery (PM3)

### 5.1 New Audit Object Types

| Object type | Use for |
|---|---|
| `AUTH_PROVIDER` | SAML / Entra ID provider configuration events |
| `PASSWORD_RESET` | Password reset request and completion events |
| `MFA_CONFIG` | MFA setup, verification, and recovery code events |

### 5.2 New Audit Actions

| Action | Scope | Notes |
|---|---|---|
| `SAML_PROVIDER_CREATED` | `SYSTEM` | System Admin created a SAML provider. |
| `SAML_PROVIDER_UPDATED` | `SYSTEM` | System Admin updated a SAML provider. |
| `SAML_PROVIDER_DELETED` | `SYSTEM` | System Admin deleted a SAML provider. |
| `SAML_LOGIN_SUCCEEDED` | `SYSTEM` | User authenticated via SAML. |
| `SAML_LOGIN_FAILED` | `SYSTEM` | SAML authentication attempt failed. |
| `SAML_USER_PROVISIONED` | `SYSTEM` | New user account JIT-provisioned via SAML. |
| `PASSWORD_RESET_REQUESTED` | `SYSTEM` | User requested a password reset email. Do not log the email address in summary. |
| `PASSWORD_RESET_COMPLETED` | `SYSTEM` | Password reset token consumed successfully. |
| `PASSWORD_RESET_FAILED` | `SYSTEM` | Invalid or expired token used. |
| `MFA_SETUP_COMPLETED` | `SYSTEM` | User completed MFA setup. |
| `MFA_DISABLED` | `SYSTEM` | System Admin or user disabled MFA. |
| `MFA_RECOVERY_CODES_GENERATED` | `SYSTEM` | Recovery codes regenerated. Do not log codes. |
| `MFA_VERIFICATION_FAILED` | `SYSTEM` | Failed MFA challenge attempt. |

### 5.3 Audit Redaction

- SAML private keys, certificates, and secrets must never appear in `metadata_json` or field-change rows. Only record provider name, entity ID, and status changes.
- Password reset tokens must never be logged.
- MFA recovery codes must never be logged.
- Failed login attempts with SAML: record `SAML_LOGIN_FAILED` with `metadata_json` containing the provider name and failure reason, not the raw SAML response.

### 5.4 Permission Changes

- SAML provider configuration: System Admin only.
- Password reset: public endpoint (no authentication required). Rate-limited. Always returns success to prevent email enumeration.
- MFA management: authenticated user can manage own MFA; System Admin can disable another user's MFA (audited).

---

## 6. Phase 4 — Configuration Lifecycle and Templates (PM4)

### 6.1 New Audit Object Types

| Object type | Use for |
|---|---|
| `CONFIG_VERSION` | Draft/publish configuration version events |
| `REGISTER_TEMPLATE` | Global register template management events |

### 6.2 New Audit Actions

| Action | Scope | Notes |
|---|---|---|
| `CONFIG_DRAFT_CREATED` | `REGISTER` | Draft configuration version created. |
| `CONFIG_DRAFT_UPDATED` | `REGISTER` | Draft changes made. |
| `CONFIG_PUBLISHED` | `REGISTER` | Draft promoted to published. Field-change summary rows. |
| `CONFIG_DRAFT_DISCARDED` | `REGISTER` | Draft discarded without publishing. |
| `CONFIG_IMPACT_ANALYSED` | `REGISTER` | Impact analysis run against a draft. |
| `REGISTER_CONFIG_EXPORTED` | `REGISTER` | Register config exported as JSON. |
| `REGISTER_CONFIG_IMPORTED` | `REGISTER` | Register config imported from JSON to a draft. |
| `TEMPLATE_CREATED` | `SYSTEM` | Global template created by System Admin. |
| `TEMPLATE_UPDATED` | `SYSTEM` | Global template updated. |
| `TEMPLATE_DELETED` | `SYSTEM` | Global template deleted. |
| `REGISTER_CREATED_FROM_TEMPLATE` | `SYSTEM` | Register created using a global template. |

### 6.3 Permission Changes

- Draft configuration management: System Admin and Register Admin for the relevant register.
- Publish and discard: same as draft management.
- Register template management (CRUD): System Admin only.
- Register creation from template: System Admin only (register creation remains System Admin only in post-MVP).

---

## 7. Phase 5 — Advanced Field Model (PM5)

### 7.1 New Audit Actions

No new object types required. Extend existing `CUSTOM_FIELD` object type with new actions:

| Action | Scope | Notes |
|---|---|---|
| `CUSTOM_FIELD_TYPE_MIGRATED` | `REGISTER` | Field type changed via migration. Field-change rows. |
| `CUSTOM_FIELD_VISIBILITY_UPDATED` | `REGISTER` | Field visibility rules changed. |
| `CUSTOM_FIELD_DELETED` | `REGISTER` | Field destructively deleted (after migration). |
| `VALIDATION_RULE_UPDATED` | `REGISTER` | Warn-on-save or required mode changed. |

### 7.2 Permission Changes

- Field-level visibility configuration: System Admin and Register Admin only.
- Field visibility enforcement: the backend must filter field values from risk responses based on the viewer's role when `field.visibleToRoles` is set. The MVP returns all field values regardless of role; Phase 5 introduces gated field responses. See PM5-06 for detail.
- Risk Response Owner visibility: a new visibility category (`RESPONSE_OWNER_VISIBLE`) introduced in PM5-07 gates specific fields to Risk Response Owners (Phase 7) in addition to admins.

---

## 8. Phase 6 — Advanced Scoring and Risk Methodologies (PM6)

### 8.1 New Audit Object Types

| Object type | Use for |
|---|---|
| `SCORE_FORMULA` | Custom formula definition events |
| `RISK_METHODOLOGY` | Inherent/residual risk methodology configuration events |

### 8.2 New Audit Actions

| Action | Scope | Notes |
|---|---|---|
| `SCORE_FORMULA_CREATED` | `REGISTER` | Custom score formula created. |
| `SCORE_FORMULA_UPDATED` | `REGISTER` | Custom formula updated. |
| `SCORE_FORMULA_DELETED` | `REGISTER` | Custom formula deleted or reverted to default. |
| `INHERENT_RISK_SCORED` | `RISK` | Inherent risk score recorded on a risk. |
| `RESIDUAL_RISK_SCORED` | `RISK` | Residual risk score recorded on a risk. |
| `RISK_METHODOLOGY_UPDATED` | `REGISTER` | Register scoring methodology setting changed. |
| `RISK_STATE_WORKFLOW_UPDATED` | `REGISTER` | Configurable state workflow changed. |
| `RISK_ID_FORMAT_UPDATED` | `REGISTER` | Risk ID format builder configuration changed. |

### 8.3 Permission Changes

- Custom formula management: System Admin and Register Admin only.
- Inherent/residual risk scoring: same as general risk edit access.

---

## 9. Phase 7 — Child-Record Risk Response Actions (PM7)

### 9.1 New Audit Object Types

| Object type | Use for |
|---|---|
| `RISK_ACTION` | Child-record risk response action events |

### 9.2 New Audit Actions

| Action | Scope | Notes |
|---|---|---|
| `RISK_ACTION_CREATED` | `RISK` | Response action record created. |
| `RISK_ACTION_UPDATED` | `RISK` | Response action fields updated. Field-change rows. |
| `RISK_ACTION_STATUS_CHANGED` | `RISK` | Action status changed. Field-change rows. |
| `RISK_ACTION_OWNER_CHANGED` | `RISK` | Action owner changed. Field-change rows. |
| `RISK_ACTION_LINKED` | `RISK` | Action linked to an additional risk (many-to-many). |
| `RISK_ACTION_UNLINKED` | `RISK` | Action unlinked from a risk. |
| `RISK_ACTION_DELETED` | `RISK` | Action deleted. Snapshot required (see §9.3). |
| `RISK_ACTION_ORPHANED` | `RISK` | Action became orphaned after parent risk deletion. |

### 9.3 Deleted-Object Snapshots

A new `audit_action_snapshot` table (or a `snapshot_json` column on the `RISK_ACTION_DELETED` audit event `metadata_json`) must preserve the last known state of a deleted action, mirroring the approach used for `audit_risk_snapshot` on hard-deleted risks.

The snapshot must include: action title, owner reference, status, due date, all custom field values, parent risk ID(s), and creation/modification timestamps.

### 9.4 New Permission Subject — Risk Response Owner

Phase 7 introduces a new permission subject derived from `risk_action.owner_user_id`:

| Subject | How derived |
|---|---|
| Risk Response Owner | `risk_action.owner_user_id` references the user for a specific action |

**Risk Response Owner can:**
- view the action they own;
- edit permitted fields on their action (status, notes, due date — subject to configuration);
- view the parent risk(s) they are linked to, limited to the fields designated as visible to Response Owners (PM5-07);
- see due and overdue status for their action.

**Risk Response Owner cannot:**
- view other actions in the register;
- view unassigned risks;
- configure registers;
- manage permissions;
- create or delete actions;
- view unrestricted risk detail beyond the parent-risk limited context.

The backend must apply parent-risk limited context: a Risk Response Owner's view of a parent risk is restricted to fields where `field.visibleToResponseOwner = true`.

**Audit access for Risk Response Owners:**
- Risk Response Owners may view audit events for their own actions.
- They must not access register-level or system-level audit logs.

---

## 10. Phase 8 — Risk Response Reviews and Advanced Review Rules (PM8)

### 10.1 New Audit Actions

Extend existing `RISK_REVIEW` object type with new actions:

| Action | Scope | Notes |
|---|---|---|
| `REVIEW_FREQUENCY_RULE_UPDATED` | `REGISTER` | Field-based review frequency rule changed. |
| `REVIEW_COMMENT_MODE_UPDATED` | `REGISTER` | Review comment mode (disabled/optional/mandatory) changed. |
| `RISK_ACTION_REVIEWED` | `RISK` | Response action review completed. |
| `RISK_REVIEWED_WITH_OUTCOME` | `RISK` | Review completed with an explicit outcome/status. |
| `ATTESTATION_VERSION_CREATED` | `RISK` | New attestation version created at review time. |

---

## 11. Phase 9 — Notifications and SMTP (PM9)

### 11.1 New Audit Object Types

| Object type | Use for |
|---|---|
| `NOTIFICATION` | In-app notification delivery events |
| `SMTP_CONFIG` | SMTP configuration management events |
| `NOTIFICATION_RULE` | Notification rule creation and change events |

### 11.2 New Audit Actions

| Action | Scope | Notes |
|---|---|---|
| `NOTIFICATION_SENT` | `SYSTEM` | In-app or email notification delivered. `metadata_json` records recipient and notification type, not message body. |
| `NOTIFICATION_DISMISSED` | `SYSTEM` | User dismissed a notification. |
| `SMTP_CONFIG_UPDATED` | `SYSTEM` | System Admin updated SMTP settings. Do not log credentials. |
| `SMTP_CONFIG_TESTED` | `SYSTEM` | SMTP connection test triggered. |
| `NOTIFICATION_RULE_CREATED` | `REGISTER` | Notification reminder rule created. |
| `NOTIFICATION_RULE_UPDATED` | `REGISTER` | Notification reminder rule updated. |
| `NOTIFICATION_RULE_DELETED` | `REGISTER` | Notification reminder rule deleted. |
| `ESCALATION_TRIGGERED` | `RISK` | Escalation notification sent after overdue threshold. |

### 11.3 Audit Redaction

- SMTP credentials (username, password, server) must never appear in `metadata_json` or field-change rows.
- Record only: SMTP server hostname, port, and TLS setting changes. Do not record credential values.
- Notification message body must not be stored in audit events. Record recipient, notification type, and delivery outcome only.

### 11.4 Permission Changes

- SMTP configuration: System Admin only.
- Notification rule management: System Admin and Register Admin for register-scoped rules.
- In-app notification delivery and dismissal: self-service (authenticated users interact with their own notifications only).

---

## 12. Phase 10 — Import, Export, and Data Portability (PM10)

### 12.1 New Audit Object Types

| Object type | Use for |
|---|---|
| `IMPORT_JOB` | CSV import job lifecycle events |

### 12.2 New Audit Actions

| Action | Scope | Notes |
|---|---|---|
| `IMPORT_STARTED` | `REGISTER` | CSV import job initiated. |
| `IMPORT_VALIDATED` | `REGISTER` | Import passed validation check. |
| `IMPORT_VALIDATION_FAILED` | `REGISTER` | Import failed validation; no data changed. |
| `IMPORT_COMMITTED` | `REGISTER` | Import committed. `metadata_json` includes row count. |
| `IMPORT_ROLLED_BACK` | `REGISTER` | Import transaction rolled back. |
| `AUDIT_LOG_EXPORTED` | `SYSTEM` | Audit log exported as CSV (PM10-10). |
| `RISK_IMPORT_ID_PRESERVED` | `RISK` | Risk ID preserved from import source (PM10-05). |

### 12.3 Permission Changes

- CSV import: System Admin and Register Admin for the target register.
- Audit log CSV export: System Admin only (PM10-10).

---

## 13. Phase 12 — Attachments and Evidence (PM12)

### 13.1 New Audit Object Types

| Object type | Use for |
|---|---|
| `ATTACHMENT` | File attachment upload, view, and delete events |

### 13.2 New Audit Actions

| Action | Scope | Notes |
|---|---|---|
| `ATTACHMENT_UPLOADED` | `RISK` | File attached to a risk or action. `metadata_json` records filename, MIME type, size. |
| `ATTACHMENT_DOWNLOADED` | `RISK` | Attachment accessed. |
| `ATTACHMENT_DELETED` | `RISK` | Attachment deleted. Snapshot required (see §13.3). |
| `ATTACHMENT_SCAN_PASSED` | `RISK` | Malware/content scan passed (if scan implemented). |
| `ATTACHMENT_SCAN_FAILED` | `RISK` | Attachment rejected by scan. |

### 13.3 Deleted-Object Snapshots

On attachment deletion, the audit event `metadata_json` must preserve: filename, MIME type, file size, uploader, upload timestamp, and associated risk/action IDs. File content is not stored in audit events.

### 13.4 Audit Redaction

File content must never appear in audit events or `metadata_json`. Record only metadata.

### 13.5 Permission Changes

- Attachment upload and delete: inherits parent risk edit access (System Admin, Register Admin, Risk Owner for own risks).
- Attachment view: inherits parent risk view access.
- Field visibility rules (Phase 5) may gate attachment fields from Register Viewers or Response Owners.

---

## 14. Phase 13 — APIs, Webhooks, and Integration Admin (PM13)

### 14.1 New Audit Object Types

| Object type | Use for |
|---|---|
| `API_KEY` | API key management events |
| `WEBHOOK` | Webhook configuration and delivery events |

### 14.2 New Audit Actions

| Action | Scope | Notes |
|---|---|---|
| `API_KEY_CREATED` | `SYSTEM` | API key created. Record key prefix (e.g. `cr_abc...`) and name. Never log the plaintext key. |
| `API_KEY_REVOKED` | `SYSTEM` | API key revoked. |
| `API_KEY_USED` | `SYSTEM` | API key used for an authenticated request. Optionally sampled to avoid high-volume noise. |
| `WEBHOOK_CREATED` | `SYSTEM` | Webhook endpoint created. |
| `WEBHOOK_UPDATED` | `SYSTEM` | Webhook endpoint updated. Do not log the signing secret. |
| `WEBHOOK_DELETED` | `SYSTEM` | Webhook endpoint deleted. |
| `WEBHOOK_DELIVERED` | `SYSTEM` | Event successfully delivered to webhook endpoint. |
| `WEBHOOK_DELIVERY_FAILED` | `SYSTEM` | Webhook delivery failed. Record endpoint URL and HTTP status, not payload body. |

### 14.3 Audit Redaction

- API key plaintext must never be logged. Record only the key prefix and display name.
- Webhook signing secret must never be logged. Record only endpoint URL and configuration state changes.
- Webhook payload body must not be stored in audit events.

### 14.4 Permission Changes

- API key management: System Admin only.
- Webhook management: System Admin only.
- API key authentication: an authenticated API key session follows the same role model as a user session. The key carries the permissions of the user it is associated with. Future: scoped keys (Phase 13 decision).

---

## 15. Field-Visibility Enforcement Principles

These principles apply from Phase 5 onwards when field-level visibility is implemented (PM5-06, PM5-07):

1. **Backend enforcement only.** Field visibility must be enforced in the API response, not by the frontend alone.
2. **Additive model.** A field is returned to any actor who meets at least one visibility condition (e.g. `visibleToAdmin`, `visibleToOwner`, `visibleToViewer`, `visibleToResponseOwner`).
3. **Write permission is separate from visibility.** A field may be visible to a role but not editable. The service layer enforces both independently.
4. **Hidden fields are omitted, not nulled.** When a field is not visible to the actor, it is omitted from the response entirely — not returned as `null`. This prevents the frontend from distinguishing between "no value" and "no permission."
5. **Audit of visibility changes.** Changes to visibility configuration are audited under `CUSTOM_FIELD_VISIBILITY_UPDATED`.

---

## 16. Document References

| Document | Location |
|---|---|
| Audit Model v1.0 | `docs/architecture/audit-model.md` |
| Permission Model v1.0 | `docs/architecture/permission-model.md` |
| Post-MVP Scope Baseline v1.0 | `docs/planning/PM0-01-scope-baseline.md` |
| Post-MVP Data Model Extension Plan v1.0 | `docs/planning/PM0-02-data-model-extension.md` |
| API Versioning and Compatibility Review v1.0 | `docs/planning/PM0-03-api-versioning-compatibility.md` |
| Post-MVP Implementation Backlog v1.0 | `docs/planning/post-mvp-backlog.md` |
