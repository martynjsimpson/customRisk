# Custom Risk — MVP Functional Specification

**Version:** 1.2  
**Date:** 2026-05-04  

---

## 1. Document Purpose

This document defines the functional behaviour for the MVP version of **Custom Risk**, a configurable risk register web application.

It is based on the agreed **MVP Scope v1** and is intentionally technology-neutral. It describes what the application must do, which users can do it, what screens are required, what validation applies, what audit events are created, and what acceptance criteria should be met.

This document should be used before technical design and implementation planning.

---

## 2. MVP Functional Goal

The MVP must allow a small organisation or team to:

1. create users;
2. create and configure risk registers;
3. define basic custom fields;
4. define likelihood, impact, scoring, and risk levels;
5. create, edit, view, filter, and export risks;
6. assign risk ownership;
7. perform risk reviews;
8. view due and overdue risks;
9. maintain an audit trail for key changes.

The MVP should prove the core product value: a configurable, auditable, ownership-focused risk register that non-risk-specialist users can use without needing to understand the underlying configuration model.

---

## 3. MVP Roles

## 3.1 System Admin

A System Admin can manage the whole application.

System Admins can:

- log in;
- manage users;
- create, view, and update registers;
- assign Register Admins and Register Viewers;
- access all registers;
- manage all risks;
- view system and register audit logs;
- hard delete risks where correction is required;
- perform all Register Admin actions.

System Admins cannot be created or removed by Register Admins.

## 3.2 Register Admin

A Register Admin manages one or more specific registers. Register Admins do not create registers in the MVP; register creation is a System Admin action.

Register Admins can, for registers they administer:

- view the register;
- configure register settings;
- configure custom fields;
- configure likelihood and impact values;
- configure the risk matrix;
- manage all risks in the register;
- assign Register Viewers;
- assign additional Register Admins, subject to last-admin protection;
- view register audit logs;
- export register risk data.

Register Admins cannot:

- manage system roles;
- assign or remove System Admin rights;
- access registers where they do not have permission.

## 3.3 Risk Owner

A Risk Owner is derived from the Risk Owner field on a risk.

Risk Owners can:

- view risks assigned to them;
- edit permitted fields on assigned risks;
- complete reviews for assigned risks;
- see due and overdue review status for assigned risks.

Risk Owners cannot:

- configure registers;
- change scoring configuration;
- change field configuration;
- delete risks;
- directly edit calculated score or risk level fields.

## 3.4 Register Viewer

A Register Viewer has read-only access to a specific register.

Register Viewers can:

- view risks in assigned registers;
- filter, sort, and search risks;
- view risk detail pages;
- export risk data if export permission is enabled for viewers.

Register Viewers cannot:

- create, edit, review, or delete risks;
- configure registers;
- manage permissions.

---

## 4. Permission Rules

## 4.1 Additive Permissions

Permissions are additive. A user receives the highest effective permission available through:

- System Admin role;
- Register Admin assignment;
- Register Viewer assignment;
- Risk Owner assignment.

Example: if a user is both Register Viewer and Risk Owner for a risk, they can perform Risk Owner actions on their assigned risk.

## 4.2 Register Access

A user can access a register if at least one of the following is true:

- they are a System Admin;
- they are a Register Admin for the register;
- they are a Register Viewer for the register;
- they own at least one risk in the register.

## 4.3 Risk Access

A user can view a risk if at least one of the following is true:

- they are a System Admin;
- they are a Register Admin for the register;
- they are a Register Viewer for the register;
- they are the Risk Owner for the risk.

A user can edit a risk if at least one of the following is true:

- they are a System Admin;
- they are a Register Admin for the register;
- they are the Risk Owner for the risk.

## 4.4 Configuration Access

Only System Admins and Register Admins can access register configuration.

## 4.5 Last Register Admin Protection

The system must prevent removal of the final Register Admin from a register unless the action is performed by a System Admin.

---

## 5. Core Navigation

The MVP application must include the following main navigation areas:

1. Home / My Work
2. Registers
3. Register Configuration
4. Users
5. Audit Logs

Navigation items should be role-aware. Users should not see areas they cannot access.

---

## 6. Authentication

