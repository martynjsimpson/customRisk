# Custom Risk — MVP Scope

**Version:** 1.2  
**Date:** 2026-05-04  

---

## 1. Purpose of the MVP

The MVP should prove that **Custom Risk** can deliver its core value:

> A user can configure a risk register, add and manage risks, calculate risk levels, assign ownership, review risks, and maintain an audit trail.

The MVP should focus on the smallest version of the product that demonstrates the main product principles already defined in the PRD: transparency, ownership, low-friction review, flexible configuration, auditability, and usability for non-risk specialists.

---

## 2. MVP Product Goal

The MVP should allow a small team or organisation to:

1. create one or more risk registers;
2. configure basic fields, scoring, and risk levels;
3. add, edit, view, and filter risks;
4. assign risk owners;
5. review risks;
6. export register data;
7. maintain audit evidence for key changes.

The MVP does **not** need to support every future configuration option, enterprise integration, workflow variation, or reporting scenario.

---

## 3. MVP Users and Roles

### Include in MVP

#### System Admin

Can:

- create users;
- manage system-level settings required for MVP;
- create and manage all registers;
- assign Register Admins;
- view audit logs;
- hard delete risks only where required for correction/error handling.

#### Register Admin

Can:

- configure registers they administer;
- manage risks in those registers;
- configure basic fields;
- configure scoring;
- configure risk levels and matrix;
- assign register permissions;
- view register audit history;
- export register data.

#### Risk Owner

Can:

- view risks assigned to them;
- edit permitted fields on assigned risks;
- perform a risk review;
- see review status and next review date.

#### Register Viewer

Can:

- view risks in registers they have access to;
- filter/search risks;
- export where permitted.

### Defer from MVP

#### Risk Response Owner

This role mainly becomes valuable when child-record Risk Response Actions are implemented. For MVP, response actions should remain simple fields on the risk.

---

## 4. MVP Functional Scope

## 4.1 Authentication and Users

### Include

- Local user accounts.
- Login/logout.
- Basic user management by System Admin.
- User active/inactive state.
- Risk Owner assignment to existing local users only for MVP.

### MVP decision

For MVP, every Risk Owner must be an existing local user. Email-address based unresolved person assignment and later account linking remain PRD capabilities for a later release.

### Defer

- SAML.
- Microsoft Entra ID integration.
- Directory lookup.
- Self-service registration.
- Password reset emails unless trivial to include.
- MFA.

---

## 4.2 Registers

### Include

- Create register by System Admin only.
- Edit register name and description by System Admins and assigned Register Admins.
- Register list based on user access.
- Assign Register Admins.
- Assign Register Viewers.
- Register-level configuration area.

### Include basic register settings

- Risk ID prefix.
- Whether Risk Reviews are enabled.
- Default review frequency.
- Created Date override by System Admins and Register Admins only. Risk Owners cannot override Created Date in MVP.

### Defer

- Register templates.
- Register configuration import/export.
- Register-local templates.
- Versioned template migration.
- Draft/publish configuration lifecycle.
- Configuration impact analysis.

The full PRD includes configuration versioning and impact analysis, but this is too much for MVP because it adds a major design and implementation burden before the core app value has been proven. Register creation is also System Admin only in MVP; Register Admins configure registers after assignment.

---

## 4.3 Risk Records

### Include core risk fields

Every MVP risk should include:

- Risk ID
- Risk Title
- Risk Description
- Likelihood
- Impact
- Risk Score
- Risk Level
- Risk Owner
- Created Date
- State
- Risk Response Strategy
- Risk Response Action
- Last Reviewed Date
- Next Review Date
- System Created At
- System Created By
- System Updated At
- System Updated By

This aligns with the PRD's mandatory risk capabilities, including Risk ID, title, description, scoring inputs, score, level, owner, created date, state, response strategy, and response action capability.

### Include risk states

- Draft
- Open
- Closed

Closed risks should be excluded from normal views by default, with a filter to include them.

**Default new-risk state:** Draft. When a risk is created, its state defaults to Draft unless explicitly changed by the user.

### Include Risk ID behaviour

