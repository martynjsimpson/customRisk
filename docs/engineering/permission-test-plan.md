# Permission Test Plan

**Version:** 1.0  
**Date:** 2026-06-21  
**Scope:** All role/entity permission permutations for customRisk  
**Audience:** Human tester — no code access required  

---

## How to Use This Document

Each section contains a checklist of test cases. For every row:

1. Log in as the described persona (or switch to a user who holds that role).
2. Attempt the described action in the UI or via the stated route.
3. Mark **PASS** if the outcome matches the Expected Result column.
4. Mark **FAIL** if it does not, and note what actually happened.

### Role Glossary

| Role | How it is assigned |
|---|---|
| **System Admin** | Set on the user account at system level (Admin > Users > Edit User > System Admin toggle) |
| **Register Admin** | Assigned to a user on a specific register (Register > Permissions tab) |
| **Register Editor** | Not a named role in the current permission model. Register Admin is the lowest named explicit register role. This column is included for completeness and maps to scenarios where no explicit register role exists but ownership roles apply. |
| **Register Viewer** | Assigned to a user on a specific register (Register > Permissions tab, role = Viewer) |
| **Risk Owner** | Derived automatically: a user whose email appears in the Risk Owner field of a risk in a register. No explicit assignment required. |
| **Risk Response Owner** | Derived automatically: a user whose email appears in the Risk Response Owner field of a response action linked to a risk. |

### Permission Precedence

Permissions are additive. A user with multiple roles receives the highest permission from any of their roles. For example, a user who is both a Register Viewer on Register A and the Risk Owner of a risk in Register A has Risk Owner permissions on that register (which is higher than Viewer). When testing, ensure the test account holds **only** the intended role and no higher role in the same register.

### Denial Behaviour

When access is denied, the system returns a **404 Not Found** (not 403 Forbidden) to avoid leaking information about resource existence. In the UI this typically appears as "Not found" or a blank/redirected page.

---

## Section 1 — Register CRUD

Registers are the top-level containers. Only System Admins can create or hard-delete registers. Register Admins can update a specific register's settings.

| # | Persona | Action | Expected Result | Pass/Fail |
|---|---|---|---|---|
| 1.1 | System Admin | Navigate to Registers list | Sees all registers in the system | |
| 1.2 | System Admin | Create a new register | Register is created successfully | |
| 1.3 | System Admin | Edit register name/description | Change is saved successfully | |
| 1.4 | System Admin | Delete (hard delete) a register | Register is deleted; a confirmation prompt is shown first | |
| 1.5 | Register Admin (Register A) | Navigate to Registers list | Sees Register A (and any other registers they have access to) | |
| 1.6 | Register Admin (Register A) | Edit register name/description for Register A | Change is saved successfully | |
| 1.7 | Register Admin (Register A) | Attempt to create a new register | Action is not available (no Create button, or request is denied) | |
| 1.8 | Register Admin (Register A) | Attempt to delete Register A | Action is not available (no Delete option, or request is denied) | |
| 1.9 | Register Admin (Register A) | Attempt to view or edit Register B (no access) | Register B does not appear, or returns not found | |
| 1.10 | Register Viewer (Register A) | Navigate to Registers list | Sees Register A | |
| 1.11 | Register Viewer (Register A) | Attempt to edit register name for Register A | Edit controls are not available, or save is denied | |
| 1.12 | Register Viewer (Register A) | Attempt to create a register | Action is not available | |
| 1.13 | Risk Owner (risk in Register A, no explicit register role) | Navigate to Registers list | Sees Register A | |
| 1.14 | Risk Owner (risk in Register A) | Attempt to edit register name for Register A | Edit controls are not available, or save is denied | |
| 1.15 | Risk Response Owner (action in Register A, no other role) | Navigate to Registers list | Sees Register A | |
| 1.16 | Risk Response Owner (action in Register A) | Attempt to edit register name for Register A | Edit controls are not available, or save is denied | |
| 1.17 | Authenticated user with no role in any register | Navigate to Registers list | Sees no registers | |

