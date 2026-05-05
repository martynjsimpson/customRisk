# Custom Risk — Register Template Library

**Version:** 0.1  
**Status:** Draft / Post-MVP feature extension  
**Applies to:** Post-MVP feature exploration  
**Related documents:** PRD.md, MVP_Scope.md, MVP_Functional_Spec.md, MVP_Data_Model.md, Feature_Control_Effectiveness_and_Residual_Risk.md

---

## 1. Purpose

This document extends the Product Requirements Document with a post-MVP feature concept for a **Register Template Library**.

The feature allows System Admins to create, manage, publish, version, deprecate, and retire reusable register templates. Register Admins can then use published templates as a starting point when creating or configuring registers.

Templates are intended to reduce setup friction, promote consistency, and help organisations create registers aligned to recognised standards, internal methodologies, or common risk management use cases.

Example template types include:

- ISO/IEC 27001:2022 information security risk register;
- Cyber Essentials risk register;
- NIST Cybersecurity Framework risk register;
- supplier / third-party risk register;
- operational risk register;
- project risk register;
- data protection / DPIA risk register;
- business continuity risk register;
- AI risk register;
- control assurance register.

Templates should provide structured starting points. They must not imply that using a template makes an organisation compliant with a standard.

---

## 2. Product Rationale

Custom Risk is designed to support flexible, configurable risk registers. This flexibility is powerful, but it can create setup effort for new users or organisations that do not yet have a mature risk methodology.

A Register Template Library helps by providing pre-built configurations that reflect common patterns and standards-aligned use cases.

This supports the product principles of:

1. **Usability first:** Register Admins can start from a useful configuration rather than a blank register.
2. **Flexible configuration:** templates are starting points, not hard-coded methodologies.
3. **Transparency and ownership:** templates can include fields and views that make ownership clearer.
4. **Auditability:** template use, publication, and changes should be traceable.
5. **Self-managing process:** templates can include review settings, validation rules, and dashboard/reporting presets.

---

## 3. Scope

This is a post-MVP feature.

The MVP deliberately focuses on direct register configuration and excludes register templates, register configuration import/export, register-local templates, versioned template migration, draft/publish configuration lifecycle, and configuration impact analysis.

The first version of this feature should focus on:

1. System Admin-managed templates.
2. Published templates available to Register Admins.
3. Template use during new register creation.
4. Copying template configuration into a register.
5. Recording which template and version were used.
6. Auditing template lifecycle and template application events.

The first version should not automatically update existing registers when a template changes.

---

## 4. Design Principles

1. **Templates are starting points:** using a template creates an editable register configuration.
2. **No silent changes:** updates to a template must not automatically change existing registers.
3. **Versioned and traceable:** template versions must be identifiable and auditable.
4. **Standards-aligned, not compliance-guaranteeing:** templates may align to standards but must not claim to make an organisation compliant.
5. **Controlled publishing:** only approved/published template versions are available to Register Admins.
6. **Safe evolution:** future template updates should use preview, diff, and impact analysis before applying changes to existing registers.
7. **Organisation-specific flexibility:** System Admins can maintain internal templates tailored to the organisation’s terminology and methodology.
8. **Import/export-ready:** the design should not prevent future template import/export or sharing between environments.

---

## 5. Core Concepts

### 5.1 Register Template

A Register Template is a reusable configuration package that can be used to create a register.

A template may define:

- register settings;
- custom fields;
- dropdown options;
- likelihood values;
- impact values;
- risk levels;
- risk matrix mappings;
- response strategies;
- risk response action mode;
- response action fields;
- review settings;
- validation rules;
- field visibility rules;
- dashboard or table presets;
- export presets;
- optional starter/example risks;
- optional guidance notes.

### 5.2 Template Version

A Template Version is a specific published or draft version of a template.

Templates should be versioned so that registers can record exactly which version was used.

Example:

```text
ISO 27001:2022 Information Security Risk Register
Version 1.0
Version 1.1
Version 1.2
```

