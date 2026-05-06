# Backend Cleanup

**Date:** 2026-05-06
**Status:** Ready for execution

These tasks address empty scaffolding left over from earlier implementation phases and refactoring opportunities in large files. All remaining backlog work is Phase 6 hardening (P6-01 through P6-07). Tasks BC-03 and BC-05 depend on BC-02 completing first (they add code to the new files BC-02 creates).

---

## BC-01 — Remove empty files

**Description:**
Delete the following empty files. Each is a placeholder that was never populated; the functionality it was meant to hold either ended up somewhere else or was never needed in the codebase.

**Empty files to delete:**

- `backend/src/config/cors.ts` — empty; CORS is configured inline in `src/app.ts`. P6-05 (CORS configuration review) should review `app.ts`, not this file.
- `backend/src/repositories/audit.repository.ts` — empty; audit data access is handled directly in `src/services/audit.service.ts` using the Prisma client. No repository pattern is in use for this domain.
- `backend/src/repositories/registers.repository.ts` — empty; register data access is handled directly in `src/services/registers.service.ts`. Only `src/repositories/risks.repository.ts` follows the repository pattern.
- `backend/src/repositories/users.repository.ts` — empty; user data access is handled directly in `src/services/users.service.ts`.
- `backend/src/controllers/exports.controller.ts` — empty; the export controller function (`exportRisksController`) lives in `src/controllers/risks.controller.ts` and is imported from there in `registers.routes.ts`.
- `backend/src/routes/exports.routes.ts` — empty; export is a single route (`GET /:registerId/risks/export`) within the registers router. The route-split in BC-04 will absorb it into `risks.routes.ts`.
- `backend/src/utils/dates.ts` — empty; date utilities (`utcDateOnly`, `getDueSoonLimit`) are implemented in `src/services/reviewStatus.service.ts` and imported directly by the services that need them.

**Notes:**
The following empty files are NOT listed here because they are targets for the refactoring tasks below:
- `src/audit/snapshotBuilder.ts` — will receive `buildRiskDeleteSnapshot` from `risks.service.ts` in BC-03
- `src/routes/risks.routes.ts` — will receive risk sub-routes from `registers.routes.ts` in BC-04
- `src/routes/configuration.routes.ts` — will receive configuration sub-routes from `registers.routes.ts` in BC-04

**Acceptance criteria:**
- All 7 listed files are deleted
- TypeScript compilation succeeds after deletion (`npm run typecheck` in `backend/`)
- No import errors are introduced (verify none of the deleted files are imported anywhere using: `grep -r "cors\.js\|audit\.repository\|registers\.repository\|users\.repository\|exports\.controller\|exports\.routes\|utils/dates" src/`)

---

## BC-02 — Refactor `src/services/configuration.service.ts` (1512 lines)

**Description:**
`configuration.service.ts` covers five distinct domains in one 1512-line file: custom field definitions, dropdown options, likelihood values, impact values, risk levels, and the risk matrix. There is also a shared `assertRegisterExists` helper and two config-bundle query functions (`getRegisterConfig`, `getRiskFormConfig`). Split it into three focused files.

**File 1: `src/services/customFields.service.ts`**

Move everything relating to custom fields and dropdown options. Specifically:
- Private helpers: `registerConfigSelect`, `customFieldInclude`, `customFieldAuditFields`, `optionAuditFields`, `assertRegisterExists`, `mapCustomFieldPrismaError`, `mapCustomFieldOptionPrismaError`, `findCustomField`, `findDropdownField`, `findCustomFieldOption`, `assertDropdownActivationIsValid`, `assertDropdownWillKeepActiveOption`, `validateCreateCustomField`
- Exports: `listCustomFields`, `getCustomField`, `createCustomField`, `updateCustomField`, `activateCustomField`, `deactivateCustomField`, `setCustomFieldActiveState`, `listCustomFieldOptions`, `createCustomFieldOption`, `updateCustomFieldOption`, `deactivateCustomFieldOption`

