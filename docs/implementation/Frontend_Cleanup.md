# Frontend Cleanup

**Date:** 2026-05-06
**Status:** Ready for execution

These tasks address empty scaffolding left over from earlier implementation phases and refactoring opportunities in large files. All remaining backlog work is Phase 6 hardening (P6-01 through P6-07); none of the items below conflict with that work.

---

## FC-01 — Remove empty files and folders

**Description:**
Delete the following empty files and empty directories. Each is either a placeholder that was never populated or a pre-scaffolded component directory whose intended contents were built inline elsewhere. None are referenced by any other file. None are required by the remaining Phase 6 backlog.

**Empty files to delete:**

- `frontend/src/api/exports.api.ts` — empty; export functionality is already implemented in `src/api/risks.api.ts` (`exportRisks`)
- `frontend/src/types/ui.ts` — empty; no remaining backlog item requires a shared UI type file
- `frontend/src/utils/dates.ts` — empty; date formatting is handled inline at point of use
- `frontend/src/utils/formatters.ts` — empty; no formatting utilities were ever added
- `frontend/src/utils/riskStatus.ts` — empty; review status/overdue logic lives in the backend; the frontend renders status values received from the API

**Empty directories to delete:**

- `frontend/src/components/AppShell/` — empty; app shell is implemented directly in `src/layouts/MainLayout.tsx`
- `frontend/src/components/ConfirmDialog/` — empty; delete confirmations are inline modals in feature components
- `frontend/src/components/DataTable/` — empty; all tables are implemented inline with Mantine `Table`
- `frontend/src/components/EmptyState/` — empty; P6-06 empty state work can create this directory if a dedicated component is needed
- `frontend/src/components/ErrorState/` — empty; error display is handled by the existing `ApiErrorAlert` component
- `frontend/src/components/FormControls/` — empty; form controls are Mantine primitives used directly
- `frontend/src/components/LoadingState/` — empty; loading states use Mantine `Loader` directly
- `frontend/src/components/ReviewStatusBadge/` — empty; review status badge is implemented inline in `RiskRegisterPanel.tsx`
- `frontend/src/components/RiskLevelBadge/` — empty; risk level badge is implemented inline in `RiskRegisterPanel.tsx`
- `frontend/src/features/auth/` — empty; auth UI lives in `src/pages/LoginPage.tsx` and `src/auth/session.tsx`
- `frontend/src/features/home/` — empty; home/dashboard UI lives in `src/pages/HomePage.tsx`
- `frontend/src/features/registers/` — empty; register UI lives in `src/pages/RegistersPage.tsx` and `src/pages/RegisterDetailPage.tsx`
- `frontend/src/features/users/` — empty; user management UI lives in `src/pages/UsersPage.tsx`
- `frontend/public/` — empty Vite public directory; no static assets are needed by the MVP
- `frontend/src/assets/` — empty; no static assets are used

**Acceptance criteria:**
- All listed files and directories are deleted
- TypeScript compilation succeeds after deletion (`npm run typecheck` in `frontend/`)
- No import errors are introduced (none of the deleted files were imported)

---

## FC-02 — Refactor `src/features/risks/RiskRegisterPanel.tsx` (836 lines)

**Description:**
`RiskRegisterPanel.tsx` does too much in a single file: it owns all query and mutation state, four modal dialogs, a filter bar, the risk table, and three inline helper components/functions. Split it as follows.

**Extract shared badge components (to be used by the table and detail modal):**

1. Move the inline `statusBadge` function to a new file `src/components/ReviewStatusBadge/ReviewStatusBadge.tsx` as a proper React component accepting a `status: string` prop. Update all call sites in `RiskRegisterPanel.tsx`.

2. Move the inline `riskLevelBadge` function (and its `readableTextColor` dependency) to a new file `src/components/RiskLevelBadge/RiskLevelBadge.tsx` as a React component accepting a `riskLevel: { name: string; color: string | null }` prop. **See also FC-05** for consolidating the duplicate `readableTextColor`/`getReadableTextColor` logic.

**Extract modal sub-components (each into its own file under `src/features/risks/`):**