### 5.3 Published Template

A Published Template Version is available for Register Admins to use.

Draft, deprecated, or retired templates should not be available for new register creation unless a System Admin explicitly allows it.

### 5.4 Template Application

Template Application is the act of using a template version to create or configure a register.

For v1 of this feature, applying a template should copy the template configuration into the register. The register should then have its own independent configuration.

### 5.5 Template Lineage

Template Lineage records which template and template version were used to create or initialise a register.

A register should retain this lineage even if the register configuration later diverges from the template.

---

## 6. Template Types

The system should support at least two conceptual template sources over time.

### 6.1 System Templates

System Templates are managed by System Admins and available across the application.

They may be:

- created manually;
- imported from a template file;
- supplied as seed templates;
- copied from an existing register configuration in a later version.

System Templates are the focus of v1.

### 6.2 Register-Local Templates

Register-Local Templates are templates saved from or scoped to a particular register or register family.

These are out of scope for v1, but the data model should not prevent them later.

---

## 7. Example Template Use Cases

### 7.1 ISO/IEC 27001:2022 Information Security Risk Register

A template aligned to ISO/IEC 27001:2022 information security risk management and control-assurance use cases.

It may include fields such as:

- Information asset;
- Business owner;
- Threat source;
- Vulnerability;
- Existing controls;
- Risk treatment decision;
- Related Annex A control;
- Statement of Applicability reference;
- Residual risk acceptance;
- Risk acceptance owner;
- Review frequency;
- Evidence reference.

Important wording:

The template should be described as:

```text
Aligned to ISO/IEC 27001:2022 information security risk management and control-assurance use cases.
```

It should not be described as:

```text
Meets all ISO 27001:2022 requirements.
```

Using the template does not make an organisation compliant.

### 7.2 Supplier Risk Register

A supplier risk template may include:

- supplier name;
- service description;
- data classification;
- criticality;
- contract owner;
- assurance status;
- due diligence status;
- exit plan status;
- review date;
- residual risk acceptance.

### 7.3 Project Risk Register

A project risk template may include:

- project name;
- project phase;
- delivery owner;
- dependency;
- milestone impact;
- cost impact;
- schedule impact;
- issue escalation status.

### 7.4 Data Protection / DPIA Risk Register

A data protection risk template may include:

- processing activity;
- data subject category;
- personal data category;
- special category data;
- lawful basis;
- DPIA reference;
- privacy risk;
- mitigation;
- DPO review status.

### 7.5 AI Risk Register

An AI risk template may include:

- AI system name;
- model/provider;
- use case;
- impacted users;
- data sensitivity;
- human oversight;
- bias/fairness risk;
- explainability risk;
- security risk;
- legal/regulatory concern;
- monitoring approach.

---

## 8. Template Contents

A template may contain all or part of a register configuration.

### 8.1 Register Settings

Template-defined register settings may include:

- register name suggestion;
- description;
- Risk ID prefix suggestion;
- Risk ID zero-padding setting;
- default state;
- review enablement;
- default review frequency;
- review attestation text;
- viewer export default.

When creating a register from a template, the Register Admin should still be able to set a register-specific name and description.

### 8.2 Custom Fields

A template may define custom fields including:

- field name;
- field type;
- help text;
- required setting;
- display order;
- active/inactive state;
- dropdown options where applicable;
- field visibility settings where supported.

### 8.3 Scoring Configuration

A template may define:

- likelihood values;
- impact values;
- risk levels;
- risk matrix mappings;
- default scoring formula where formula configuration is supported;
- inherent/residual mode where supported.

### 8.4 Risk Response Configuration

A template may define:

- response strategies;
- simple field mode or child-record mode;
- Risk Response Action fields;
- action statuses;
- action categories;
- affects values;
- review settings for actions where supported.

### 8.5 Validation Rules

A template may define:

- required fields;
- warning rules where supported;
- block-save rules;
- review date rules;
- state transition rules in a future version.