---

## Section 2 — Risk CRUD

Risks are records within a register. Risk creation is permitted by anyone with register access (view or higher). Editing requires being the Risk Owner or having Register Admin / System Admin. Deletion (hard delete) is restricted to System Admin only.

| # | Persona | Action | Expected Result | Pass/Fail |
|---|---|---|---|---|
| 2.1 | System Admin | View risk list for Register A | All risks displayed | |
| 2.2 | System Admin | Open a risk detail page | Risk detail is shown in full | |
| 2.3 | System Admin | Create a risk in Register A | Risk is created successfully | |
| 2.4 | System Admin | Edit any risk in Register A | Changes are saved successfully | |
| 2.5 | System Admin | Hard delete a risk in Register A | Risk is deleted; system prompts for confirmation and records audit entry | |
| 2.6 | Register Admin (Register A) | View risk list for Register A | All risks displayed | |
| 2.7 | Register Admin (Register A) | Create a risk | Risk is created successfully | |
| 2.8 | Register Admin (Register A) | Edit any risk (not owned by them) | Changes are saved successfully | |
| 2.9 | Register Admin (Register A) | Attempt to hard delete a risk | Delete option is not available, or request is denied | |
| 2.10 | Register Viewer (Register A) | View risk list | All risks displayed (read-only) | |
| 2.11 | Register Viewer (Register A) | Open a risk detail page | Risk detail is shown | |
| 2.12 | Register Viewer (Register A) | Attempt to create a risk | Create button is not available, or request is denied | |
| 2.13 | Register Viewer (Register A) | Attempt to edit a risk | Edit controls are not available, or save is denied | |
| 2.14 | Risk Owner (owns Risk X in Register A) | View risk list | Sees risks in Register A (at minimum Risk X) | |
| 2.15 | Risk Owner (owns Risk X) | Open Risk X detail page | Risk detail is shown | |
| 2.16 | Risk Owner (owns Risk X) | Edit normal fields on Risk X | Changes are saved successfully | |
| 2.17 | Risk Owner (owns Risk X) | Attempt to edit a risk they do not own (Risk Y) | Edit controls are not available, or save is denied | |
| 2.18 | Risk Owner (owns Risk X) | Attempt to hard delete Risk X | Delete option is not available, or request is denied | |
| 2.19 | Risk Owner (owns Risk X) | Attempt to edit a calculated field on Risk X | Field is not editable (read-only) | |
| 2.20 | Risk Response Owner (owns action linked to Risk X, no other role) | Attempt to view Risk X | Risk is visible (limited context; see Section 5) | |
| 2.21 | Risk Response Owner (no other role) | Attempt to view a risk they have no linked action on | Risk is not visible (returns not found) | |
| 2.22 | Risk Response Owner (no other role) | Attempt to edit any risk | Edit controls are not available, or save is denied | |
| 2.23 | Risk Response Owner (no other role) | Attempt to create a risk | Create button not available, or request is denied | |
| 2.24 | Authenticated user with no role in Register A | Attempt to view Register A risks | Register and risks are not visible | |

---

## Section 3 — Risk Response Action CRUD (Child Record Mode)

Response actions are child records linked to risks within a register. These test cases apply only when the register is configured in **child record mode**. In simple field mode, the response text is just a field on the risk and editing it is covered by Section 2.