Note: `assertRegisterExists` is also needed by the other two new files. Each file should define its own private copy — the function is only 12 lines and `registerConfigSelect` is already defined locally in each service. Do not create a shared helper module for this.

**File 2: `src/services/scoringConfig.service.ts`**

Move everything relating to likelihood values, impact values, risk levels, and the risk matrix. Specifically:
- Private helpers: a private copy of `assertRegisterExists`, `likelihoodAuditFields`, `mapLikelihoodPrismaError`, `findLikelihoodValue`, `assertLikelihoodWillKeepActiveValue`, `impactAuditFields`, `mapImpactPrismaError`, `findImpactValue`, `assertImpactWillKeepActiveValue`, `riskLevelAuditFields`, `mapRiskLevelPrismaError`, `findRiskLevel`, `assertRiskLevelWillKeepActiveValue`, `findMatrixCell`, `assertMatrixIsComplete`, `assertMatrixCellIdsExist`, `recalculateRiskLevels`
- Exports: `listLikelihoodValues`, `createLikelihoodValue`, `updateLikelihoodValue`, `deactivateLikelihoodValue`, `listImpactValues`, `createImpactValue`, `updateImpactValue`, `deactivateImpactValue`, `listRiskLevels`, `createRiskLevel`, `updateRiskLevel`, `deactivateRiskLevel`, `getMatrix`, `updateMatrix`, `updateMatrixCell`

**File 3: `src/services/registerConfig.service.ts`**

Move the two configuration bundle query functions:
- Private helpers: a private copy of `assertRegisterExists`, `getReferencedConfigurationIds`
- Exports: `getRegisterConfig`, `getRiskFormConfig`

**Delete `src/services/configuration.service.ts`** after all import sites are updated.

**Update all import sites:**
- `src/controllers/configuration.controller.ts` — imports from `configuration.service.js` → split between `customFields.service.js`, `scoringConfig.service.js`, and `registerConfig.service.js` based on the function list above
- `src/routes/registers.routes.ts` (or its extracted sub-files from BC-04) — update any direct service imports

**Also split `src/validators/configuration.schemas.ts` (163 lines):**
Create `src/validators/customFields.schemas.ts` (custom field and option types/schemas) and `src/validators/scoringConfig.schemas.ts` (likelihood, impact, risk level, matrix types/schemas). Update all import sites. Delete the original.

**Acceptance criteria:**
- `src/services/configuration.service.ts` is deleted
- `customFields.service.ts`, `scoringConfig.service.ts`, `registerConfig.service.ts` exist with the divided content
- All callers compile without errors
- TypeScript compilation succeeds
- Behaviour is unchanged

---

## BC-03 — Refactor `src/services/risks.service.ts` (1127 lines)

**Description:**
`risks.service.ts` is 1127 lines. It contains two logically separate concerns embedded within the risk CRUD: a 170-line custom field value validator (`validateCustomFieldValues` and its private helpers) and a 105-line delete snapshot builder (`buildRiskDeleteSnapshot`). Both have empty placeholder files that were pre-created to receive them. Move them.

**Task 1: Move `buildRiskDeleteSnapshot` to `src/audit/snapshotBuilder.ts`**

`buildRiskDeleteSnapshot` (lines 255–362 in the current file) builds the `snapshotJson` payload written to `AuditRiskSnapshot` before a risk is hard-deleted. Move it to the existing empty file `src/audit/snapshotBuilder.ts` as a named export. It requires only the `Prisma` import and the `AuthenticatedActor` type.

In `risks.service.ts`, replace the inline function with:
```ts
import { buildRiskDeleteSnapshot } from "../audit/snapshotBuilder.js";
```

**Task 2: Move `validateCustomFieldValues` and its helpers to `src/services/customFields.service.ts`**