### 8.6 Dashboard and Table Presets

A template may define suggested views such as:

- default table columns;
- saved filters;
- dashboard widgets;
- grouped views;
- review-focused views;
- audit-preparation views.

This may be deferred beyond v1 if saved views are not yet implemented.

### 8.7 Optional Starter Risks

A template may optionally include starter or example risks.

Starter risks should be optional at register creation time.

Register Admins should be able to choose:

- create register with configuration only;
- create register with configuration and example risks.

Example risks must be clearly marked as examples or starter content.

---

## 9. Template Lifecycle

Templates should support the following lifecycle states.

### 9.1 Draft

The template is being edited and is not available to Register Admins.

### 9.2 Published

The template version is approved and available for use.

Only published versions should be selectable by Register Admins during register creation.

### 9.3 Deprecated

The template version is no longer recommended for new registers but may remain visible for existing lineage and historical reference.

System Admins may choose whether deprecated templates remain selectable.

### 9.4 Retired

The template version is no longer available for new use.

Existing registers that used the retired version retain lineage.

---

## 10. Template Versioning

Templates should be versioned.

A version should become immutable once published, except for limited metadata corrections if explicitly allowed.

Recommended versioning fields:

- major version;
- minor version;
- patch version or revision;
- status;
- published date;
- published by;
- change notes;
- superseded by version.

Example:

```text
ISO 27001:2022 Information Security Risk Register v1.2
```

### 10.1 Version Immutability

Published template versions should not be edited in place in ways that change their configuration meaning.

Instead, System Admins should create a new version.

This protects auditability and allows registers to record exactly which configuration was used.

### 10.2 Change Notes

Each published version should include change notes.

Examples:

- Added Supplier Criticality field.
- Updated default risk matrix.
- Added Annex A control reference dropdown.
- Deprecated old Treatment Status values.

---

## 11. Creating a Register from a Template

### 11.1 User Flow

A Register Admin or System Admin creates a new register.

The flow should allow the user to:

1. choose whether to start from blank or from template;
2. browse published templates;
3. preview template contents;
4. select a template version;
5. enter register-specific details;
6. optionally include starter risks if the template provides them;
7. create the register.

### 11.2 Template Preview

The preview should show:

- template name;
- version;
- description;
- intended use;
- standard or framework alignment;
- included fields;
- scoring model;
- response strategies;
- review settings;
- optional starter risks;
- known assumptions or limitations.

### 11.3 Copy-on-Create Behaviour

For v1, applying a template should copy the template configuration into the new register.

The created register should then be independent.

Later changes to the template should not automatically affect the register.

### 11.4 Register Lineage

The created register should record:

- template ID;
- template name at time of use;
- template version ID;
- template version number;
- applied by user;
- applied at timestamp;
- whether starter risks were included.

---

## 12. Applying Templates to Existing Registers

Applying a template to an existing register is more complex because it may change fields, scoring, matrix values, response action structures, review behaviour, and validation.

This should be deferred until the product supports configuration diff and impact analysis.

A future version should support:

1. selecting an existing register;
2. selecting a template version;
3. previewing configuration differences;
4. identifying affected risks and fields;
5. mapping old fields to new fields;
6. warning about possible data loss;
7. showing scoring and matrix recalculation effects;
8. requiring explicit confirmation;
9. writing audit records;
10. optionally creating a new register configuration version.

For v1, templates should primarily be used when creating new registers.

---

## 13. Template Updates and Register Migration

Template updates must not silently update existing registers.

A future controlled migration process may allow a Register Admin or System Admin to apply a newer template version to an existing register.

### 13.1 Update Notification

The system may show:

```text
A newer version of the template used by this register is available.
```

### 13.2 Diff and Impact Analysis

Before applying a template update, the system should show:

- added fields;
- removed or deactivated fields;
- changed field requirements;
- changed dropdown values;
- changed scoring values;
- changed matrix cells;
- changed review settings;
- affected risk count;
- fields requiring mapping;
- potential data loss;
- recalculation impact.