- Auto-generate Risk ID.
- Unique within register.
- Configurable prefix per register (optional). When no prefix is set, the ID is a plain incrementing number (e.g. `1`, `2`, `3`).
- When a prefix is set, the format is `{prefix}-{number}` (e.g. `RISK-1`, `SEC-4`).
- Optional zero-padding per register. When enabled, the numeric portion is padded to a configurable width (e.g. `RISK-0001`, `RISK-0002`). Padding width is configurable (e.g. 4 digits by default when zero-padding is enabled).
- Store immutable internal UUID separately from the displayed Risk ID.

### Defer

- Imported Risk ID preservation.
- Duplicate import/update/merge behaviour.
- Complex Risk ID format builder.
- Soft archive beyond Closed state.
- Bulk edit.
- Advanced state workflow.

---

## 4.4 Custom Fields

### Include

Register Admins can add custom fields of these types:

- Text
- Multi-line text
- Boolean
- Number
- Date
- Dropdown
- Person Picker

### Person Picker MVP behaviour

Person Picker custom fields follow the same rules as Risk Owner in MVP: the selected person must be an existing active local user. Entry of a raw email address for an unresolved or future user is deferred. If a local user is later deactivated, existing Person Picker values are retained but point to the inactive user record.

### Include field configuration

Each custom field should support:

- field name;
- field type;
- display order;
- active/inactive;
- required yes/no;
- help text/description;
- dropdown values where applicable.

### Include validation

For MVP, use a simplified validation model:

- optional;
- required/block save.

### Defer

- Warn-on-save validation.
- Calculated custom fields.
- Field-level visibility by role.
- Visible to Risk Response Owners.
- Field type migration.
- Advanced field lifecycle workflows.
- Draft/publish field configuration.

The PRD's field model is rich, including warn/block validation, visibility controls, soft deletion, field migration, dropdown deactivation, formula recalculation, and configuration publishing. For MVP, keep the field model useful but not fully lifecycle-managed.

---

## 4.5 Risk Scoring and Matrix

### Include

- Configurable Likelihood values.
- Configurable Impact values.
- Numeric value for each Likelihood and Impact.
- Default formula: `Likelihood × Impact`.
- Auto-calculated Risk Score.
- Configurable Risk Levels, for example:
  - Low
  - Medium
  - High
  - Critical
- Matrix mapping from Likelihood/Impact combinations to Risk Level.

### Include register defaults

When a register is created, provide a default 5×5 matrix to reduce setup friction.

### Defer

- Custom formula builder.
- Separate inherent/residual formulas.
- Formula parser.
- Boolean-to-number formula handling.
- Formula impact analysis.
- Matrix behaviour for arbitrary custom formulas.

The PRD allows custom formulas using numeric fields, constants, arithmetic operators, and parentheses, but this would be better handled after the core scoring/matrix flow is working.

---

## 4.6 Inherent and Residual Risk

### MVP recommendation

Include **one standard risk score only** in MVP:

- Likelihood
- Impact
- Risk Score
- Risk Level

### Defer

- Inherent risk fields.
- Residual risk fields.
- Separate inherent/residual scoring.
- Separate inherent/residual matrix behaviour.

Reason: inherent/residual risk doubles the scoring surface area and affects forms, tables, imports, reporting, reviews, and dashboard logic. It is valuable, but not necessary to prove the MVP.

---

## 4.7 Risk Response Strategy and Action

### Include

- Risk Response Strategy field.
- Default values:
  - Accept
  - Mitigate
  - Transfer
  - Avoid
- Simple Risk Response Action field as multi-line text.

### Defer

- Child-record Risk Response Actions.
- Risk Response Action owners.
- Action statuses.
- Due dates.
- Many-to-many links between risks and actions.
- Risk Response Reviews.
- Risk Response import/export.
- Orphan handling.
- Switching between simple field mode and child record mode.

This is an important deferral. The PRD's child-record action model is powerful but materially increases complexity because it introduces a second managed object type, permissions, linking, review history, import/export, and audit behaviour.

---

## 4.8 Risk Reviews

### Include

- Enable/disable Risk Reviews per register.
- Register-level review frequency in months.
- Review button on risk detail page.
- Configurable attestation text.
- Optional review comment.
- Record reviewer.
- Record review timestamp.
- Update Last Reviewed Date.
- Calculate Next Review Date.
- Create review history entry.
- Create audit log entry.

