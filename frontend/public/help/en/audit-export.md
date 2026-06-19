# Audit and Export

customRisk maintains a complete, immutable audit trail of all changes made to risks, registers, users, and configuration. This supports governance, compliance, and accountability requirements.

## The Audit Log

The **Audit** section (System Administrators only) provides a system-wide log of every action taken across all registers. Each entry shows:

- The type of event (e.g. risk created, risk updated, user deactivated)
- The user who performed the action (or the API key, for programmatic actions)
- The date and time of the action
- The affected register and object (where applicable)
- A summary of what changed

## Per-Register Audit History

Each register has its own audit tab, visible to register Admins. This shows the full change history for that specific register — all risk changes, configuration updates, and permission changes scoped to that register.

You can also view the audit history of a specific risk by opening the risk detail panel and scrolling to the audit history section at the bottom.

## Filtering Audit Events

The audit log can be filtered by:

- Event type (e.g. show only risk reviews)
- User (e.g. show only events performed by a specific person)
- Register (system-wide audit only)
- Date range

Use these filters when investigating a specific change or preparing for a governance review.

## Exporting Audit Data

The audit log supports CSV export. Use the filters to scope the audit log to the events you need — by event type, user, register, or date range — then click the export button to download the filtered result as a CSV file.

This is particularly useful for governance reviews and compliance reporting, where you may need to provide evidence of activity over a specific period or for a specific register. The exported data reflects the immutable audit record exactly as it exists in the system — it cannot be edited after export.

> **Tip:** Apply date range and register filters before exporting to keep the output focused and manageable. Exporting without filters on a large or long-running system can produce a very large file.

## Immutability and Integrity

Audit log entries cannot be edited or deleted. This ensures the integrity of the record and means the audit trail can be relied upon for compliance and governance purposes.

Closed risks and archived registers are also retained in the system — they are never permanently deleted — so their history remains accessible.

> **Note:** If your organisation has specific data retention requirements, speak to your System Administrator about data management policies.