| # | Persona | Action | Expected Result | Pass/Fail |
|---|---|---|---|---|
| 3.1 | System Admin | View response actions for a risk | All actions displayed | |
| 3.2 | System Admin | Create a response action on Risk X | Action is created successfully | |
| 3.3 | System Admin | Edit any response action | Changes are saved successfully | |
| 3.4 | System Admin | Delete a response action | Action is deleted; orphan handling prompt shown if it is the action's only linked risk | |
| 3.5 | Register Admin (Register A) | View response actions for a risk | All actions displayed | |
| 3.6 | Register Admin (Register A) | Create a response action on a risk they do not own | Action is created successfully | |
| 3.7 | Register Admin (Register A) | Edit any response action | Changes are saved successfully | |
| 3.8 | Register Admin (Register A) | Delete a response action | Action is deleted | |
| 3.9 | Register Viewer (Register A) | View response actions for a risk | Actions are displayed (read-only) | |
| 3.10 | Register Viewer (Register A) | Attempt to create a response action | Create option not available, or request is denied | |
| 3.11 | Register Viewer (Register A) | Attempt to edit a response action | Edit controls not available, or save is denied | |
| 3.12 | Register Viewer (Register A) | Attempt to delete a response action | Delete option not available, or request is denied | |
| 3.13 | Risk Owner (owns Risk X) | View response actions linked to Risk X | Actions are displayed | |
| 3.14 | Risk Owner (owns Risk X) | Create a new response action on Risk X | Action is created successfully | |
| 3.15 | Risk Owner (owns Risk X) | Edit a response action linked to Risk X | Changes are saved successfully | |
| 3.16 | Risk Owner (owns Risk X) | Attempt to delete a response action | Delete is denied (System Admin and Register Admin only can delete) | |
| 3.17 | Risk Owner (owns Risk X) | Attempt to create/view actions on Risk Y (not owned) | Action is denied; Risk Y is not editable | |
| 3.18 | Risk Response Owner (owns Action A, linked to Risk X) | View Action A | Action A is displayed | |
| 3.19 | Risk Response Owner (owns Action A) | Edit Action A (e.g. update status, response text) | Changes are saved successfully | |
| 3.20 | Risk Response Owner (owns Action A) | Attempt to delete Action A | Delete is denied | |
| 3.21 | Risk Response Owner (owns Action A) | Attempt to edit an action they do not own | Edit is denied | |
| 3.22 | Risk Response Owner (owns Action A) | Attempt to create a new response action | Create is denied (requires Risk Owner or higher) | |
| 3.23 | Authenticated user with no register role | Attempt to view actions in Register A | Actions are not visible | |

---

## Section 4 — Response Action Ownership and Review

| # | Persona | Action | Expected Result | Pass/Fail |
|---|---|---|---|---|
| 4.1 | Risk Response Owner (owns Action A) | Submit a review on Action A (where reviews enabled) | Review is recorded; next review date is recalculated | |
| 4.2 | Risk Response Owner (owns Action A) | Attempt to review an action they do not own | Review is denied | |
| 4.3 | Risk Owner (owns Risk X, Action A linked to Risk X) | Submit a review on Action A (where reviews enabled) | Review is recorded successfully | |
| 4.4 | Register Admin (Register A) | Submit a review on any action in Register A | Review is recorded successfully | |
| 4.5 | Register Viewer (Register A) | Attempt to submit a review on an action | Review is denied (read-only) | |
| 4.6 | System Admin | Submit a review on any action | Review is recorded successfully | |

---

## Section 5 — Custom Field Visibility (Risk Response Owner)

When a register has custom fields configured, each field has a setting "Visible to Risk Response Owners: Yes/No". This controls what a Risk Response Owner can see on the parent risk when they access it via their linked action.