The following block (lines 731–1019) belongs in the custom field domain, not the risk CRUD domain:
- Private helpers: `countProvidedValues`, `hasValueForType`, `buildCustomFieldCreateInput`, `ExistingCustomFieldValue` (type alias), `dateValuesMatch`, `customFieldValueMatchesExisting`, `mergeExistingAndInputValues`
- Export: `validateCustomFieldValues`

Move the entire block into `src/services/customFields.service.ts` (which is created in BC-02). Note: this task depends on BC-02 completing first so that file exists.

In `risks.service.ts`, add:
```ts
import { validateCustomFieldValues } from "./customFields.service.js";
```
and remove the duplicate `export { getRiskReviewStatus, isRiskOverdue }` re-export if it is better served by direct imports from `reviewStatus.service.ts` at each call site.

**What remains in `risks.service.ts` after both extractions:**
`listRisks`, `getRiskDetail`, `createRisk`, `updateRisk`, `deleteRisk` — the pure risk CRUD and their private helpers (`buildRiskOrderBy`, `applyReviewFilters`, `mapRiskListItem`, `mapCustomFieldValue`, `mapRiskDetail`, `buildRiskUpdateFieldChanges`, `riskAuditSelect`, `assertCreateRiskAccess`, and utility converters). Target size: approximately 730 lines.

**Acceptance criteria:**
- `src/audit/snapshotBuilder.ts` exports `buildRiskDeleteSnapshot`
- `validateCustomFieldValues` and all its private helpers are removed from `risks.service.ts` and live only in `customFields.service.ts`
- `risks.service.ts` compiles and all five CRUD functions continue to work
- TypeScript compilation succeeds
- Behaviour is unchanged

---

## BC-04 — Refactor `src/routes/registers.routes.ts` (387 lines)

**Description:**
`registers.routes.ts` (387 lines) defines all routes for the registers domain in a single function: register CRUD, permissions, risk CRUD, configuration (custom fields + scoring), matrix, reviews, and audit. Split it using the two existing empty placeholder route files. Each sub-router must use `Router({ mergeParams: true })` so that `:registerId` (set by the parent router) is accessible within the sub-router.

**File 1: `src/routes/risks.routes.ts` (use the existing empty file)**

Extract all routes that operate on risks, reviews, and risk audit within a register. Specifically:
```
GET  /:registerId/risks
POST /:registerId/risks
GET  /:registerId/risks/export
GET  /:registerId/risks/:riskId
PATCH /:registerId/risks/:riskId
DELETE /:registerId/risks/:riskId
GET  /:registerId/risks/:riskId/reviews
POST /:registerId/risks/:riskId/reviews
GET  /:registerId/risks/:riskId/audit
```
Export a `createRisksSubRouter()` function that returns `Router({ mergeParams: true })` with these routes. It imports from `risks.controller.ts`, `reviews.controller.ts`, `audit.controller.ts`, and the relevant middleware/validators.

**File 2: `src/routes/configuration.routes.ts` (use the existing empty file)**

Extract all routes that operate on configuration entities within a register. Specifically:
```
GET  /:registerId/config
GET  /:registerId/risk-form-config
GET/POST /:registerId/custom-fields
GET/PATCH /:registerId/custom-fields/:fieldId
POST /:registerId/custom-fields/:fieldId/activate
POST /:registerId/custom-fields/:fieldId/deactivate
GET/POST /:registerId/custom-fields/:fieldId/options
PATCH /:registerId/custom-fields/:fieldId/options/:optionId
POST /:registerId/custom-fields/:fieldId/options/:optionId/deactivate
GET/POST /:registerId/likelihood-values
PATCH /:registerId/likelihood-values/:likelihoodId
POST /:registerId/likelihood-values/:likelihoodId/deactivate
GET/POST /:registerId/impact-values
PATCH /:registerId/impact-values/:impactId
POST /:registerId/impact-values/:impactId/deactivate
GET/POST /:registerId/risk-levels
PATCH /:registerId/risk-levels/:riskLevelId
POST /:registerId/risk-levels/:riskLevelId/deactivate
GET /:registerId/matrix
PUT /:registerId/matrix
PATCH /:registerId/matrix/:cellId
```
Export a `createConfigurationSubRouter()` function that returns `Router({ mergeParams: true })` with these routes.

