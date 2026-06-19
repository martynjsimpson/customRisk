# Users and Permissions

customRisk uses a role-based access control model. Access is controlled at two levels: system-wide and per-register.

## System Roles

Every user has one of the following system-level roles:

- **System Admin** — Full access to all registers, users, audit logs, and configuration. Can create and delete registers, manage all users, and access all features.
- **Standard User** — Access is determined entirely by register-level permissions. A standard user with no register assignments will see an empty Registers list.

## Register Roles

Within each register, users can be assigned one of three roles:

- **Viewer** — Can see risks and their details but cannot make any changes. Suitable for stakeholders who need visibility without edit access.
- **Editor** — Can create new risks, edit existing risks, and submit reviews. This is the standard role for risk owners and contributors.
- **Admin** — Full control over the register including configuration, custom fields, scoring, and permissions. Can also delete risks.

## Managing Users (Administrator)

System Administrators can manage users from the **Users** section in the navigation. From here you can:

- Create new user accounts
- Edit a user's name, email address, or password
- Grant or revoke System Administrator access
- Deactivate accounts for users who have left the organisation

> **Note:** Deactivating a user prevents them from logging in but does not remove their history from the system. Any risks they own will retain them as the owner until reassigned.

## Assigning Register Access

To give a user access to a register, navigate to the register and open the **Permissions** tab. From here, search for the user and assign them the appropriate role.

Access can be removed at any time by removing the user from the register's permissions list. Removing access does not affect the user's history within that register.

> **Tip:** It is good practice to review register permissions regularly — especially when team members change roles or leave the organisation.

## API Keys

API keys allow programmatic access to customRisk from external tools and scripts. Each key is tied to the user who created it and inherits their permissions.

**Creating API keys:** Go to your Profile (click your name in the top-right header) and scroll to the API Keys section. Click **Add key** to create a new key. You must copy the key immediately after creation — the full key value is only shown once.

**Managing your keys:** You can give each key a name (to identify its purpose) and set an optional expiry date. Revoke a key at any time from your Profile page.

**Administrator oversight:** System Administrators can see all API keys across all users from the **API Keys** page in the navigation. This is a read-only audit view for security oversight. Admins can revoke any key — for example, when offboarding a user.