### Defer

- Field-based review frequency rules.
- Review comments mandatory/disabled/optional configuration.
- Risk Response Action reviews.
- Review outcome/status.
- Multiple attestation versions.
- Complex recalculation when rules change.

The PRD defines configurable reviews with attestation, reviewer, timestamp, comments, next review date, review history, and audit logging, so the MVP should keep this core behaviour but defer the more complex rule engine.

**MVP review frequency model:** MVP uses a single default review frequency per register (in months). The PRD's field-based review frequency rules — where frequency varies by risk level, field values, or other conditions — are deferred. All risks in a register use the same frequency for the MVP.

---

## 4.9 Notifications

### MVP recommendation

Do **not** include email notifications in MVP.

### Include instead

- Due review indicators in the UI.
- Overdue review indicators in the UI.
- "My Risks Due for Review" view.
- Register Admin view of overdue risks.

### Defer

- In-app notification centre.
- Email notifications.
- SMTP configuration.
- Notification rules.
- Escalation recipients.
- Repeating reminders.
- Email attempt logs and retries.

Reason: notifications require background jobs, delivery logging, user preferences, SMTP settings, retry behaviour, and security handling for credentials. The PRD's notification model is useful but should come after review status exists in the product.

---

## 4.10 Permissions

### Include

Additive permissions:

- System Admin
- Register Admin
- Risk Owner
- Register Viewer

### Include permission behaviour

- System Admin can access everything.
- Register Admin can manage assigned registers.
- Risk Owner can see and edit risks assigned to them.
- Register Viewer can view risks in assigned registers.
- Register Admin cannot assign/remove System Admin rights.
- Prevent removal of the last Register Admin unless System Admin performs the action.

### Defer

- Explicit deny rules.
- Risk Response Owner permissions.
- Parent-risk limited visibility.
- Field-level visibility by role.
- Advanced export visibility rules.

The PRD specifies additive permissions and excludes explicit deny rules for now, which is suitable for MVP.

---

## 4.11 Audit

### Include

Audit log entries for:

- user login/logout where practical;
- register created/updated;
- register permissions changed;
- risk created;
- risk updated;
- risk state changed;
- risk reviewed;
- risk deleted;
- field configuration changed;
- scoring configuration changed;
- matrix changed.

### Include audit fields

- actor;
- timestamp;
- action;
- object type;
- object ID;
- register;
- risk where applicable;
- field changed where applicable;
- previous value;
- new value;
- summary;
- structured metadata where needed.

### Include audit implementation quality

Audit logging is a core MVP capability and should be designed properly from the start. The MVP should use a structured append-only audit model that supports system, register, and risk-level audit views. A single overloaded text log is not sufficient. Separate audit tables or a normalised audit event model are acceptable if they preserve field-level changes, permission changes, review evidence, export events, security events, and deletion snapshots.

### Include audit views

- System audit log for System Admins.
- Register audit log for Register Admins.

### Defer

- Exportable audit logs.
- Full search/filtering across all audit dimensions.
- Client IP and user agent if not easy in MVP.
- Immutable storage guarantees beyond append-only application behaviour.
- Full last-known snapshot for every deleted object other than risks. For hard-deleted risks, a full last-known risk snapshot is required in MVP.

The PRD requires auditability at system, register, risk, and risk response levels. MVP should implement system, register, and risk audit coverage for included object types, while deferring Risk Response audit logs until child-record Risk Response Actions are introduced.

---

## 4.12 Import and Export

### Include

- CSV export of risks from a register.
- Export respects current filters.
- Export includes visible fields for the user.
- Register Admin/System Admin can export full register risk data.

### Defer

- CSV import.
- Validate-preview-commit import flow.
- Column mapping.
- Update/merge mode.
- CSV template generation.
- Risk Response import/export.
- Register configuration JSON import/export.

The PRD's import design is comprehensive, including validation, mapping, warnings, duplicate handling, and calculated field behaviour. That is likely too much for MVP unless importing existing risks is a must-have for your first real users.

---

## 4.13 Reporting and Dashboard

### Include

A simple home/dashboard view with:

- My open risks.
- My risks due for review.
- My overdue risks.
- Register Admin summary:
  - open risks;
  - overdue reviews;
  - risks by level;
  - unassigned risks, visible only to Register Admins and System Admins.

### Include register table filters

- State
- Risk Level
- Risk Owner
- Due/overdue review
- Search by title/description/Risk ID

### Defer

- Saved views.
- Advanced reporting.
- Charts beyond simple counts.
- Cross-register reporting.
- Custom report builder.
- Scheduled reports.
- Report exports beyond CSV risk export.

The PRD leaves detailed dashboards and reporting for future refinement, so MVP should include only operational views that help users manage ownership and review status.

---

## 5. MVP Core Pages

### Include

1. Login
2. Home / My Work
3. Registers list
4. Register risk table
5. Risk detail
6. Add/edit risk
7. Review risk
8. Register configuration
9. Field configuration
10. Scoring and matrix configuration
11. Register permissions
12. Users admin
13. Audit log

### Defer

1. Risk Responses / My Actions page
2. Notification centre
3. SMTP admin
4. SAML admin
5. Template library
6. Import wizard
7. Advanced reporting
8. API/integration admin

---

## 6. MVP Non-Functional Scope

### Include

- Simple, clear UI suitable for non-risk specialists.
- Consistent permission enforcement.
- Server-side validation for all important actions.
- Audit trail for key changes.
- Basic error handling.
- Reasonable responsiveness on desktop.
- Basic responsive layout for tablet/mobile viewing, but not full mobile-first optimisation.
- Seed/demo data for testing.

### Defer

- High-scale optimisation.
- Complex caching.
- Advanced observability.
- Formal compliance certifications.
- Multi-language support.
- Full accessibility audit, although basic semantic accessibility should still be considered.

---

## 7. MVP Out of Scope Summary

The following should be explicitly out of scope for MVP v1:

- SAML / Entra ID authentication
- SMTP/email notifications
- child-record Risk Response Actions
- Risk Response Owners
- Risk Response Reviews
- inherent/residual risk scoring
- custom formula builder
- calculated custom fields
- CSV import
- register configuration import/export
- templates and template versioning
- draft/publish configuration lifecycle
- configuration impact analysis
- advanced reporting
- saved views
- APIs/webhooks
- attachments/evidence handling
- full field-level visibility model
- notification escalation workflow

---

## 8. MVP Success Criteria

The MVP is successful if:

1. A System Admin can create users and registers.
2. A System Admin can create a register and assign Register Admins, and a Register Admin can configure a usable assigned register without code changes.
3. A Register Admin can define fields, scoring values, and a risk matrix.
4. An authorised System Admin or Register Admin can create risks, and authorised users can update permitted risk fields.
5. Risk scores and levels are calculated automatically.
6. Risk Owners can find the risks they own.
7. Risk Owners can complete a risk review.
8. Register Admins can see overdue risks and any unassigned-risk/data-quality exceptions.
9. Key changes are visible in audit history.
10. Risk data can be exported to CSV.

---

## 9. Suggested MVP Phases

### Phase 1 — Foundation

- Users
- Authentication
- Roles
- Registers
- Basic permissions
- Audit framework

### Phase 2 — Risk Register Core

- Risk table
- Risk create/edit/view
- Risk ID
- State
- Owner
- Core fields
- CSV export

### Phase 3 — Configuration

- Custom fields
- Dropdown values
- Required fields
- Field ordering
- Register configuration UI

### Phase 4 — Scoring

- Likelihood
- Impact
- Risk score
- Risk levels
- Matrix configuration
- Risk level display

### Phase 5 — Reviews and Dashboard

- Risk review flow
- Last/next review dates
- Overdue indicators
- My Risks view
- Register Admin summary

### Phase 6 — Hardening

- Permission testing
- Audit completeness
- Validation testing
- Usability improvements
- Seed/demo register
- Bug fixing

---

## 10. Recommended Next Document

After agreeing the MVP scope, the next document should be:

# MVP Functional Specification

That should go one level deeper than this scope document and define:

- exact screens;
- fields on each screen;
- user actions;
- validation;
- permissions;
- audit events;
- acceptance criteria.

Only after that should the separate **Technical Design** be produced.