**What stays in `registers.routes.ts`:**
The `asyncRoute` helper (keep it local or move to `src/utils/routeHelpers.ts` if both sub-routers need it), authentication middleware mount, and all routes operating on the register itself:
```
GET  /
POST /
GET  /:registerId
PATCH /:registerId
GET  /:registerId/summary
GET  /:registerId/audit
GET  /:registerId/permissions
GET  /:registerId/permission-candidates
POST /:registerId/permissions
DELETE /:registerId/permissions/:permissionId
```
Then mount the two sub-routers:
```ts
router.use("/", createRisksSubRouter());
router.use("/", createConfigurationSubRouter());
```

**Acceptance criteria:**
- `registers.routes.ts` is under 80 lines after extraction
- `risks.routes.ts` and `configuration.routes.ts` are populated with the moved routes
- All routes continue to work (same URLs, same middleware chains)
- `Router({ mergeParams: true })` is used in both sub-routers so `:registerId` is accessible
- TypeScript compilation succeeds

---

## BC-05 — Refactor `src/controllers/configuration.controller.ts` (344 lines)

**Description:**
`configuration.controller.ts` is a thin delegation layer over `configuration.service.ts`. Once BC-02 splits the service into `customFields.service.ts`, `scoringConfig.service.ts`, and `registerConfig.service.ts`, the single controller file should be split to mirror that structure. This makes imports in `registers.routes.ts` (and its BC-04 sub-files) cleaner.

This task depends on BC-02 completing first.

**Extract `actorOrThrow` to a shared utility:**

The private `actorOrThrow` helper (lines 57–63) is used throughout the controller and will be needed in both split files. Move it to `src/utils/actorOrThrow.ts` as a named export so both new controller files can import it. Check whether `auth.controller.ts` or other controllers would also benefit from importing it.

**File 1: `src/controllers/customFields.controller.ts`**

Move all controllers that delegate to the custom field and option service functions:
- `getRegisterConfigController`, `getRiskFormConfigController` (these delegate to `registerConfig.service.ts`)
- `listCustomFieldsController`, `createCustomFieldController`, `getCustomFieldController`, `updateCustomFieldController`, `activateCustomFieldController`, `deactivateCustomFieldController`
- `listCustomFieldOptionsController`, `createCustomFieldOptionController`, `updateCustomFieldOptionController`, `deactivateCustomFieldOptionController`

**File 2: `src/controllers/scoringConfig.controller.ts`**

Move all controllers that delegate to the scoring config service functions:
- `listLikelihoodValuesController`, `createLikelihoodValueController`, `updateLikelihoodValueController`, `deactivateLikelihoodValueController`
- `listImpactValuesController`, `createImpactValueController`, `updateImpactValueController`, `deactivateImpactValueController`
- `listRiskLevelsController`, `createRiskLevelController`, `updateRiskLevelController`, `deactivateRiskLevelController`
- `getMatrixController`, `updateMatrixController`, `updateMatrixCellController`

**Delete `src/controllers/configuration.controller.ts`** after all import sites are updated.

**Update import sites:** `registers.routes.ts` (or the BC-04 sub-files `configuration.routes.ts`) — change the import from `configuration.controller.js` to the two new files.

**Acceptance criteria:**
- `src/controllers/configuration.controller.ts` is deleted
- `customFields.controller.ts` and `scoringConfig.controller.ts` exist with the divided content
- `src/utils/actorOrThrow.ts` exports `actorOrThrow`
- All callers compile without errors
- TypeScript compilation succeeds
- Behaviour is unchanged