## 6.1 Login

### Purpose

Allow authorised users to access the application.

### Fields

- Email address
- Password

### Behaviour

- User enters email and password.
- System validates credentials.
- If valid, user is logged in and taken to Home / My Work.
- If invalid, system displays a generic login error.
- Inactive users cannot log in.

### Validation

- Email is required.
- Password is required.
- Login error must not reveal whether the email address exists.

### Audit Events

- Successful login
- Failed login attempt where practical
- Logout where practical

### Acceptance Criteria

- A valid active user can log in.
- An inactive user cannot log in.
- Invalid credentials show a clear but non-specific error.
- A logged-in user can log out.

---

## 7. User Management

## 7.1 Users List

### Access

System Admin only.

### Purpose

Allow System Admins to view and manage local users.

### Displayed Columns

- Name
- Email
- System role
- Active/inactive status
- Created date
- Last updated date

### Actions

- Add user
- Edit user
- Activate/deactivate user
- View user details

### Filters/Search

- Search by name or email
- Filter by active/inactive
- Filter by System Admin yes/no

## 7.2 Add/Edit User

### Access

System Admin only.

### Fields

- Name
- Email address
- Password or temporary password
- System Admin: yes/no
- Active: yes/no

### Behaviour

- Email address is the unique user identifier.
- A user can be marked inactive instead of deleted.
- Inactive users cannot log in.
- Existing risk ownership assignments remain intact if a user is deactivated. For MVP, Risk Owner must be an existing local user account; unresolved email-only Risk Owner assignment is deferred.

### Validation

- Name is required.
- Email address is required.
- Email address must be valid format.
- Email address must be unique.
- Password is required when creating a new user.

### Audit Events

- User created
- User updated
- User activated
- User deactivated
- System Admin role granted
- System Admin role removed

### Acceptance Criteria

- A System Admin can create a user.
- A System Admin can deactivate a user.
- A deactivated user cannot log in.
- User changes create audit entries.

---

## 8. Home / My Work

## 8.1 Purpose

Provide each user with a role-aware view of the work that needs their attention.

## 8.2 Risk Owner View

Risk Owners should see:

- My open risks
- My risks due for review
- My overdue risks

Risk Owners should not see unassigned-risk dashboard counts unless they also have Register Admin or System Admin permissions.

Each item should link to the relevant risk detail page.

## 8.3 Register Admin View

Register Admins should see a summary for registers they administer:

- open risks count;
- overdue reviews count;
- risks by risk level;
- unassigned risks count, visible only to Register Admins and System Admins as an administrative/data-quality indicator.

Each summary item should link to a filtered register view.

## 8.4 System Admin View

System Admins should see:

- total registers;
- total users;
- open risks across all registers;
- overdue reviews across all registers;
- recent audit activity.

## 8.5 Empty States

If there are no items requiring attention, show a friendly empty state such as:

> No risks need your attention right now.

## 8.6 Acceptance Criteria

- Users only see information they are permitted to access.
- Risk Owners can quickly reach risks assigned to them.
- Register Admins can identify overdue and unassigned risks.
- Dashboard counts match the underlying filtered data.

---

## 9. Registers

## 9.1 Registers List

### Purpose

Show registers the current user can access.

### Access

- System Admin: all registers
- Register Admin: administered registers
- Register Viewer: viewed registers
- Risk Owner: registers containing risks assigned to them

### Displayed Columns

- Register name
- Description
- User's effective role
- Open risks count
- Overdue risks count
- Last updated date

### Actions

Depending on permission:

- Open register
- Create register, System Admin only
- Edit register
- Configure register

### Acceptance Criteria

- Users only see registers they can access.
- System Admins can create registers.
- Register Admins can open and configure assigned registers.
- Register Viewers can open assigned registers in read-only mode.

## 9.2 Create Register

### Access

System Admin only for MVP.

### Fields

- Register name
- Description
- Risk ID prefix (optional)
- Risk ID zero-padding enabled: yes/no (default no)
- Risk ID zero-padding width (required if zero-padding is enabled; default 4)
- Initial Register Admins

### Default Configuration

New registers should be created with:

