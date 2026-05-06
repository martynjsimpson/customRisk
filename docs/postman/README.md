# Custom Risk Postman Collection

This Postman collection should not be conisdered the authorative design for any API's, rather it should reflect what has been implemented.

## How to use with Postman local Git support

1. Unzip this package.
2. Copy the `postman/` folder into the root of your Git repository.
3. Open the Postman desktop app.
4. Use **Import** > **Connect Local Git Repo**, or open the **Files / Local files** area and connect Postman to the repository root.
5. Select/import the collection and local environment.
6. Keep local-only secrets, especially real access tokens, out of Git.

Postman may create its own hidden `.postman/` folder, including mapping metadata such as `resources.yaml`, after you connect the repository to a workspace. I have not pre-created that folder because Postman should generate it for your workspace/cloud mapping.

## Variables

The collection uses:

- `{{baseUrl}}`, defaulted in the local environment to `http://localhost:3000/api/v1`
- `{{accessToken}}`, automatically populated by the login request test script when `/auth/login` succeeds
- UUID placeholders such as `{{registerId}}`, `{{riskId}}`, `{{userId}}`, `{{fieldId}}`, and related route parameters

