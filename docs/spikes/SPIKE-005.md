# SPIKE-005: Internationalisation Architecture Assessment

**Status:** Complete — no implementation  
**Date:** 2026-06-21  
**Author:** Principal Architect

---

## Context

customRisk is currently a single-locale English application. All user-visible strings are hardcoded in source code. No i18n library is in use. This spike assesses what would be required to support multiple languages and locales, identifies the highest-impact areas, and recommends a sequenced approach if i18n is adopted as a product requirement.

This is a pure assessment. No implementation work is authorised by this document. An ADR would be required before any implementation begins.

---

## Findings

### 1. Frontend String Externalisation

The codebase contains a large volume of hardcoded English strings distributed throughout feature components and page components. No string catalogue or externalisation mechanism exists. Representative examples:

- UI labels and button text hardcoded in JSX: `"Add Risk"`, `"Save"`, `"Cancel"`, `"Delete"`, `"Risk Owner"`, etc.
- Error fallback text in `ApiErrorAlert`: `fallback = "Something went wrong"`.
- Status labels, tab headings, column headers throughout `features/risks/`, `features/configuration/`, and `features/audit/`.
- Help page content served as Markdown files under `frontend/public/help/en/` — these are already locale-namespaced by the `/en/` path segment.

The React ecosystem offers two mature choices for this stack:

**react-i18next** (backed by i18next): the most widely adopted option, with Vite plugin support, namespace-based translation file splitting, pluralisation, and interpolation. Integrates with `@mantine/core` locale props. Strong TypeScript support for typed translation keys.

**react-intl** (FormatJS): more standards-based (ICU message format), but heavier API and less common in Vite projects. Does not add meaningful benefit over react-i18next for this stack.

**Recommendation:** react-i18next is the appropriate choice for this stack. It integrates cleanly with Vite and React 18, supports JSON translation files (which are easy to hand off for professional translation), and has first-class TypeScript support for preventing missing-key errors at compile time.

**Translation file structure:** Namespaced JSON files under `frontend/src/locales/<locale>/`:

```
frontend/src/locales/
  en/
    common.json      # shared labels: Save, Cancel, Delete, Loading...
    risks.json       # risk domain strings
    configuration.json
    audit.json
    auth.json
```

Namespacing by domain prevents a single monolithic file and allows lazy-loading non-essential translations.

**Locale selection:** The locale should be stored in the user's preferences (currently held server-side in `UserPreferences`). The existing `usePreferences` hook would surface it. A fallback to browser `navigator.language` and then to `en` is appropriate.

### 2. Backend-Generated Text

The backend currently produces two categories of user-visible English text:

**API error messages:** All `ApiError` instances carry an English `message` string (e.g. `"Risk not found"`, `"A risk must have an owner"`, `"Risk Owners cannot edit Created Date"`). There are approximately 50–80 distinct error message strings across the service layer.

**Audit summaries:** The audit log stores a `description` field (see `auditWriter.ts` and `auditActions.ts`). These are stored in English at write time. Once stored, they are immutable.

The audit description problem is architecturally significant: descriptions are written to the database once and cannot be retroactively translated. Two approaches exist:

- **Store a structured event code and render the description on the frontend** — the display string is resolved at read time in the user's locale. This requires adding a machine-readable `eventCode` field to audit records and migrating existing descriptions, which is a breaking schema change.
- **Accept that historical audit records remain in English** — new records could include a structured code alongside the English description for forward compatibility. Existing records are not re-translated.

For API error messages, the most practical approach is to never translate the `message` field itself (it is consumed programmatically via the `code` field in most cases), and instead have the frontend map `ApiErrorCode` values to localised user-facing strings. This avoids any backend localisation requirement entirely.

### 3. Help Content Locale Management

Help content is already locale-namespaced: files live at `frontend/public/help/en/<topic>.md`. The `HelpPage` component loads content from this path.

Adding a new locale requires:
1. A parallel directory `frontend/public/help/<locale>/` containing translated Markdown files.
2. The `HelpPage` component reading the locale from user preferences to select the appropriate path.
3. A fallback to `/help/en/` when a topic does not exist in the requested locale.

This is the lowest-friction area of the i18n work — the structure is already correct.

### 4. Validation Message Localisation

Zod validation schemas in `backend/src/validators/` produce English error messages (e.g. `"Use YYYY-MM-DD"`, `"Must be at least 1"`). These are included in `VALIDATION_ERROR` responses under the `fields` map.

Zod supports custom error maps (`z.setErrorMap`) that can produce locale-appropriate messages, but this requires the locale to be available at schema evaluation time. In a stateless HTTP API, this means reading locale from the request (e.g. `Accept-Language` header or a user-preference claim in the JWT).

Zod's built-in i18n integrations (e.g. `zod-i18n-map`) provide pre-translated messages for built-in validators in many languages. Custom application-level messages would still need to be translated manually.