- default states: Draft, Open, Closed;
- default new-risk state: Draft (the state applied automatically when a risk is created);
- default response strategies: Accept, Mitigate, Transfer, Avoid;
- default likelihood scale;
- default impact scale;
- default risk levels;
- default risk matrix;
- risk reviews enabled by default;
- default review frequency of 12 months;
- default review attestation text.

### Validation

- Register name is required.
- Register name must be unique.
- Risk ID prefix is optional. When provided, it must not contain characters invalid for display IDs (e.g. spaces or special characters that would break display).
- Risk ID zero-padding width is required when zero-padding is enabled; must be a positive integer of 2 or more.
- At least one Register Admin is required unless created by a System Admin who remains able to administer it.

### Audit Events

- Register created
- Initial Register Admin assigned

### Acceptance Criteria

- A System Admin can create a register.
- The register is immediately usable with default scoring configuration.
- The register appears in the registers list for permitted users.

## 9.3 Edit Register Settings

### Access

- System Admin
- Register Admin

### Fields

- Register name
- Description
- Risk ID prefix (optional; when blank, Risk ID is a plain incrementing number)
- Risk ID zero-padding enabled: yes/no (default no)
- Risk ID zero-padding width: integer (default 4 when zero-padding is enabled; e.g. `0001`)
- Enable Risk Reviews: yes/no, enabled by default
- Default review frequency in months, default 12 months
- Review attestation text
- Allow Register Viewer export: yes/no, default no

### Validation

- Register name is required.
- Risk ID prefix is optional.
- Default review frequency is required if reviews are enabled.
- Review frequency must be a positive whole number.
- Review attestation text is required if reviews are enabled.
- Register Viewer export is disabled by default.
- Risk ID zero-padding width is required when zero-padding is enabled; must be a positive integer of 2 or more.

### Audit Events

- Register settings updated
- Register Viewer export setting changed
- Risk reviews enabled
- Risk reviews disabled
- Review frequency changed
- Review attestation text changed

### Acceptance Criteria

- Register settings can be updated by authorised users.
- Review fields behave according to whether reviews are enabled.
- Settings changes are audited.

---

## 10. Register Permissions

## 10.1 Permission Management Page

### Access

- System Admin
- Register Admin for the register

### Purpose

Allow authorised users to manage register-level access.

### Displayed Lists

- Register Admins
- Register Viewers

### Actions

- Add Register Admin
- Remove Register Admin
- Add Register Viewer
- Remove Register Viewer

### Behaviour

- Permissions are assigned to existing local users.
- System Admin role is managed separately in User Management.
- Removing the final Register Admin is blocked unless performed by a System Admin.

### Validation

- User must exist.
- Duplicate assignment is not allowed.
- Last Register Admin rule must be enforced.

### Audit Events

- Register Admin added
- Register Admin removed
- Register Viewer added
- Register Viewer removed

### Acceptance Criteria

- Register Admins can manage register permissions except System Admin rights.
- The final Register Admin cannot accidentally be removed.
- Permission changes take effect immediately.
- Permission changes are audited.

---

## 11. Register Risk Table

## 11.1 Purpose

Provide the main operational view of risks in a register.

## 11.2 Access

Users who can access the register.

## 11.3 Default View

By default, show Open and Draft risks. Closed risks are excluded unless included through a filter.

## 11.4 Columns

Default columns:

- Risk ID
- Risk Title
- State
- Risk Owner
- Likelihood
- Impact
- Risk Score
- Risk Level
- Next Review Date
- Review Status
- Last Updated

Custom fields may be displayed according to register configuration and available table settings.

## 11.5 Actions

Depending on permission:

- Add risk
- Open risk
- Edit risk
- Review risk
- Delete risk
- Export CSV

## 11.6 Filters

- State
- Risk Level
- Risk Owner
- Review status
- Due for review
- Overdue review
- Include closed risks

## 11.7 Search

Search should match:

- Risk ID
- Risk Title
- Risk Description

## 11.8 Sorting

Sortable columns should include:

- Risk ID
- Risk Title
- State
- Risk Owner
- Risk Score
- Risk Level
- Next Review Date
- Last Updated

## 11.9 Review Status Calculation

Review status should be one of:

- Not required
- Not reviewed
- Not due
- Due soon
- Overdue

MVP behaviour:

- If reviews are disabled for the register: **Not required**
- If reviews are enabled and the risk has never been reviewed (Last Reviewed Date is empty): **Not reviewed**
- If reviews are enabled and the risk has been reviewed and Next Review Date is in the past: **Overdue**
- If reviews are enabled and the risk has been reviewed and Next Review Date is today or within 30 days: **Due soon**
- Otherwise: **Not due**

### Review status and overdue filters — important distinction

The displayed status for a never-reviewed risk is **Not reviewed**, not Overdue. However, a never-reviewed risk whose Next Review Date is in the past **must still be included in overdue filters and overdue dashboard counts**. This means the review status field shown in the table reflects the display label (Not reviewed), while the overdue filter and count logic uses the Next Review Date value independently of the display label.

This avoids hiding overdue review obligations while keeping it clear that no review has ever been completed.

### Due-soon window

The due-soon window is 30 days. Risks with a Next Review Date within the next 30 days (from today) are shown as Due soon.

## 11.10 Acceptance Criteria

- Users see only risks they are permitted to view.
- Closed risks are hidden by default.
- Filters and search update the table results.
- Risk Owner users can find their assigned risks.
- Review status labels are accurate per the rules above.
- Never-reviewed risks with a past Next Review Date appear in overdue filters and overdue counts even though their display status is Not reviewed.

---

## 12. Risk Create/Edit/View

## 12.1 Risk Detail Page

### Purpose

Display a single risk and allow permitted users to update it.

### Sections

1. Risk summary
2. Core fields
3. Scoring fields
4. Custom fields
5. Review information
6. Audit/history summary

### Read-Only Fields

- Internal ID
- Risk ID after creation
- Risk Score
- Risk Level
- System Created At
- System Created By
- System Updated At
- System Updated By
- Last Reviewed Date, except through review action
- Next Review Date, except through review calculation

## 12.2 Add Risk

### Access

- System Admin
- Register Admin

Risk Owners cannot create risks in the MVP. Risk creation is limited to System Admins and Register Admins.

### Fields

Core fields:

- Risk Title
- Risk Description
- State
- Risk Owner
- Created Date
- Likelihood
- Impact
- Risk Response Strategy
- Risk Response Action

Custom fields:

- Active custom fields for the register

### Default Values

- Risk ID: auto-generated
- State: Draft
- Created Date: current date
- Risk Score: calculated
- Risk Level: calculated from matrix
- Last Reviewed Date: empty
- Next Review Date: calculated from Created Date if reviews are enabled

### Validation

- Risk Title is required.
- Risk Description is required.
- State is required.
- Risk Owner is required.
- Likelihood is required.
- Impact is required.
- Risk Response Strategy is required.
- Required custom fields must be completed.
- Created Date is required.
- Created Date can only be overridden by System Admins and Register Admins. Risk Owners cannot override Created Date in the MVP.

### Audit Events

- Risk created
- Initial field values recorded where practical

### Acceptance Criteria

- An authorised user can create a risk.
- Risk ID is generated automatically.
- Risk Score and Risk Level are calculated automatically.
- Required fields block save when empty.
- Creation creates an audit entry.

## 12.3 Edit Risk

### Access

- System Admin
- Register Admin
- Risk Owner for assigned risks

### Editable Fields

Editable by authorised users:

- Risk Title
- Risk Description
- State
- Risk Owner
- Created Date by System Admins and Register Admins only
- Likelihood
- Impact
- Risk Response Strategy
- Risk Response Action
- Active custom fields

Not directly editable:

- Risk ID
- Risk Score
- Risk Level
- System metadata
- Review history

### Behaviour

- Changing Likelihood or Impact recalculates Risk Score and Risk Level.
- Changing Created Date may recalculate Next Review Date if the risk has never been reviewed and reviews are enabled.
- Changing State to Closed removes the risk from default operational views.
- Changing Risk Owner immediately changes ownership permissions.

### Validation

Same as Add Risk.

### Audit Events

- Risk updated
- Field changed, including previous and new value
- Risk owner changed
- State changed
- Score recalculated where relevant