3. `RiskFormModal.tsx` — the create/edit modal (the `Modal` with `opened={formOpened}`). Receives: `register`, `formConfig`, `editingRiskId`, `onClose`, `onSuccess`. Owns: `form`, `customValues`, `saveMutation`, `renderCoreField`, `CustomFieldInput`, and the ordered-fields logic. The parent passes `editingRiskId` and `null` to switch between create and edit.

4. `RiskDetailModal.tsx` — the read-only detail modal (the `Modal` with `opened={Boolean(detailRiskId)}`). Receives: `register`, `registerId`, `riskId`, `formConfig`, `onClose`, `onRequestEdit`, `onRequestReview`, `onRequestDelete`. Owns: `selectedRiskQuery`, `reviewHistoryQuery`, `riskAuditQuery` and all their display logic.

5. `ReviewModal.tsx` — the review confirmation modal. Receives: `register`, `riskId`, `onClose`, `onSuccess`. Owns: `reviewMutation`, `reviewConfirmed`, `reviewComment` state.

6. `DeleteRiskModal.tsx` — the hard-delete confirmation modal. Receives: `riskId`, `onClose`, `onSuccess`. Owns: `deleteMutation`, `deletionReason` state.

**Extract filter bar:**

7. `RiskFilters.tsx` — the filter row (Search, State, Risk level, Owner, Review, Include closed). Receives: `filters`, `formConfig`, `ownerOptions`, `onChange` callback. This component should be stateless — the parent (`RiskRegisterPanel`) keeps the filter state.

**What stays in `RiskRegisterPanel.tsx` after the split:**
- Query/mutation coordination for the risk list and export
- Shared `invalidateRisks` helper
- URL param effect (`useEffect` for `?riskId=&action=` deep-link handling)
- Render: page header (title, Export CSV, Add risk buttons), `RiskFilters`, `Table`, `Pagination`, and the four extracted modal components

**Acceptance criteria:**
- `RiskRegisterPanel.tsx` is under 200 lines after extraction
- All four modal sub-components and `RiskFilters` are in separate files
- `ReviewStatusBadge` and `RiskLevelBadge` are extracted shared components
- TypeScript compilation succeeds
- Existing behaviour is unchanged — no functional differences

---

## FC-03 — Refactor `src/features/configuration/ScoringConfigurationPanel.tsx` (749 lines)

**Description:**
`ScoringConfigurationPanel.tsx` renders four scoring tabs in one file. Each tab — Likelihood, Impact, Risk Levels, and Matrix — has its own independent state, queries, and mutations with no cross-tab sharing except the `invalidateAll` helper and the `getReadableTextColor` function. Split into four sub-components.

**Extract each tab into its own file under `src/features/configuration/`:**

1. `LikelihoodConfigTab.tsx` — owns likelihood list, create/edit modal, activate/deactivate mutations. Props: `registerId: string`.

2. `ImpactConfigTab.tsx` — owns impact list, create/edit modal, activate/deactivate mutations. Props: `registerId: string`. Structurally near-identical to `LikelihoodConfigTab`.

3. `RiskLevelConfigTab.tsx` — owns risk levels list, create/edit modal (including colour picker), activate/deactivate mutations. Props: `registerId: string`.

4. `MatrixConfigTab.tsx` — owns matrix query, `matrixValues` state, `recalculateExistingRisks` toggle, and `saveMatrixMutation`. Props: `registerId: string`. Requires `getReadableTextColor` — see below.

**Extract shared colour utility:**

5. Move `getReadableTextColor` to `src/utils/color.ts` and export it. Both `ScoringConfigurationPanel.tsx` (and its extracted `RiskLevelConfigTab` / `MatrixConfigTab`) and the `RiskLevelBadge` component extracted in FC-02 should import from there. This removes the current duplication between `readableTextColor` in `RiskRegisterPanel.tsx` and `getReadableTextColor` in `ScoringConfigurationPanel.tsx`.

**What stays in `ScoringConfigurationPanel.tsx` after the split:**
- The `<Tabs>` shell with the four `<Tabs.Tab>` and `<Tabs.Panel>` wrappers, each rendering the corresponding extracted tab component