| # | Persona | Setup | Action | Expected Result | Pass/Fail |
|---|---|---|---|---|---|
| 5.1 | Risk Response Owner (owns Action A linked to Risk X) | Custom Field F1 is marked "Visible to Risk Response Owners: Yes" | View Risk X detail page | Field F1 value is visible | |
| 5.2 | Risk Response Owner (owns Action A linked to Risk X) | Custom Field F2 is marked "Visible to Risk Response Owners: No" | View Risk X detail page | Field F2 is hidden (not shown at all, or shown as restricted) | |
| 5.3 | Risk Response Owner | Same field visibility rules | View a risk listing/table that includes Risk X | F1 appears in table; F2 does not | |
| 5.4 | Risk Response Owner | Same field visibility rules | Export risks (if export available to this role) | F1 appears in export; F2 does not | |
| 5.5 | Register Viewer (Register A) | Custom Field F2 "Visible to Risk Response Owners: No" | View Risk X detail page | F2 is visible (this restriction applies only to Risk Response Owners, not Viewers) | |
| 5.6 | Risk Owner (owns Risk X) | Custom Field F2 "Visible to Risk Response Owners: No" | View Risk X detail page | F2 is visible (restriction does not apply to Risk Owners) | |

---

## Section 6 — Risk Review Actions

Reviews are enabled or disabled per register (configuration setting). When enabled, users who can edit the risk can trigger a review.

| # | Persona | Action | Expected Result | Pass/Fail |
|---|---|---|---|---|
| 6.1 | Risk Owner (owns Risk X, reviews enabled) | Click "Review Risk" on Risk X | Review flow is presented; attestation text shown; review is recorded with timestamp and reviewer | |
| 6.2 | Risk Owner (owns Risk X) | Attempt to review a risk they do not own | "Review Risk" button is not available, or request is denied | |
| 6.3 | Register Admin (Register A) | Review any risk in Register A | Review is recorded successfully | |
| 6.4 | Register Viewer (Register A) | Attempt to review any risk | Review button is not shown, or request is denied | |
| 6.5 | Risk Response Owner (no other role) | Attempt to review a risk they have a linked action on | Review button is not shown, or request is denied | |
| 6.6 | System Admin | Review any risk in any register | Review is recorded successfully | |
| 6.7 | Any role | Attempt to review a risk when reviews are disabled on the register | Review button is not shown; action is not available | |
| 6.8 | Risk Owner (owns Risk X) | View review history for Risk X | Review history is visible | |
| 6.9 | Register Viewer (Register A) | View review history for a risk in Register A | Review history is visible (read-only) | |

---

## Section 7 — Configuration Tab Access

The Configuration tab (register-level) covers fields, custom fields, likelihood/impact, scoring formula, risk matrix, risk levels, review settings, notification settings, response action mode, and validation rules.

| # | Persona | Action | Expected Result | Pass/Fail |
|---|---|---|---|---|
| 7.1 | System Admin | Access the Configuration tab for Register A | All configuration sections are visible and editable | |
| 7.2 | Register Admin (Register A) | Access the Configuration tab for Register A | All configuration sections are visible and editable | |
| 7.3 | Register Admin (Register A) | Attempt to access the Configuration tab for Register B (no access) | Tab is not accessible / request is denied | |
| 7.4 | Register Viewer (Register A) | Attempt to access the Configuration tab for Register A | Tab is not shown, or request is denied (read-only users cannot configure) | |
| 7.5 | Risk Owner (no explicit register role) | Attempt to access the Configuration tab | Tab is not shown, or request is denied | |
| 7.6 | Risk Response Owner (no other role) | Attempt to access the Configuration tab | Tab is not shown, or request is denied | |
| 7.7 | Register Admin (Register A) | Create a custom field | Custom field is created and appears in risk forms | |
| 7.8 | Register Admin (Register A) | Deactivate a custom field that has existing data | Field is deactivated (soft delete); existing data retained | |
| 7.9 | System Admin | Hard delete a custom field | Field is permanently deleted; confirmation required | |
| 7.10 | Register Admin (Register A) | Attempt to hard delete a custom field | Delete option is not available, or request is denied (System Admin only) | |
| 7.11 | Register Admin (Register A) | Modify likelihood/impact values | Changes are saved | |
| 7.12 | Register Admin (Register A) | Update the risk scoring formula | Changes are saved | |
| 7.13 | Register Admin (Register A) | Update the risk matrix | Changes are saved | |
| 7.14 | Register Admin (Register A) | Enable or disable review settings | Changes are saved | |
| 7.15 | Register Admin (Register A) | Switch response action mode (simple to child record or vice versa) | Migration/confirmation flow is presented; changes are applied | |

