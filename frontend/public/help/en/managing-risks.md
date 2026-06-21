# Managing Risks

This section covers the day-to-day activities involved in creating, updating, and reviewing risks within a register.

## Creating a Risk

From within a register, click **Add risk** to open the risk creation form. The following standard fields are available on every risk:

- **Title** — a short, descriptive name for the risk.
- **Description** — a fuller explanation of the cause, event, and potential consequence.
- **State** — Draft, Open, or Closed. The default state is configurable per register.
- **Likelihood** — how likely is the risk to occur?
- **Impact** — how severe would the consequence be?
- **Owner** — the person responsible for managing this risk.
- **Next review date** — when this risk should next be formally reviewed.
- **Risk Response Strategy** — the approach being taken to address the risk (e.g. Mitigate, Accept, Transfer, Avoid).
- **Risk Response Action** — notes on the specific actions being taken.

Any custom fields configured for the register will also appear in the form. Custom fields may show a coloured asterisk next to their label: a red `*` means the field is required and you will not be able to save the risk until it is filled in, while a yellow `*` means the field is suggested — you will see a warning if it is left empty, but you can still save.

> **Tip:** A well-written risk title is concise but specific. Avoid vague titles like "Financial risk" — prefer something like "Budget overrun due to unplanned contractor costs".

## Editing a Risk

To edit a risk, click its row in the risk table to open the risk detail panel, then click the **Edit** button. This opens the full edit form for that risk.

All standard fields are editable, as are any custom fields configured for the register. Edits are subject to your permissions: Editor and Admin roles can edit all fields, while Viewers cannot make changes.

Changing the likelihood or impact values will immediately recalculate the risk level using the register's current scoring model. The updated risk level is reflected as soon as the change is saved.

If the register has any **Calculated** custom fields, a live preview of each calculated value is shown while you edit. The preview updates as you change the numeric fields it references and is displayed in italic, dimmed text labelled "Preview — saved on submit". This is a guide only — the server evaluates the formula authoritatively when the risk is saved, and the stored value may differ if the formula depends on data that is only available server-side.

