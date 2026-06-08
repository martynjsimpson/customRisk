# Custom Risk Postman Collection

This Postman collection is the reference for the currently implemented API surface.
It should reflect what is currently implemented in the backend.

Use `docs/architecture/api-standards.md` for API-wide conventions such as
response shapes, error codes, pagination, sorting, and route design rules.

## How to use with Postman local Git support

1. Unzip this package.
2. Copy the `postman/` folder into the root of your Git repository.
3. Open the Postman desktop app.
4. Use **Import** > **Connect Local Git Repo**, or open the **Files / Local files** area and connect Postman to the repository root.
5. Open the `Custom Risk API` collection from the local repository view.
6. Keep local-only secrets, especially real access tokens, out of Git.

The repo includes a `.postman/resources.yaml` mapping file for local Git workspace support. Postman may still update or extend hidden `.postman/` metadata after you connect the repository to your own workspace.

## Variables

The collection uses:

- `{{baseUrl}}`, defaulted at collection level to `http://localhost:3000`
- `{{accessToken}}`, automatically populated by the login request test script when `/auth/login` succeeds
- UUID placeholders such as `{{registerId}}`, `{{riskId}}`, `{{userId}}`, `{{fieldId}}`, `{{templateId}}`, `{{templateVersionId}}`, and related route parameters

## Coverage

The collection is aligned to the current backend route set, including:

- observability endpoints such as `/api/v1/health` and `/api/v1/metrics`
- authentication and session routes
- register, risk, review, audit, dashboard, person-search, and user-management routes
- register configuration lifecycle routes such as draft status, draft publish, export, and import
- template management routes, including register-template comparison and apply flows
- self-service user profile and preference routes

Some routes are only active when backend feature flags are enabled:

- `draftConfig` gates config version, config import/export, and template endpoints
- `userPreferences` gates self-service preference routes under `/api/v1/users/me/preferences`

Requests for endpoints that are not currently implemented in the backend should not remain in this collection.