### Acceptance Criteria

- Authorised users can edit permitted fields.
- Calculated values update automatically.
- Unauthorised users cannot edit.
- Field changes are audited.

## 12.4 Delete Risk

### Access

System Admin only for MVP.

### Behaviour

- Delete is treated as hard delete for correction/error handling.
- User must confirm the action.
- User may optionally provide deletion reason.
- System creates an audit entry and structured deletion snapshot containing the full last-known risk record, including core fields, active and inactive custom field values, review history summary, calculated values, owner, state, timestamps, actor, and deletion reason where provided.

### Validation

- Confirmation is required.

### Audit Events

- Risk deleted
- Deletion reason recorded if provided
- Last-known snapshot recorded where practical

### Acceptance Criteria

- Only System Admins can delete risks.
- Deleting a risk requires confirmation.
- Deletion creates an audit entry and full last-known risk snapshot.
- Deleted risk no longer appears in normal views.

---

## 13. Risk Fields and Custom Field Configuration

## 13.1 Field Configuration Page

### Access

- System Admin
- Register Admin

### Purpose

Allow Register Admins to configure extra fields on risks.

## 13.2 Supported MVP Field Types

- Text
- Multi-line text
- Boolean
- Number
- Date
- Dropdown
- Person Picker

### Person Picker MVP behaviour

Person Picker custom fields follow the same rules as the Risk Owner field in MVP. The selected person must be an existing active local user. Entry of a raw email address for an unresolved or external user is deferred to a later release. If a local user is deactivated after being selected, the existing Person Picker value is retained and continues to reference the inactive user record. Person Picker fields in MVP use an autocomplete/search over active local user accounts.

## 13.3 Field Definition Properties

Each custom field must support:

- Field name
- Field type
- Help text
- Required: yes/no
- Display order
- Active: yes/no
- Dropdown values, if type is Dropdown

## 13.4 Add Field

### Behaviour

- New field is added to the register.
- Field appears on Add/Edit Risk screens.
- Field can appear in the risk table where table display supports it.

### Validation

- Field name is required.
- Field name must be unique within the register.
- Field type is required.
- Dropdown fields require at least one active dropdown value.

### Audit Events

- Custom field created

### Acceptance Criteria

- Register Admin can add a supported custom field.
- Field appears on risk forms.
- Field validation is applied.

## 13.5 Edit Field

### Behaviour

- Register Admin can update field name, help text, required setting, display order, active status, and dropdown values.
- Field type cannot be changed in MVP after creation.
- Inactive fields no longer appear on new risk forms by default.
- Existing values are retained for inactive fields.

### Validation

- Field name remains required and unique.
- Dropdown fields must retain at least one active option if active.

### Audit Events

- Custom field updated
- Custom field activated/deactivated
- Dropdown value added/updated/deactivated

### Acceptance Criteria

- Field configuration changes affect future risk editing.
- Field type cannot be changed after creation.
- Existing data is not lost when a field is deactivated.
- Changes are audited.

---

## 14. Scoring Configuration

## 14.1 Purpose

Allow Register Admins to configure the likelihood, impact, risk score, and risk level model for a register.

## 14.2 Likelihood Configuration

### Default MVP Values

New registers use the following default 1–5 Likelihood scale:

1. Rare
2. Unlikely
3. Possible
4. Likely
5. Almost Certain

### Fields

Each likelihood value has:

- Display name
- Numeric value
- Display order
- Active yes/no

### Behaviour

- Likelihood values are selectable on risks.
- Numeric value is used for score calculation.
- Inactive values cannot be selected for new risk updates.
- Existing risks retain historical values where practical.

### Validation

- Display name is required.
- Numeric value is required.
- Display order is required.
- At least one active likelihood value is required.

### Audit Events

- Likelihood value created
- Likelihood value updated
- Likelihood value deactivated

## 14.3 Impact Configuration

### Default MVP Values

New registers use the following default 1–5 Impact scale:

1. Insignificant
2. Minor
3. Moderate
4. Major
5. Severe

Same behaviour as Likelihood Configuration.

## 14.4 Score Calculation

MVP formula:

`Risk Score = Likelihood numeric value × Impact numeric value`

