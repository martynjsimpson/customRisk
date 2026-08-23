# Templates

Templates allow System Administrators to save a complete register configuration — including custom fields, scoring model, risk levels, and settings — and reuse it when creating new registers. This ensures consistency across registers that share the same structure or governance framework.

> **Note:** The Templates feature is only available to System Administrators and must be enabled via a feature flag. If you do not see a Templates option in the navigation, this feature is not currently enabled in your environment.

## What Does a Template Contain?

A template stores a complete snapshot of a register's configuration at a point in time. This includes:

- Register settings (risk ID format, default risk state, review frequency, attestation text)
- All custom field definitions (field type, labels, options, validation rules)
- The full scoring model — likelihood values, impact values, and risk level thresholds
- The risk matrix — the cell-by-cell mapping of likelihood × impact to risk level

Templates do **not** contain any risk data. They capture structure and configuration only.

## Creating a Template

There are two ways to create a template:

- **From the Templates page** — upload a JSON configuration file and give the template a name and optional description. The uploaded file becomes version 1 of the template, published immediately.
- **From an existing register** — within a register's Configuration tab, you can save its current configuration as a new template. This also automatically links that register to the new template.

> **Tip:** The easiest way to get a valid configuration file is to configure one register manually to your desired standard, then create a template from it. You can then use that template for all future registers with the same structure.

## Template Versions

Templates are versioned. When you update a template's configuration, a new version is published (v2, v3, and so on). Each version is a complete configuration snapshot — not a diff.

Publishing a new template version does **not** automatically update any registers that were created from an earlier version. Registers remain on the version they were linked to until an administrator explicitly applies the update.

> **Note:** Only the template's name and description can be edited in place. To change the configuration, you must publish a new version by uploading an updated config file.

## Creating a Register from a Template

From the Templates page, click **Create register** on the template you want to use. You will be asked to supply a name for the new register. All configuration from the template's latest published version is copied across automatically.

The new register is linked to the template version it was created from. This link is visible in the register's Configuration tab and allows administrators to track whether the register is up to date with the latest template version.

> **Tip:** When creating a register from a template, the register's configuration is an independent copy. Changes you make to the register later will not affect the template, and changes to the template will not automatically affect the register.

## Template Linking and Updates

Registers created from a template maintain a link back to the template version they were built from. In the register's Configuration tab, administrators can see:

- Which template and version the register is linked to
- Whether the register is on the latest published version of the template

If the template has been updated since the register was created, two additional actions become available:

- **Compare** — shows a detailed diff between the register's current configuration and the latest template version, including which custom fields, scoring values, or settings have changed.
- **Apply latest** — creates a draft configuration for the register based on the latest template version. The draft must be reviewed and published before it takes effect. This gives administrators a chance to review the changes before they become live.

A register can also be **unlinked** from its template (System Administrators only). The register retains its current configuration but is no longer tracked against template versions.

### Template Update Notifications

If a register's linked template publishes a newer version, an orange banner appears at the top of the register's page — on every tab, not only Configuration — so Register Admins notice the update even if they do not regularly visit the Configuration tab. The banner's **View changes** button takes you to the Configuration tab, where you can use **Compare** and **Apply latest** as described above.

The banner disappears once the register is on the latest published version of its template, or if the register is not linked to a template at all.

> **Note:** Publishing a manual draft (one not created from **Apply latest**) does **not** unlink the register from its template. The register stays linked at the same template version it was already on. If the template is updated again afterwards, the drift banner appears as usual — publishing your own changes does not exempt the register from future drift notifications.

## Deactivating a Template

Templates can be deactivated when they are no longer needed. A deactivated template cannot be used to create new registers, but existing registers that are linked to it are not affected — they retain their configuration and can still compare against the template's versions.

> **Warning:** Deactivating a template is not reversible through the UI. Contact your system administrator if a template needs to be reinstated.