The same asterisk convention that applies to the create form also applies here: a red `*` next to a custom field label means the field is required; a yellow `*` means it is suggested. See [Creating a Risk](#creating-a-risk) for details.

> **Note:** All edits are recorded in the audit trail. The previous values are captured in the audit log so the full change history is always available.

## Deleting a Risk

> **Warning:** Deleting a risk is permanent and cannot be undone. Only register Admins and System Administrators can delete risks.

Before deletion, a full snapshot of the risk — including all its fields, scoring, and review history — is recorded in the audit log. This ensures that evidence of the risk's existence and management is never lost, even after the risk itself has been removed.

> **Tip:** In most cases, closing a risk is preferable to deleting it. A closed risk remains visible in the register with its full history intact, and is excluded from review tracking without losing any of its information. Reserve deletion for cases where a risk was created in error.

## The Risk Detail Panel

Clicking any row in the risk table opens the **risk detail panel** — a slide-out drawer that shows the full information for that risk without leaving the register view.

The panel displays:

- All standard fields: title, description, owner, state, likelihood, impact, risk response strategy, risk response action, and next review date
- Any custom fields configured for the register
- The calculated risk level, displayed with its colour indicator
- The current review status
- The complete review history — each entry shows who submitted the review, when, any comment left, and the next review date that was set
- The audit history for that risk

From the panel you can click **Review** to submit a new review, or **Edit** to open the full edit form. Close the panel by clicking anywhere outside it or pressing `Escape`.

## Risk IDs

Each risk is automatically assigned a unique display ID within its register (e.g. `RISK-001`). This ID is stable and can be used to reference a specific risk in conversations, reports, or other documentation.

> **Note:** The display ID prefix is derived from the register name and is set when the register is created. It can be changed in the register Settings tab.

## Risk Levels

The risk level is automatically calculated from the combination of likelihood and impact scores, using the scoring model configured for the register. Common levels are Low, Medium, High, and Critical.

The colour coding and thresholds for these levels are set by the register administrator and should reflect your organisation's risk appetite.

## Inherent and Residual Risk

When a register is configured to use inherent and residual risk scoring, the risk creation and edit form shows two separate scoring sections: one for the **inherent risk** (before controls) and one for the **residual risk** (after controls). Each section has its own likelihood and impact fields, and each produces its own calculated risk level.

Both risk levels are displayed in the risk table, allowing you to see at a glance both your raw exposure and your managed exposure for each risk.

> **Note:** Inherent and residual risk scoring is optional and is configured by the register administrator. If only a single risk score is shown in the form and the risk table, this mode is not enabled for your register.

## Reviewing a Risk

Users with edit access can submit a review from the risk detail panel by clicking the **Review** button. The review form asks you to:

- Read and confirm the register's review attestation statement (this text is configured per register by the administrator)
- Optionally add a comment about the review

On submission, the next review date is automatically calculated based on the register's default review frequency. You do not set the next review date manually — it is derived from the register configuration.

Each completed review is recorded in the risk's review history, showing who reviewed it, when, any comment left, and the next review date that was set.

> **Note:** Submitting a review does not change the risk's state or any of its fields. If you need to update the likelihood, impact, or other details, edit the risk separately before or after completing the review.

## My Risks

The **My Risks** page provides a single view of all risks assigned to you across every register you have access to. This is particularly useful if you own risks across multiple registers.

From My Risks you can open any risk to view its detail, submit a review, or update its information — without needing to navigate to each register separately.

You can filter by state, risk level, and register. Use the column picker to choose which fields appear in the table, including custom fields from any register you have access to.

## Filtering and Sorting Risks

The risk table within a register supports filtering and sorting to help you focus on what matters:

- Filter by risk level, owner, review status, or custom field values
- Sort by any column (click the column header)
- Use the column picker to show or hide columns, including custom fields

Filters are applied in combination — for example, you can filter to show only **High** risks that are **overdue for review**.

## Exporting Risks as CSV

The risk table toolbar includes an **Export** button that downloads the current view as a CSV file. The export respects any filters that are currently active — only the risks visible in the table at the time of export are included in the file.

This means you can use filters to scope your export before downloading. For example, filter to show only High and Critical risks that are overdue for review, then export — the CSV will contain only those risks.

The exported CSV can be opened in any spreadsheet application such as Microsoft Excel or Google Sheets for offline analysis or reporting.

## Response Actions

Response Actions let you track the specific steps being taken to address a risk. customRisk supports two modes, configured per register.

### Response Action Mode

Every register has a **Response Action Mode** setting, which controls how response actions are captured:

- **Simple** — each risk has a single free-text field for recording response action notes. This is the default for all registers.
- **Child Records** — each risk can have multiple response action records, each with a Response description, a Status, and an Owner. This mode is designed for teams that need to track several parallel actions per risk, assign individual actions to named owners, and track progress through a defined status workflow.

### Switching to Child Records mode

Only a Register Admin can enable Child Records mode. To do so:

1. Open the register and navigate to the **Configuration** tab.
2. Select the **Settings** section.
3. In the **Response Actions** panel, click **Switch to Child Records mode**.
4. Confirm the change in the dialog that appears.

When you switch to Child Records mode, any existing response action text saved on risks in the register is automatically converted into individual child action records (one per risk, with the status set to **Planned** and no owner assigned). This conversion is permanent and cannot be reversed in the current release.

### Managing Response Actions (Child Records mode)

When a register is in Child Records mode, the response action panel appears inside the risk detail view (opened by clicking a risk row in the register).

To add an action, Register Admins and Risk Owners can click the **Add Action** button in the Response Actions panel. This opens a form with the following fields:

- **Response** (required) — a description of the action being taken.
- **Status** — the current progress of the action. Options are: Planned, In Progress, Implemented, Deferred, or Cancelled.
- **Owner** — the person responsible for this specific action. Start typing a name or email address to search. You can also enter an email address directly if the person is not yet in the system.

To edit an action, click **Edit** on any row to update the Response, Status, or Owner. The Owner field can only be changed by Register Admins and Risk Owners.

To delete an action, Register Admins can click **Edit** and then **Delete**. You will be asked to confirm before the action is removed. Deleted actions are soft-deleted and preserved in the audit trail.

### Risk Response Owner role

When a response action is assigned to a person (via the Owner field), that person gains the **Risk Response Owner** role for the register. This is a limited-access role:

- They can view and update their own assigned actions (Response and Status fields).
- They can view the parent risk in read-only mode (limited fields only).
- They cannot edit the parent risk, view other actions on the same risk, or create or delete action records.

When a Risk Response Owner opens a risk, they see a read-only view showing only a limited set of fields (controlled by the **Visible to Risk Response Owners** setting on each custom field). The risk title, ID, and state are always shown. The Response Actions panel shows only the actions assigned to them.