### 13.3 Controlled Application

A template update should only be applied after explicit confirmation.

The update should be audited and, where configuration versioning exists, should create a new register configuration version.

---

## 14. Permissions

### 14.1 System Admin

System Admins can:

- create templates;
- edit draft templates;
- create new template versions;
- publish templates;
- deprecate templates;
- retire templates;
- import templates;
- export templates;
- delete draft templates where safe;
- view template audit history;
- manage all system template settings.

### 14.2 Register Admin

Register Admins can:

- view published templates;
- create a new register from a published template where they have permission to create registers;
- apply a published template to a register only where the product supports safe application and they have configuration permission;
- view template lineage for registers they administer.

Whether Register Admins can create registers remains subject to the product phase and permission model. In the MVP, register creation is System Admin only.

### 14.3 Risk Owner

Risk Owners do not manage templates.

### 14.4 Register Viewer

Register Viewers do not manage templates.

They may see template lineage only where it is shown as non-sensitive register metadata.

---

## 15. Admin UI Requirements

The Admin area should include a Template Library section.

### 15.1 Template List

The template list should show:

- template name;
- description;
- category/type;
- status;
- latest version;
- published date;
- published by;
- number of registers created from template;
- last updated date.

### 15.2 Template Detail

Template detail should show:

- metadata;
- versions;
- lifecycle status;
- included configuration summary;
- change notes;
- audit history;
- registers created from the template.

### 15.3 Template Editor

The template editor should allow System Admins to define or edit:

- metadata;
- register settings;
- custom fields;
- dropdown values;
- scoring values;
- risk levels;
- matrix;
- response strategies;
- response action settings;
- review settings;
- optional starter risks;
- guidance notes.

Editing a published template version should be restricted. System Admins should create a new draft version for material changes.

### 15.4 Publish Flow

Publishing should require:

- validation that the template is complete;
- confirmation;
- version number;
- change notes;
- optional effective date;
- optional deprecation of previous version.

---

## 16. Register Creation UI Requirements

When creating a register, authorised users should be able to choose:

```text
Start from blank register
```

or:

```text
Start from template
```

If starting from a template, the UI should support:

- searching templates;
- filtering by category/type;
- viewing template details;
- selecting a version;
- previewing included fields and settings;
- confirming register-specific settings;
- choosing whether to include starter risks where available.

---

## 17. Audit Requirements

The following events should be audited:

- template created;
- template updated;
- template version created;
- template version published;
- template version deprecated;
- template version retired;
- template imported;
- template exported;
- template deleted where allowed;
- register created from template;
- template applied to existing register in a future version;
- template migration completed in a future version.

Audit records should include:

- actor;
- timestamp;
- template ID;
- template name;
- template version;
- action;
- previous value and new value where relevant;
- affected register where relevant;
- summary;
- structured metadata.

When a register is created from a template, the audit event should capture:

- template name;
- template version;
- applied configuration summary;
- whether starter risks were included;
- user who applied it;
- timestamp.

---

## 18. Data Model Considerations

This feature is post-MVP and should not change the MVP data model.

A future data model should consider the following entities.

### 18.1 Register Template

Stores the template identity.

Possible fields:

- id;
- name;
- description;
- template_type;
- standard_or_framework;
- owner_user_id;
- status;
- latest_version_id;
- created_at;
- created_by_user_id;
- updated_at;
- updated_by_user_id.

### 18.2 Register Template Version

Stores an immutable version of template configuration.

Possible fields:

- id;
- register_template_id;
- version_number;
- status;
- configuration_json;
- starter_risks_json;
- change_notes;
- published_at;
- published_by_user_id;
- deprecated_at;
- retired_at;
- created_at;
- created_by_user_id.

The full template configuration may be stored as structured JSON initially, or normalised into child tables if needed.

### 18.3 Register Template Application

Stores the relationship between a register and the template version used.

Possible fields:

- id;
- register_id;
- register_template_id;
- register_template_version_id;
- template_name_snapshot;
- template_version_snapshot;
- applied_at;
- applied_by_user_id;
- included_starter_risks;
- application_mode;
- metadata_json.

### 18.4 Template Audit Metadata

Template actions may be represented in the existing audit model if it supports system-scoped events.

Audit metadata should preserve enough context to understand what changed.

---

## 19. API Considerations

Possible future endpoints:

```text
GET /api/v1/register-templates
POST /api/v1/register-templates
GET /api/v1/register-templates/:templateId
PATCH /api/v1/register-templates/:templateId

GET /api/v1/register-templates/:templateId/versions
POST /api/v1/register-templates/:templateId/versions
GET /api/v1/register-templates/:templateId/versions/:versionId
POST /api/v1/register-templates/:templateId/versions/:versionId/publish
POST /api/v1/register-templates/:templateId/versions/:versionId/deprecate
POST /api/v1/register-templates/:templateId/versions/:versionId/retire

POST /api/v1/registers/from-template
GET /api/v1/registers/:registerId/template-lineage

POST /api/v1/register-templates/import
GET /api/v1/register-templates/:templateId/versions/:versionId/export
```

A future route map should define request/response shapes, permissions, and audit events.

---

## 20. Validation Rules

Template validation should check:

- template name is required;
- template name is unique or versioned clearly;
- version number is required;
- published version has a complete configuration;
- required dropdown fields have options;
- scoring configuration is complete;
- every active likelihood/impact combination has a matrix cell;
- referenced fields and options exist within the template;
- starter risks match the template configuration;
- no duplicate field names within a template;
- no duplicate dropdown option names within a field;
- no invalid characters in suggested Risk ID prefix;
- no unsupported field types for the target product version.

When creating a register from a template, the system should validate that the template version is still usable.

---

## 21. Import and Export

Template import/export should be considered for a later version.

### 21.1 Export

System Admins may export a template version to a portable file.

The export should include:

- metadata;
- version;
- configuration;
- starter risks if included;
- compatibility information;
- export timestamp.

### 21.2 Import

System Admins may import a template file.

The import flow should:

- validate schema;
- show preview;
- identify conflicts;
- allow import as new template or new version;
- block unsafe or unsupported content;
- audit the import.

---

## 22. Standards-Aligned Templates

Templates may be aligned to standards, frameworks, or best practices.

Examples:

- ISO/IEC 27001:2022;
- NIST Cybersecurity Framework;
- NIST SP 800-53;
- CIS Controls;
- Cyber Essentials;
- SOC 2;
- PCI DSS;
- GDPR / data protection risk;
- business continuity standards;
- internal enterprise risk methodology.

### 22.1 Wording Rules

The system should avoid implying certification or compliance.

Use wording such as:

```text
Aligned to ISO/IEC 27001:2022 risk management and control-assurance use cases.
```

Avoid wording such as:

```text
ISO 27001 compliant template.
```

or:

```text
Meets all ISO 27001 requirements.
```

### 22.2 Template Disclaimer

Standards-aligned templates should include a disclaimer such as:

```text
This template provides a configurable starting point aligned to common risk management and assurance practices. It does not guarantee compliance, certification, audit success, or suitability for your organisation's scope, context, or legal obligations.
```

---

## 23. Example: ISO/IEC 27001:2022 Template Contents

An ISO/IEC 27001:2022-aligned template may include:

### 23.1 Suggested Fields

| Field | Type | Notes |
|---|---|---|
| Information Asset | Text | Asset or process affected by the risk. |
| Asset Owner | Person Picker | Business or system owner. |
| Threat | Text or Dropdown | Threat scenario. |
| Vulnerability | Multi-line Text | Weakness or exposure. |
| Existing Controls | Multi-line Text | Current controls in place. |
| Related Annex A Control | Dropdown or Text | Optional reference. |
| Risk Treatment Decision | Dropdown | Accept, Mitigate, Transfer, Avoid. |
| Treatment Plan | Multi-line Text | Planned response. |
| Treatment Owner | Person Picker | Owner of treatment activity. |
| Target Treatment Date | Date | Planned completion date. |
| Residual Risk Accepted | Boolean | Whether accepted. |
| Acceptance Owner | Person Picker | Person accepting residual risk. |
| Acceptance Date | Date | Date accepted. |
| Evidence Reference | Text | Link/reference to evidence repository. |

