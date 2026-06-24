/**
 * PM13-01 — API Keys static assertion tests
 *
 * Covers the API Keys feature (PM13-01) at the source level:
 *
 * - apiKeys.api.ts exports the correct user-scoped and admin-scoped functions
 *   and defines the expected interface shapes (ApiKey, AdminApiKey, ApiKeyCreated).
 * - ApiKeysPage is the read-only admin audit view (no create button, Owner column present).
 * - ProfilePage exposes the user-facing generate, reveal, copy, and revoke flow.
 * - The apiKeys feature flag gates both the nav link and the profile section.
 * - The /api-keys route is registered in the router.
 * - UI-012: expiry date input uses type="date" for native date picker.
 * - QOL-001: ProfilePage includes the password strength meter.
 */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("apiKeys.api.ts exports user-scoped and admin-scoped functions", async () => {
  const api = await readFile(
    new URL("../src/api/apiKeys.api.ts", import.meta.url),
    "utf8"
  );

  // User-scoped (own keys)
  assert.match(api, /listMyApiKeys/);
  assert.match(api, /createMyApiKey/);
  // Admin-scoped (all users, read + revoke)
  assert.match(api, /adminListApiKeys/);
  assert.match(api, /adminRevokeApiKey/);
  // Admin endpoints still use /admin/api-keys
  assert.match(api, /\/admin\/api-keys/);
  assert.match(api, /\/admin\/api-keys\/\$\{id\}/);
  // User-scoped endpoint
  assert.match(api, /\/users\/me\/api-keys/);
});

test("apiKeys.api.ts defines ApiKey, AdminApiKey and ApiKeyCreated interfaces", async () => {
  const api = await readFile(
    new URL("../src/api/apiKeys.api.ts", import.meta.url),
    "utf8"
  );

  assert.match(api, /interface ApiKey/);
  assert.match(api, /interface AdminApiKey/);
  assert.match(api, /ApiKeyCreated/);
  assert.match(api, /rawKey/);
  // AdminApiKey has nested user object with owner fields
  assert.match(api, /user:/);
  // rawKey is ONLY on ApiKeyCreated, not on ApiKey (list item)
  const apiKeyBlockEnd = api.indexOf("export interface ApiKeyCreated");
  const apiKeyBlock = api.slice(0, apiKeyBlockEnd);
  assert.doesNotMatch(apiKeyBlock, /rawKey/);
});

test("ApiKeysPage is the admin audit view with Owner column and no create button", async () => {
  const page = await readFile(
    new URL("../src/pages/ApiKeysPage.tsx", import.meta.url),
    "utf8"
  );

  // Table columns — includes Owner
  assert.match(page, /Name/);
  assert.match(page, /Prefix/);
  assert.match(page, /Owner/);
  assert.match(page, /Last used/);
  assert.match(page, /Expires/);
  assert.match(page, /Status/);

  // No create button or create mutation
  assert.doesNotMatch(page, /Create API key/i);
  assert.doesNotMatch(page, /createApiKey/);
  assert.doesNotMatch(page, /createMyApiKey/);

  // Admin oversight description (was an Alert, now helper text beneath the page title per UI-011)
  assert.match(page, /read-only audit view/i);

  // Revoke action still present
  assert.match(page, /Revoke/);
  assert.match(page, /adminRevokeApiKey/);
});

test("ProfilePage contains the API Keys section with generate and key reveal", async () => {
  const page = await readFile(
    new URL("../src/pages/ProfilePage.tsx", import.meta.url),
    "utf8"
  );

  // Generate button
  assert.match(page, /Generate API Key/);
  // Calls user-scoped endpoints
  assert.match(page, /createMyApiKey/);
  assert.match(page, /listMyApiKeys/);
  assert.match(page, /revokeMyApiKey/);
  // Key reveal modal
  assert.match(page, /rawKey/);
  assert.match(page, /Copy this key now/);
  assert.match(page, /not be shown again/);
  // Copy to clipboard button
  assert.match(page, /Copy to clipboard/);
  // Revoke per-key
  assert.match(page, /Revoke/);
  // Gated behind apiKeys feature flag
  assert.match(page, /flags\.apiKeys/);
});

test("ApiKeysPage is gated behind apiKeys feature flag in MainLayout nav", async () => {
  const layout = await readFile(
    new URL("../src/layouts/MainLayout.tsx", import.meta.url),
    "utf8"
  );

  assert.match(layout, /flags\.apiKeys/);
  assert.match(layout, /\/api-keys/);
  assert.match(layout, /API Keys/);
});

test("/api-keys route is registered in the router", async () => {
  const routes = await readFile(
    new URL("../src/router/routes.tsx", import.meta.url),
    "utf8"
  );

  assert.match(routes, /\/api-keys/);
  assert.match(routes, /ApiKeysPage/);
});

test("ApiKeysPage uses Table.ScrollContainer and loading state", async () => {
  const page = await readFile(
    new URL("../src/pages/ApiKeysPage.tsx", import.meta.url),
    "utf8"
  );

  assert.match(page, /Table\.ScrollContainer/);
  assert.match(page, /keysQuery\.isLoading \? <Loader/);
  assert.match(page, /No API keys yet/);
});

test("ProfilePage contains password strength meter (QOL-001)", async () => {
  const page = await readFile(
    new URL("../src/pages/ProfilePage.tsx", import.meta.url),
    "utf8"
  );

  // Strength calculation function must be present
  assert.match(page, /getPasswordStrength/);
  // Popover used to show strength feedback inline
  assert.match(page, /Popover/);
  // Progress bar renders the score
  assert.match(page, /Progress/);
  // Strength labels
  assert.match(page, /Weak/);
  assert.match(page, /Fair/);
  assert.match(page, /Strong/);
  // Popover only opens when new-password field has content
  assert.match(page, /newPassword\.length > 0/);
});

test("UI-012: ProfilePage API key expiry date input uses type=date (native date picker)", async () => {
  const page = await readFile(
    new URL("../src/pages/ProfilePage.tsx", import.meta.url),
    "utf8"
  );

  // The expiry field must use type="date" so browsers render a native date picker.
  // Regression guard: this was previously type="text" (UI-012 fix).
  assert.match(page, /type="date"/, 'expiry input must use type="date"');

  // Confirm the surrounding context is the expiry field, not an unrelated date input
  assert.match(page, /expiresAt|expiry|Expiry/i, "page must reference an expiry concept near the date input");
});

test("apiKeys flag exists in EnabledFeatures contract and useFeatureFlags allOff", async () => {
  const contracts = await readFile(
    new URL("../src/api/contracts.ts", import.meta.url),
    "utf8"
  );
  const flags = await readFile(
    new URL("../src/hooks/useFeatureFlags.ts", import.meta.url),
    "utf8"
  );

  assert.match(contracts, /apiKeys: boolean/);
  assert.match(flags, /apiKeys:\s*false/);
});