---

## Section 8 — Permissions Tab Access

The Permissions tab (register-level) allows adding and removing Register Admin and Register Viewer assignments for a register.

| # | Persona | Action | Expected Result | Pass/Fail |
|---|---|---|---|---|
| 8.1 | System Admin | View Permissions tab for Register A | All current permissions shown; ability to add/remove | |
| 8.2 | System Admin | Add a user as Register Viewer for Register A | Permission is added; user now has Viewer access | |
| 8.3 | System Admin | Remove a Register Admin from Register A | Permission is removed (unless they are the last Register Admin; if so, confirmation/block required) | |
| 8.4 | Register Admin (Register A) | View Permissions tab for Register A | All current permissions shown; ability to add/remove | |
| 8.5 | Register Admin (Register A) | Add a user as Register Viewer for Register A | Permission is added successfully | |
| 8.6 | Register Admin (Register A) | Attempt to grant System Admin rights to any user | Option is not available (Register Admins cannot assign System Admin) | |
| 8.7 | Register Admin (Register A) | Remove themselves as Register Admin (they are the last admin) | System prevents the removal, or requires System Admin confirmation | |
| 8.8 | Register Viewer (Register A) | Attempt to access Permissions tab | Tab is not shown, or request is denied | |
| 8.9 | Risk Owner (no explicit register role) | Attempt to access Permissions tab | Tab is not shown, or request is denied | |
| 8.10 | Risk Response Owner (no other role) | Attempt to access Permissions tab | Tab is not shown, or request is denied | |

---

## Section 9 — Export Controls

Exports are CSV downloads of risk data. System Admins and Register Admins can always export. Register Viewers can export only if the register setting **Allow Viewer Export** is enabled. Risk Owners and Risk Response Owners cannot export unless they also hold a qualifying explicit register role.

| # | Persona | Register Setting | Action | Expected Result | Pass/Fail |
|---|---|---|---|---|---|
| 9.1 | System Admin | Any | Export risks from Register A | Export file is downloaded | |
| 9.2 | Register Admin (Register A) | Any | Export risks from Register A | Export file is downloaded | |
| 9.3 | Register Viewer (Register A) | Allow Viewer Export = Yes | Export risks from Register A | Export file is downloaded | |
| 9.4 | Register Viewer (Register A) | Allow Viewer Export = No | Attempt to export risks from Register A | Export button is not shown, or request is denied | |
| 9.5 | Risk Owner (no explicit register role) | Any | Attempt to export risks | Export button is not shown, or request is denied | |
| 9.6 | Risk Response Owner (no other role) | Any | Attempt to export risks | Export button is not shown, or request is denied | |
| 9.7 | Register Viewer (Register A) | Allow Viewer Export = Yes | Export — check that fields marked "Visible to Risk Response Owners: No" are still hidden from a Viewer export | Note: the field visibility rule is specific to Risk Response Owners. Viewers should see non-administrative fields. Confirm all non-restricted fields appear in the export | |

---

## Section 10 — Register Audit Log Access

The register-level audit log captures configuration changes, risk hard deletions, permission changes, and other register-scoped events.

| # | Persona | Action | Expected Result | Pass/Fail |
|---|---|---|---|---|
| 10.1 | System Admin | View audit log for Register A | Full audit log is shown | |
| 10.2 | System Admin | Export register audit log | Export file is downloaded | |
| 10.3 | Register Admin (Register A) | View audit log for Register A | Full audit log is shown | |
| 10.4 | Register Admin (Register A) | Export register audit log | Export file is downloaded | |
| 10.5 | Register Viewer (Register A) | Attempt to view register audit log | Audit log is not accessible | |
| 10.6 | Risk Owner (no explicit register role) | Attempt to view register audit log | Audit log is not accessible | |
| 10.7 | Risk Response Owner (no other role) | Attempt to view register audit log | Audit log is not accessible | |
| 10.8 | Register Admin (Register A) | Attempt to view audit log for Register B (no access) | Audit log is not accessible | |