### 23.2 Suggested Dropdowns

Risk Treatment Decision:

- Accept
- Mitigate
- Transfer
- Avoid

Control Maturity:

- Not Implemented
- Planned
- Partially Implemented
- Implemented
- Reviewed
- Ineffective

Assurance Status:

- Not Assessed
- In Review
- Satisfactory
- Needs Improvement
- Failed

### 23.3 Suggested Review Settings

- reviews enabled;
- default review frequency of 12 months;
- shorter review frequency for high or critical residual risk where rule-based reviews are supported;
- attestation text requiring the Risk Owner to confirm that risk details, treatment status, and residual risk assessment remain accurate.

### 23.4 Suggested Notes

The template should explain that ISO/IEC 27001:2022 requires organisations to define and operate risk management processes appropriate to their context. The template provides structure but does not replace the organisation's risk assessment methodology, Statement of Applicability, internal audit, or certification process.

---

## 24. Edge Cases

### 24.1 Template Deleted After Use

Published template versions used by registers should not be hard-deleted.

They may be retired, but lineage should remain intact.

### 24.2 Register Diverges from Template

A register may be edited after creation from a template.

The system should record the original template lineage but should not assume the register still matches the template.

A future version may calculate drift or divergence.

### 24.3 Template Version Retired

Existing registers created from a retired template version remain valid.

The retired version should remain available for lineage and audit reference.

### 24.4 Starter Risks Included by Mistake

Starter risks should be clearly marked and optional.

If starter risks are included, they become normal risk records after creation and follow normal edit/delete/audit rules.

### 24.5 Product Version Compatibility

A template may require features not available in the current product version.

The system should block or warn before using an incompatible template.

### 24.6 Standards Change

If a standard is updated, System Admins should create a new template version or new template aligned to the updated standard.

Existing registers should not change automatically.

---

## 25. Future Enhancements

Future versions may support:

- applying templates to existing registers;
- template diff and impact analysis;
- template version migration;
- register-local templates;
- save current register configuration as template;
- template import/export;
- vendor-supplied template packs;
- organisation-specific template packs;
- template marketplace or shared library;
- template ratings or usage metrics;
- template compatibility checks;
- template drift detection;
- automatic suggestions for fields or scoring improvements;
- example risk packs;
- control library integration;
- standards mapping and evidence views;
- guided setup wizard based on selected standard;
- template-based reporting presets;
- multi-language template labels and guidance.

---

## 26. Out of Scope for v1 of This Feature

The following are out of scope for the first version:

- automatic updates to existing registers when a template changes;
- applying a template to a populated register without impact analysis;
- template marketplace;
- third-party/vendor-maintained templates;
- certification or compliance guarantees;
- automatic standards compliance assessment;
- register-local template creation by Register Admins;
- complex migration between template versions;
- full configuration drift analysis;
- template-based control testing or evidence management.

---

## 27. Open Implementation Questions

1. Should System Admins be able to create templates entirely manually in the UI for v1, or should v1 start with import/seeded templates only?
2. Should starter risks be supported in v1 or deferred?
3. Should template configuration be stored as JSON snapshots, normalised rows, or both?
4. Should Register Admins be able to request new templates from System Admins?
5. Should deprecated templates remain selectable by Register Admins?
6. Should template version numbers follow semantic versioning?
7. Should templates include recommended guidance text for each field?
8. Should a register show that it has diverged from the original template?
9. Should template export/import be included in the first release of this feature?
10. Should standards-aligned templates include formal disclaimers in the UI?
