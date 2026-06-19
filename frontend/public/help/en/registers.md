# Registers

A register in customRisk is a scoped collection of risks. You might have one register per project, per team, per business unit, or per compliance framework — whatever makes sense for your organisation.

## Viewing Registers

Navigate to **Registers** in the left-hand menu to see all registers you have access to. Each row shows the register name, your current role within it, the number of open risks, and the number of overdue reviews.

Click on a register name to open it. The register detail view is organised into tabs:

- **Risks** — the main risk table for this register. All open and closed risks are visible here.
- **Configuration** (admin only) — manage the register's name, description, custom fields, scoring model, and settings.
- **Permissions** (admin only) — manage which users have access to this register and what role they hold.
- **Audit** (admin only) — the full change history for this register.

## Creating a Register (Administrator)

Only System Administrators can create new registers. From the Registers page, click **Create register** and follow the setup wizard. You will be prompted to provide:

- A name and optional description for the register
- Initial scoring configuration (likelihood and impact scales)
- Any custom fields specific to your register

> **Note:** You can always change the register configuration after creation. Changing the scoring model will affect how existing risk scores are calculated and displayed going forward.

## Register Configuration

### Settings

The Settings tab under Configuration allows you to rename the register, update its description, configure the risk ID format, set the default risk state for new risks, manage review settings (frequency, attestation text), and toggle features such as viewer export and custom field validation.

### Custom Fields

Every register can have its own set of custom fields in addition to the standard risk fields. Custom fields allow you to capture organisation-specific information such as regulatory category, business owner, or treatment cost.

Supported field types include:

- **Text** — free-form short text
- **Text area** — longer free-form text
- **Number** — numeric values
- **Date** — date picker
- **Select** — single choice from a defined list
- **Multi-select** — multiple choices from a defined list
- **User** — select a user from the system
- **Checkbox** — true/false toggle
- **Calculated** — a value derived automatically from other fields using a formula

The display order of custom fields is configurable — drag the rows in the Fields tab to reorder them. This order is reflected in the risk detail view and the risk create/edit form.

### Scoring

The scoring model defines how likelihood and impact values map to a risk level. You can configure the number of levels, the labels, and the thresholds that determine when a risk is classified as Low, Medium, High, or Critical.

> **Tip:** Align your scoring model with your organisation's existing risk framework if one exists — this makes it easier for users to apply their existing judgement to the scoring scales.

## Draft Configuration and Edit Mode

When the version-controlled configuration feature is enabled, register configuration is protected by a **draft and publish workflow**. You cannot edit configuration directly — all changes must first be staged in a draft, reviewed, and then explicitly published before they affect the live register and its risks.

This exists because configuration changes can have significant downstream effects on existing risks. For example, changing the scoring model will cause every open risk to have its risk level recalculated. The draft workflow gives administrators the opportunity to understand that impact before committing to it.

### The two states

A register's configuration is always in one of two states:

- **Locked (no draft)** — the Configuration tab is visible but all editing controls are disabled. The current published configuration is shown for reference only. A banner at the top displays the current published version number.
- **Edit mode (draft active)** — a draft has been created and the configuration tabs are fully editable. A yellow banner at the top warns that changes are not yet published and will not affect the live register until you do so.

### Creating a draft

Click **Create Draft** in the configuration banner to enter edit mode. This creates a copy of the current published configuration as a new draft. The live configuration is completely untouched — everything you edit from this point affects the draft only.

> **Note:** Only one draft can exist at a time for a given register. If a draft already exists, the Create Draft button is unavailable. This prevents two administrators from making conflicting changes simultaneously.

### Making changes

While a draft is active, all changes made in the Settings, Custom Fields, and Scoring tabs are saved to the draft. Users viewing the register's risks see the live configuration — they are completely unaffected by anything in the draft until it is published.

### Impact analysis

Before publishing, it is strongly recommended to run an **Impact Analysis**. This examines the differences between the draft and the live configuration and reports:

- **Blockers** — errors that will prevent publishing entirely, such as having no active likelihood values, no active impact values, or no active risk levels. These must be resolved before the draft can be published.
- **Warnings** — non-blocking changes that will affect existing risks. For example, if you deactivate a likelihood value that is currently in use, the analysis reports how many risks will have that value cleared on publish. Warnings do not stop you from publishing, but you should understand their consequences before proceeding.
- **Affected risk counts** — a breakdown of how many existing risks will be affected by deactivated likelihood values, impact values, or custom fields.

> **Tip:** Always run impact analysis before publishing a draft that modifies the scoring model or deactivates custom fields. Changes to the risk matrix will trigger an automatic recalculation of the risk level for every open risk in the register.

### Publishing

Click **Publish** to make the draft live. Publishing is an all-or-nothing operation — either all changes go live or none do. During publish, the system:

- Applies all configuration changes from the draft to the live register
- Recalculates the risk level for every open risk using the new scoring matrix — risks may move between risk levels as a result
- Deactivates any scoring values or custom fields that were removed in the draft (existing risk data using those values is cleared)
- Records the published configuration as a new numbered version in the audit history

After a successful publish, the configuration returns to the locked state showing the new version number. The previous published version is retained in the audit history.

### Discarding a draft

> **Warning:** Clicking **Discard Draft** permanently deletes the draft and all changes within it. This cannot be undone. The configuration reverts to the last published version.

### Drafts and templates

When you apply a template update to a register (via the template link panel in the Configuration tab), the system creates a draft pre-populated with the template's configuration. This draft follows exactly the same workflow as a manually created draft — you can review and modify it before publishing, or discard it if you change your mind. Applying a template update requires that no draft already exists.

## Register Permissions

Access to each register is controlled at the user level. Under the Permissions tab of a register, System Administrators can assign users one of the following roles:

- **Viewer** — can view risks but cannot create or edit them.
- **Editor** — can create, edit, and review risks. This is the standard role for risk owners and contributors.
- **Admin** — full access including register configuration and permissions management.

> **Note:** System Administrators have implicit access to all registers regardless of whether they have been explicitly assigned a role.

## Configuration Export and Import

A register's published configuration can be exported as a JSON file from the **Configuration** tab. The exported file contains the complete configuration snapshot — custom fields, scoring model, risk levels, and settings — and is the same format used by the Templates feature.

This exported JSON can be used as the basis for a new template. Navigate to Templates, create a new template, and upload the file. From there the template can be used to create new registers with the same configuration, or shared with another instance of customRisk.

> **Note:** Importing a configuration file does not directly apply it to an existing register. The import flow creates or updates a template — from which a new register can be created, or from which an update can be applied to a linked register via the standard draft and publish workflow.

## Archiving a Register

Registers can be soft-deleted (archived) by System Administrators. An archived register and all its risks are removed from the active view but are retained in the system for audit and reporting purposes.

> **Warning:** Archiving a register is a significant action. All risks within the register will become inaccessible to users. Contact your System Administrator if you need a register restored.