---

## Section 11 — Risk Audit Log Access

The risk-level audit log captures field changes, review events, state changes, and linked action changes for a specific risk.

| # | Persona | Action | Expected Result | Pass/Fail |
|---|---|---|---|---|
| 11.1 | System Admin | View audit log for Risk X | Full audit history shown | |
| 11.2 | Register Admin (Register A) | View audit log for Risk X in Register A | Full audit history shown | |
| 11.3 | Register Viewer (Register A) | View audit log for Risk X | Audit history shown (Viewers can read risk detail, which includes history) | |
| 11.4 | Risk Owner (owns Risk X) | View audit log for Risk X | Audit history shown | |
| 11.5 | Risk Response Owner (owns action linked to Risk X) | View audit log for Risk X | Audit history shown (they can view Risk X context) | |
| 11.6 | Risk Owner (owns Risk X) | Attempt to view audit log for Risk Y (not owned) | Audit log for Risk Y is not accessible | |

---

## Section 12 — System Audit Log Access

The system-level audit log captures user management, authentication, SMTP settings, global templates, and system-wide changes. This is accessible to System Admins only.

| # | Persona | Action | Expected Result | Pass/Fail |
|---|---|---|---|---|
| 12.1 | System Admin | Navigate to Admin > System Audit Log | Audit log is shown with filtering and search | |
| 12.2 | System Admin | Export system audit log | Export file is downloaded | |
| 12.3 | Register Admin (Register A, not a System Admin) | Attempt to navigate to Admin > System Audit Log | Section is not accessible (404 or no navigation item) | |
| 12.4 | Register Viewer | Attempt to navigate to Admin > System Audit Log | Section is not accessible | |
| 12.5 | Risk Owner (no system role) | Attempt to navigate to Admin > System Audit Log | Section is not accessible | |

---

## Section 13 — User Management

User management (creating users, editing user profiles, setting System Admin status, resetting passwords, managing SAML) is restricted to System Admins, with the exception that any authenticated user can edit their own profile.

| # | Persona | Action | Expected Result | Pass/Fail |
|---|---|---|---|---|
| 13.1 | System Admin | Navigate to Admin > Users | User list is shown | |
| 13.2 | System Admin | Create a new user | User is created | |
| 13.3 | System Admin | Edit another user's name/email | Change is saved | |
| 13.4 | System Admin | Toggle System Admin on/off for another user | Change is saved | |
| 13.5 | System Admin | Reset another user's password | Password reset is triggered | |
| 13.6 | System Admin | Deactivate/disable a user account | User is deactivated | |
| 13.7 | Register Admin (not System Admin) | Attempt to navigate to Admin > Users | Section is not accessible | |
| 13.8 | Register Admin (not System Admin) | Attempt to create or edit a user via the API | Request is denied | |
| 13.9 | Register Viewer | Attempt to navigate to Admin > Users | Section is not accessible | |
| 13.10 | Any authenticated user | Edit their own profile (name, display preferences) | Change is saved | |
| 13.11 | Any authenticated user (non-System Admin) | Attempt to change their own System Admin status | Option is not available | |
| 13.12 | System Admin | Configure SAML authentication settings | Settings are saved | |
| 13.13 | Register Admin (not System Admin) | Attempt to access SAML configuration | Section is not accessible | |

---

## Section 14 — Template Management

Templates are global reusable register configurations. Only System Admins can manage global templates. Register Admins can apply a template when creating a register, and can export/import configuration within registers they administer.