The formula is fixed in MVP.

### Behaviour

- Risk Score recalculates when Likelihood or Impact changes.
- Risk Score is read-only to normal users.

### Acceptance Criteria

- A risk score is calculated for every risk with valid Likelihood and Impact.
- Users cannot manually edit Risk Score.

## 14.5 Risk Levels

### Fields

Each risk level has:

- Name
- Description
- Display order
- Active yes/no

Default MVP risk levels:

- Low
- Medium
- High
- Critical

### Validation

- Name is required.
- Name must be unique within the register.
- At least one active Risk Level is required.

### Audit Events

- Risk level created
- Risk level updated
- Risk level deactivated

## 14.6 Risk Matrix

### Purpose

Map each Likelihood and Impact combination to a Risk Level.

### Behaviour

- Matrix is generated from active Likelihood and Impact values.
- Register Admin assigns a Risk Level to each cell.
- Risk Level on a risk is determined by the selected Likelihood/Impact combination.
- Matrix must be complete before risks can be saved with scoring values.

### Validation

- Every active Likelihood/Impact combination must have a Risk Level.

### Audit Events

- Risk matrix updated

### Acceptance Criteria

- Register Admin can configure matrix cells.
- Risk Level updates automatically when Likelihood or Impact changes.
- Incomplete matrix configuration is clearly shown and blocks affected risk saves.

---

## 15. Risk Reviews

## 15.1 Purpose

Allow Risk Owners and admins to record that a risk has been reviewed.

## 15.2 Enable/Disable Reviews

Risk reviews are enabled or disabled per register.

If disabled:

- Review button is hidden or disabled.
- Review status shows Not required.
- Next Review Date is not required.

If enabled:

- Review button is available to authorised users.
- Last Reviewed Date and Next Review Date are shown.
- Review status is calculated.

### MVP review frequency model

MVP uses a single default review frequency per register, configured in months. All risks in a register share the same frequency. The PRD's field-based review frequency rules — where frequency varies by risk level or field values — are deferred. A future release will introduce configurable rules that calculate different frequencies for different risks.

## 15.3 Review Risk Action

### Access

- System Admin
- Register Admin
- Risk Owner for assigned risk

### Review Form Fields

- Attestation text, read-only
- Review comment, optional
- Confirm review checkbox or button

### Behaviour

When a user completes a review:

- Last Reviewed Date is set to current date/time.
- Reviewer is recorded.
- Review comment is saved if provided.
- Next Review Date is calculated using default review frequency.
- Review history entry is created.
- Audit entry is created.

### Validation

- User must confirm the review.
- Comment is optional in MVP.

### Next Review Date Calculation

For MVP:

- If review is completed, Next Review Date = review date + register default review frequency.
- If risk has never been reviewed, Next Review Date = Created Date + register default review frequency.

### Audit Events

- Risk reviewed
- Next Review Date updated

### Acceptance Criteria

- Authorised users can review a risk.
- Review history records reviewer, timestamp, comment, attestation text, and next review date.
- Next Review Date updates correctly.
- Review creates an audit entry.

## 15.4 Review History

### Displayed Fields

- Reviewer
- Timestamp
- Comment
- Attestation text
- Calculated next review date

### Access

Any user who can view the risk can view its review history.

### Acceptance Criteria

- Review history is visible on the risk detail page.
- Review history is read-only.
- Review entries are retained even after later reviews.

---

## 16. CSV Export

## 16.1 Purpose

Allow users to export risk data from a register.

## 16.2 Access

- System Admin
- Register Admin
- Register Viewer if viewer export is enabled for the register

Risk Owners cannot export risk data in the MVP unless they also have Register Viewer, Register Admin, or System Admin permissions with export access.

## 16.3 Behaviour

- Export uses current register filters where applicable.
- Closed risks are excluded unless included by filter.
- Export includes core risk fields.
- Export includes active custom fields.
- Register Admin/System Admin exports include full register data.
- Register Viewer exports include the same risk fields visible to viewers in the UI. Register Viewer export is configurable per register and disabled by default. Internal IDs, administrative metadata, and any future sensitive/admin-only fields must not be exported to Register Viewers unless explicitly made visible.