**Scope note:** Validation messages are a lower priority than UI strings because they are rarely shown directly — they are surfaced via `ApiErrorAlert` after a form submission that client-side validation should have already caught.

### 5. User-Visible Configuration Labels

User-defined configuration labels (register names, risk level names, likelihood/impact value names, custom field labels) are stored in the database as user-supplied strings. These are not translatable by the application — they are authored by administrators in whatever language the organisation uses. No special i18n treatment is needed for these values.

### 6. Date, Number, and Currency Formatting

**Current state:** The frontend uses a mix of:
- `new Date(iso).toLocaleString()` — uses the browser's system locale, not the user's application locale preference.
- `new Date(iso).toLocaleDateString()` — same.
- Raw ISO string slices (`.slice(0, 10)`) for date-only display.

There is no currency formatting anywhere in the codebase — customRisk does not currently deal with monetary values.

Number formatting is minimal: calculated field scores are rendered as numbers but without locale-aware formatting (no thousands separators, no locale-specific decimal separators).

**Day.js** is listed as an approved library in the technical stack but is not currently imported anywhere in the codebase. It provides locale-aware date formatting and is a natural fit.

**Recommended approach for a future implementation:**

- Establish a `useLocale()` hook that returns the resolved locale string (from user preferences, falling back to `navigator.language`, then `'en'`).
- Format all dates through a single `formatDate(iso, locale)` utility in `frontend/src/utils/` using Day.js locale support. Do not scatter `new Date(...).toLocaleString()` calls — they bypass the application's locale preference.
- Format numbers using `Intl.NumberFormat(locale)` via a `formatNumber(value, locale)` utility. This is already available in all supported Node.js and browser runtimes without an additional dependency.
- The backend should continue emitting ISO 8601 UTC strings for all dates and raw numeric values for numbers — formatting is always a presentation concern owned by the frontend.

---

## Areas Requiring the Most Refactoring

Ranked by estimated effort and breadth of change:

1. **UI string externalisation (high):** Every user-visible string in `features/` and `pages/` must be extracted to translation files and replaced with `t('key')` calls. This is purely mechanical but very high volume — hundreds of call sites across the codebase. No architectural change is required, but the diff will be large.

2. **Date formatting consistency (medium):** Approximately 10 call sites use `new Date(...).toLocaleString()` or `toLocaleDateString()` with no locale argument. These must be unified behind a single utility. Day.js would be introduced here.

3. **Audit description storage model (high, architectural):** If translated audit descriptions are required, the schema must be changed to store a structured event code. This requires a Prisma migration, a data migration for existing rows, and frontend changes to render descriptions from codes. This is the highest-risk change and should only be undertaken if translated audit logs are a firm product requirement.

4. **Zod validation message localisation (low–medium):** `zod-i18n-map` can be dropped in for built-in validator messages; custom messages require manual translation. The locale must be threaded into request handling, which is a small middleware change.

5. **Backend API error messages (low):** If the frontend maps `ApiErrorCode` to localised strings, no backend change is required. This is the recommended approach and eliminates this area from the refactoring scope.

---

## Recommendations

1. **Do not begin i18n implementation without a product decision that multi-language support is required.** The cost is substantial and the benefit is zero for a single-language deployment.

2. **If i18n is approved, sequence the work as follows:**

   - **Phase 1 — Foundation:** Adopt react-i18next. Create the `locales/en/` directory structure. Extract all frontend strings to translation files as a pure refactor (no visible change to English users). Introduce the `useLocale()` hook backed by user preferences. This is safe to ship incrementally and makes all subsequent phases possible.

   - **Phase 2 — Date and number formatting:** Replace scattered `toLocaleString()` calls with a centralised `formatDate`/`formatNumber` utility backed by Day.js and `Intl.NumberFormat`. This is a contained, low-risk change.

   - **Phase 3 — Help content:** Add locale-namespaced Markdown directories. Update `HelpPage` to resolve locale. Translate help files per locale as translations become available.

   - **Phase 4 — Validation messages:** Integrate `zod-i18n-map`. Thread locale from request context into schema evaluation. Translate custom validation messages.

   - **Phase 5 (if required) — Audit descriptions:** Raise a separate ADR. This is a breaking schema change and should be treated as a major release item.

3. **Recommended library:** react-i18next. An ADR must be created before it is added to the dependency manifest.

4. **Backend error message strategy:** Map `ApiErrorCode` values to localised strings on the frontend only. Do not localise the `message` field in `ApiError` — it is used for internal logging and the `code` field already provides the machine-readable signal needed for frontend rendering.

5. **Day.js:** Already approved in the technical stack. No ADR needed to use it for date formatting. Its localisation features (`dayjs.locale()`) are the right tool for Phase 2.

6. **Translation workflow:** Before committing to i18n, confirm how translations will be produced and maintained (professional translation service, community contributions, or machine translation with human review). The answer affects the file format choice and the tooling around extraction.