| # | Persona | Action | Expected Result | Pass/Fail |
|---|---|---|---|---|
| 14.1 | System Admin | Navigate to Admin > Templates | Template list is shown | |
| 14.2 | System Admin | Create a new global template | Template is created | |
| 14.3 | System Admin | Edit a global template | Changes are saved | |
| 14.4 | System Admin | Publish a new template version | Version is published | |
| 14.5 | System Admin | Apply a template version to a register | Register configuration is updated | |
| 14.6 | Register Admin (not System Admin) | Attempt to navigate to Admin > Templates | Section is not accessible | |
| 14.7 | Register Admin (Register A) | Export register configuration (JSON) for Register A | Configuration file is downloaded | |
| 14.8 | Register Admin (Register A) | Import register configuration (JSON) for Register A | Configuration is applied | |
| 14.9 | Register Admin (Register A) | Attempt to export/import configuration for Register B (no access) | Request is denied | |
| 14.10 | Register Viewer | Attempt to export register configuration | Request is denied | |

---

## Section 15 — API Key Management

API keys allow programmatic access. System Admins can view and revoke all API keys. Any authenticated user can manage their own API keys (create and revoke their own).

| # | Persona | Action | Expected Result | Pass/Fail |
|---|---|---|---|---|
| 15.1 | System Admin | Navigate to Admin > API Keys | List of all system API keys is shown | |
| 15.2 | System Admin | Revoke another user's API key | Key is revoked | |
| 15.3 | Register Admin (not System Admin) | Attempt to navigate to Admin > API Keys | Section is not accessible | |
| 15.4 | Any authenticated user | Navigate to their own profile/settings and create a personal API key | Key is created; secret shown once | |
| 15.5 | Any authenticated user | Revoke their own API key | Key is revoked | |
| 15.6 | Any authenticated user (non-System Admin) | Attempt to view or revoke another user's API key via the API | Request is denied | |

---

## Section 16 — Dashboard and Home Page

The home dashboard is role-aware. This section checks that each role sees appropriate content and cannot access content from registers they have no role in.

| # | Persona | Expected Dashboard Content | Pass/Fail |
|---|---|---|---|
| 16.1 | System Admin | System-wide overview: all registers, user count, recent audit activity, system health indicators | |
| 16.2 | Register Admin (Register A) | Summary for Register A: overdue reviews, unassigned risks, validation issues | |
| 16.3 | Register Viewer (Register A) | Read-only summary for Register A: risk counts, levels | |
| 16.4 | Risk Owner (risks in Register A) | Owned risks, due reviews, overdue indicators for their risks | |
| 16.5 | Risk Response Owner (actions in Register A) | Owned actions, due dates, overdue indicators for their actions | |
| 16.6 | Any role | Dashboard does not display data from registers the user has no access to | |

---

## Section 17 — My Actions / Risk Responses View

The My Actions screen shows response actions scoped to what each user can see.

| # | Persona | Action | Expected Result | Pass/Fail |
|---|---|---|---|---|
| 17.1 | System Admin | View My Actions / Risk Responses screen | Actions across all registers are visible | |
| 17.2 | Register Admin (Register A) | View My Actions / Risk Responses screen | Actions for Register A are visible | |
| 17.3 | Register Viewer (Register A) | View My Actions / Risk Responses screen | Actions for Register A are visible (read-only) | |
| 17.4 | Risk Response Owner (owns Action A in Register A) | View My Actions screen | Action A is shown | |
| 17.5 | Risk Response Owner (owns Action A) | Actions from registers where they have no role | Not shown | |
| 17.6 | Risk Owner (owns Risk X, linked to Action A) | View My Actions screen | Action A is visible (they can see actions linked to their risks) | |

---

## Section 18 — Risk State and Created Date Override

Risk state (Draft/Open/Closed) and Created Date have specific permission rules around who can override them.

