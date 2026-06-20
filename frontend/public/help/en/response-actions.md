# Response Actions

Response Actions let you track the specific steps being taken to address a risk. customRisk supports two modes, configured per register.

## Response Action Mode

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

## Managing Response Actions (Child Records mode)

When a register is in Child Records mode, the response action panel appears inside the risk detail view (opened by clicking a risk row in the register).

### Adding an action

Register Admins and Risk Owners see an **Add Action** button in the Response Actions panel. Clicking it opens a form with the following fields:

- **Response** (required) — a description of the action being taken.
- **Status** — the current progress of the action. Options are:
  - Planned
  - In Progress
  - Implemented
  - Deferred
  - Cancelled
- **Owner** — the person responsible for this specific action. Start typing a name or email address to search. You can also enter an email address directly if the person is not yet in the system.

### Editing an action

Click **Edit** on any row to update the Response, Status, or Owner. The Owner field can only be changed by Register Admins and Risk Owners.

### Deleting an action

Register Admins can delete an action by clicking **Edit** and then **Delete**. You will be asked to confirm before the action is removed. Deleted actions are soft-deleted and preserved in the audit trail.

## Risk Response Owner role

When a response action is assigned to a person (via the Owner field), that person gains the **Risk Response Owner** role for the register. This is a limited-access role with the following permissions:

| What | Permitted |
|---|---|
| View their own assigned actions | Yes |
| Update their own assigned actions (Response and Status fields) | Yes |
| Re-assign the Owner field on their own action | No |
| View the parent risk in read-only mode | Yes — limited fields only |
| Edit the parent risk | No |
| View other actions linked to the same risk | No |
| View the register risk list | No |
| Create new action records | No |
| Delete action records | No |

### What a Risk Response Owner sees

When a Risk Response Owner opens a risk, they see a read-only view showing only a limited set of fields (the specific fields shown depend on the register's configuration, controlled by the **Visible to Risk Response Owners** setting on each custom field). The risk title, ID, and state are always shown.

The Response Actions panel is visible and shows only the actions assigned to them. They can update the Response text and Status on their own actions.

No **Edit** button is shown for the risk itself — Risk Response Owners cannot change risk fields.