**Acceptance criteria:**
- `ScoringConfigurationPanel.tsx` is under 40 lines after extraction
- Each tab component is self-contained with its own queries, mutations, and state
- `src/utils/color.ts` exports `readableTextColor` (or `getReadableTextColor`) and is imported by all callers
- No duplicate colour-calculation logic remains
- TypeScript compilation succeeds; behaviour is unchanged

---

## FC-04 — Refactor `src/features/configuration/RegisterConfigurationPanel.tsx` (528 lines)

**Description:**
`RegisterConfigurationPanel.tsx` hosts three tabs — Settings, Fields (custom field list + dropdown options management), and Scoring (delegates to `ScoringConfigurationPanel`). The Settings and Fields tabs are independent enough to extract.

**Extract each tab into its own file under `src/features/configuration/`:**

1. `RegisterSettingsTab.tsx` — the Settings tab form. Props: `registerId: string`. Owns: `registerQuery`, `settingsForm`, `updateSettingsMutation`, `canManage` derivation.

2. `FieldConfigTab.tsx` — the Fields tab. Props: `registerId: string`. Owns: `configQuery`, `optionsQuery`, `fieldForm`, `optionForm`, all field and option mutations, `orderedFieldRows` memoisation, and both modals (add/edit field, dropdown options). Import `CORE_RISK_FIELDS` as it currently does.

**What stays in `RegisterConfigurationPanel.tsx` after the split:**
- The `<Tabs>` shell rendering `RegisterSettingsTab`, `FieldConfigTab`, and `ScoringConfigurationPanel`

**Acceptance criteria:**
- `RegisterConfigurationPanel.tsx` is under 30 lines after extraction
- `RegisterSettingsTab` and `FieldConfigTab` are self-contained
- TypeScript compilation succeeds; behaviour is unchanged

---

## FC-05 — Refactor `src/api/configuration.api.ts` (339 lines)

**Description:**
`configuration.api.ts` covers two distinct concerns: custom field management (fields + dropdown options) and scoring configuration (likelihood values, impact values, risk levels, and the matrix). These are consumed by different feature panels and should be in separate files.

**Split into two files:**

1. `src/api/customFields.api.ts` — all types and functions related to custom fields and dropdown options:
   - Types: `CustomFieldType`, `CustomFieldOption`, `CustomFieldDefinition`, `SaveCustomFieldInput`, `UpdateCustomFieldInput`, `SaveCustomFieldOptionInput`, `UpdateCustomFieldOptionInput`
   - Functions: `getRegisterConfiguration`, `listCustomFields`, `createCustomField`, `updateCustomField`, `activateCustomField`, `deactivateCustomField`, `listCustomFieldOptions`, `createCustomFieldOption`, `updateCustomFieldOption`, `deactivateCustomFieldOption`
   - Also keep `RegisterConfigurationBundle` here as it is the response type for `getRegisterConfiguration`

2. `src/api/scoring.api.ts` — all types and functions related to scoring:
   - Types: `LikelihoodValue`, `ImpactValue`, `RiskLevel`, `MatrixCell`, `MatrixData`, `CreateLikelihoodValueInput`, `UpdateLikelihoodValueInput`, `CreateImpactValueInput`, `UpdateImpactValueInput`, `CreateRiskLevelInput`, `UpdateRiskLevelInput`, `UpdateMatrixInput`
   - Functions: `createLikelihoodValue`, `updateLikelihoodValue`, `deactivateLikelihoodValue`, `createImpactValue`, `updateImpactValue`, `deactivateImpactValue`, `createRiskLevel`, `updateRiskLevel`, `deactivateRiskLevel`, `getMatrix`, `updateMatrix`

**Update all import sites:**
- `src/features/configuration/RegisterConfigurationPanel.tsx` imports custom field types/functions → update to `customFields.api.ts`
- `src/features/configuration/ScoringConfigurationPanel.tsx` (and its extracted tab components from FC-03) import scoring types/functions → update to `scoring.api.ts`
- Delete `src/api/configuration.api.ts` after all import sites are updated

**Acceptance criteria:**
- `src/api/configuration.api.ts` is deleted
- `src/api/customFields.api.ts` and `src/api/scoring.api.ts` exist with the divided content
- All existing import sites updated
- TypeScript compilation succeeds; behaviour is unchanged