## 16.4 Export Fields

Default export fields:

- Register name
- Risk ID
- Risk Title
- Risk Description
- State
- Risk Owner
- Created Date
- Likelihood
- Impact
- Risk Score
- Risk Level
- Risk Response Strategy
- Risk Response Action
- Last Reviewed Date
- Next Review Date
- Review Status
- System Created At
- System Created By
- System Updated At
- System Updated By
- Active custom fields

## 16.5 Audit Events

- Risk export generated

## 16.6 Acceptance Criteria

- Authorised users can export risk data as CSV.
- Export respects filters.
- Export does not include unauthorised data.
- Export action is audited.

---

## 17. Audit Logs

## 17.1 Purpose

Provide traceability for important actions and changes.

## 17.2 Audit Entry Structure

Each audit entry should include:

- Timestamp
- Actor
- Action
- Object type
- Object identifier
- Register, where applicable
- Risk, where applicable
- Field changed, where applicable
- Previous value, where applicable
- New value, where applicable
- Summary
- Structured metadata, where applicable

Audit logging is a first-class MVP requirement. The implementation should support structured append-only audit events, field-level change rows where relevant, and deletion snapshot records for hard-deleted risks. Separate audit tables or a normalised audit event model are acceptable. A flat text-only log is not sufficient for MVP.

## 17.3 System Audit Log

### Access

System Admin only.

### Includes

- User changes
- System Admin role changes
- Register creation/deletion
- System-level access events where practical

## 17.4 Register Audit Log

### Access

- System Admin
- Register Admin for the register

### Includes

- Register settings changes
- Register permission changes
- Field configuration changes
- Scoring configuration changes
- Matrix changes
- Risk creation/update/deletion
- Risk reviews
- CSV exports

## 17.5 Risk Audit Summary

Risk detail page should show a risk-specific audit/history summary.

### Includes

- Risk created
- Field changes
- State changes
- Owner changes
- Review events
- Deletion event if viewing from audit context only

## 17.6 Filtering

MVP audit log filters:

- Date range
- Actor
- Action
- Object type
- Register
- Risk ID where applicable

## 17.7 Acceptance Criteria

- Key changes create audit entries.
- System Admins can view system audit logs.
- Register Admins can view register audit logs.
- Risk-level history is visible from the risk detail page.
- Audit entries cannot be edited through the UI.
- Hard-deleted risks retain a full last-known snapshot in audit storage.

---

## 18. Validation and Error Handling

## 18.1 General Validation Principles

- Required fields must be clearly marked.
- Validation errors should appear close to the relevant field.
- Save actions should be blocked when required data is invalid.
- Users should not lose entered data when validation fails.
- Server-side validation must enforce all important rules.

## 18.2 Permission Errors

If a user attempts an action they are not permitted to perform:

- block the action;
- show a clear error message;
- avoid exposing sensitive information;
- record an audit/security event where practical.

## 18.3 Not Found Errors

If a requested register or risk does not exist or is not accessible:

- show a generic not found or access denied message;
- do not reveal whether the object exists if the user lacks permission.

---

## 19. MVP Screen Inventory

## 19.1 Authentication

- Login
- Logout confirmation or direct logout action

## 19.2 Home

- Home / My Work dashboard

## 19.3 Users

- Users list
- Add user
- Edit user

## 19.4 Registers

- Registers list
- Create register
- Edit register settings
- Register permissions

## 19.5 Risk Register

- Register risk table
- Add risk
- Risk detail
- Edit risk
- Review risk
- Delete risk confirmation

## 19.6 Configuration

- Field configuration
- Add/edit custom field
- Likelihood configuration
- Impact configuration
- Risk level configuration
- Matrix configuration

## 19.7 Audit

- System audit log
- Register audit log
- Risk audit/history summary

---

## 20. MVP Acceptance Test Scenarios

## 20.1 System Admin Creates a Register

Given I am a System Admin,
when I create a register with a name, description, prefix, and Register Admin,
then the register is created with default scoring configuration,
and the assigned Register Admin can access it,
and the creation is audited.

## 20.2 Register Admin Configures Fields