| # | Persona | Action | Expected Result | Pass/Fail |
|---|---|---|---|---|
| 18.1 | System Admin | Override Created Date on any risk | Override is accepted | |
| 18.2 | Register Admin (Register A) | Override Created Date on a risk in Register A | Override is accepted | |
| 18.3 | Risk Owner (owns Risk X) | Override Created Date on Risk X — register setting "Allow Risk Owner Created Date Override = No" | Override field is not available or save is denied | |
| 18.4 | Risk Owner (owns Risk X) | Override Created Date on Risk X — register setting "Allow Risk Owner Created Date Override = Yes" | Override is accepted | |
| 18.5 | Register Viewer (Register A) | Attempt to change Created Date | Not available (read-only) | |
| 18.6 | System Admin | Change risk state to Closed | State change is saved | |
| 18.7 | Register Admin (Register A) | Change risk state | State change is saved | |
| 18.8 | Risk Owner (owns Risk X) | Change state of Risk X | State change is saved (Risk Owners can edit normal fields; state is a normal field) | |
| 18.9 | Register Viewer | Attempt to change risk state | Not available (read-only) | |

---

## Section 19 — Unauthenticated Access

All routes require authentication. Unauthenticated requests must be rejected.

| # | Action | Expected Result | Pass/Fail |
|---|---|---|---|
| 19.1 | Attempt to access any page without logging in | Redirected to login page | |
| 19.2 | Attempt to call any API endpoint without a session or API key | 401 Unauthorized response | |
| 19.3 | Attempt to call an API endpoint with an invalid or expired API key | 401 Unauthorized response | |

---

## Test Environment Setup Notes

- Create at least **two separate test registers** (Register A and Register B) to verify cross-register isolation.
- Create **one test user per role** and ensure each test account holds only the intended role. Verify via Admin > Users and the register Permissions tab before testing.
- For Risk Owner and Risk Response Owner tests, set the relevant email addresses on risks and actions before starting.
- Enable **child record mode** on at least one test register before running Section 3 tests.
- Enable **reviews** on at least one test register before running Sections 6 and 4.
- Test both states of **Allow Viewer Export** before running Section 9.
- Test both states of **Allow Risk Owner Created Date Override** before running Section 18.

---

## Coverage Matrix

The table below summarises which permission levels are verified for each domain area.

| Domain | Sys Admin | Reg Admin | Reg Viewer | Risk Owner | Response Owner | No Access |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Register CRUD | Y | Y | Y | Y | Y | Y |
| Risk CRUD | Y | Y | Y | Y | Y | Y |
| Response Action CRUD | Y | Y | Y | Y | Y | Y |
| Response Action Review | Y | Y | Y | Y | Y | — |
| Custom Field Visibility | — | — | Y | Y | Y | — |
| Risk Review | Y | Y | Y | Y | Y | — |
| Configuration Tab | Y | Y | Y | Y | Y | — |
| Permissions Tab | Y | Y | Y | Y | Y | — |
| Export Controls | Y | Y | Y | Y | Y | — |
| Register Audit Log | Y | Y | Y | Y | Y | — |
| Risk Audit Log | Y | Y | Y | Y | Y | — |
| System Audit Log | Y | Y | Y | Y | Y | — |
| User Management | Y | Y | Y | — | — | — |
| Template Management | Y | Y | — | — | — | — |
| API Key Management | Y | Y | Y | Y | Y | — |
| Dashboard | Y | Y | Y | Y | Y | — |
| My Actions View | Y | Y | Y | Y | Y | — |
| State / Date Overrides | Y | Y | Y | Y | — | — |
| Unauthenticated | — | — | — | — | — | Y |

---

*This document was produced by reviewing PRD v3.2 (§5, §12, §14, §16, §17), backend permission guards (`registerAccess.ts`, `riskAccess.ts`, `actionAccess.ts`, `requirePermission.ts`), and route-level enforcement across all API routes.*