Given I am a Register Admin,
when I add a required dropdown custom field,
then the field appears on the risk form,
and risks cannot be saved unless the field has a value,
and the configuration change is audited.

## 20.3 Register Admin Configures Matrix

Given I am a Register Admin,
when I update the risk matrix,
then each Likelihood/Impact combination maps to a Risk Level,
and risks calculate the correct Risk Level,
and the matrix update is audited.

## 20.4 Register Admin Creates a Risk

Given I am a Register Admin,
when I create a risk with required fields, Likelihood, Impact, and Risk Owner,
then the system generates a Risk ID,
and calculates Risk Score,
and assigns Risk Level,
and creates an audit entry.

## 20.5 Risk Owner Reviews a Risk

Given I am the Risk Owner,
and reviews are enabled,
when I complete a review,
then the system records me as reviewer,
and records the review timestamp,
and updates Last Reviewed Date,
and calculates Next Review Date,
and creates review history and audit entries.

## 20.6 Register Viewer Views a Register

Given I am a Register Viewer,
when I open a register,
then I can view risks,
and I cannot edit, delete, review, or configure risks.

## 20.7 Closed Risks Are Hidden by Default

Given a risk is Closed,
when I open the register risk table,
then the risk is not shown by default,
and I can include it using the closed-risk filter if authorised.

## 20.8 CSV Export Respects Filters

Given I am authorised to export,
when I filter the risk table and export CSV,
then the exported file contains the filtered risk data,
and the export action is audited.

---

## 21. Deliberately Deferred Functional Areas

The following are not included in MVP Functional Specification v1:

- SAML authentication
- Microsoft Entra ID integration
- SMTP and email notifications
- In-app notification centre
- Risk Response Actions as child records
- Risk Response Owners
- Risk Response Reviews
- Inherent and residual risk scoring
- Custom formula builder
- Calculated custom fields
- CSV import
- Import preview/validation/commit flow
- Register configuration import/export
- Register templates
- Configuration versioning
- Draft/publish configuration lifecycle
- Configuration impact analysis
- Attachments/evidence handling
- APIs and webhooks
- Advanced reporting
- Saved views
- Field-level visibility by role
- Notification escalation workflow

---

## 22. Confirmed MVP Decisions

The following decisions are confirmed for MVP Functional Specification v1.2:

1. Risk Owners cannot create risks in the MVP.
2. Register Viewer export is configurable per register and disabled by default.
3. Risk Reviews are enabled by default on new registers.
4. The default review frequency is 12 months.
5. New registers use a default 1–5 Likelihood scale: Rare, Unlikely, Possible, Likely, Almost Certain.
6. New registers use a default 1–5 Impact scale: Insignificant, Minor, Moderate, Major, Severe.
7. New registers use default Risk Levels: Low, Medium, High, Critical.
8. Created Date override is included for System Admins and Register Admins only.
9. Risk Owner is mandatory by default.
10. Risk Owner must be an existing local user in MVP. Email-only unresolved owner assignment is deferred.
11. A never-reviewed risk displays a primary status of Not reviewed but is included in overdue filters and overdue dashboard counts if its Next Review Date is in the past.
12. Hard-deleted risks require a full audit deletion snapshot.
13. The default state for a newly created risk is Draft.
14. Risk ID format: a plain incrementing number when no prefix is set (e.g. `1`, `2`, `3`). When a prefix is set, the format is `{prefix}-{number}` (e.g. `RISK-1`). Zero-padding is optional per register; when enabled, the numeric portion is padded to a configurable width (default 4 digits), e.g. `RISK-0001`.
15. Person Picker custom fields in MVP require an existing active local user, matching the Risk Owner behaviour. Raw email entry for unresolved users is deferred.
16. MVP uses a single default review frequency per register (in months). Field-based or level-based review frequency rules are deferred.

---

## 23. Final Review Notes

This specification is ready to proceed into downstream design. It is deliberately technology-neutral and should be treated as the behavioural source of truth for the MVP.

Before implementation, the next deliverables should be created from this specification rather than from the broader PRD:

1. MVP data model outline;
2. MVP UI wireflow specification;
3. MVP technical design;
4. implementation backlog and AI-ready build tickets.

