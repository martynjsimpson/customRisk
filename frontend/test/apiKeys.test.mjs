import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("apiKeys.api.ts exports listApiKeys, createApiKey, revokeApiKey and uses /admin/api-keys path", async () => {
  const api = await readFile(
    new URL("../src/api/apiKeys.api.ts", import.meta.url),
    "utf8"
  );

  assert.match(api, /listApiKeys/);
  assert.match(api, /createApiKey/);
  assert.match(api, /revokeApiKey/);
  assert.match(api, /\/admin\/api-keys/);
  // DELETE uses /:id path
  assert.match(api, /\/admin\/api-keys\/\$\{id\}/);
});

test("apiKeys.api.ts defines ApiKey and ApiKeyCreated interfaces with rawKey on created type only", async () => {
  const api = await readFile(
    new URL("../src/api/apiKeys.api.ts", import.meta.url),
    "utf8"
  );

  assert.match(api, /ApiKeyCreated/);
  assert.match(api, /rawKey/);
  // rawKey is ONLY on ApiKeyCreated, not on ApiKey (list item)
  const apiKeyBlockEnd = api.indexOf("export interface ApiKeyCreated");
  const apiKeyBlock = api.slice(0, apiKeyBlockEnd);
  assert.doesNotMatch(apiKeyBlock, /rawKey/);
});

test("ApiKeysPage renders table with expected columns and raw key reveal modal", async () => {
  const page = await readFile(
    new URL("../src/pages/ApiKeysPage.tsx", import.meta.url),
    "utf8"
  );

  // Table columns
  assert.match(page, /Name/);
  assert.match(page, /Prefix/);
  assert.match(page, /Last used/);
  assert.match(page, /Expires/);
  assert.match(page, /Status/);

  // Raw key warning shown once on creation
  assert.match(page, /rawKey/);
  assert.match(page, /Copy this key now/);
  assert.match(page, /not be shown again/);

  // Revoke action button
  assert.match(page, /Revoke/);
  assert.match(page, /revokeApiKey/);
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

test("ApiKeysPage uses Table.ScrollContainer, loading state, and empty state", async () => {
  const page = await readFile(
    new URL("../src/pages/ApiKeysPage.tsx", import.meta.url),
    "utf8"
  );

  assert.match(page, /Table\.ScrollContainer/);
  assert.match(page, /keysQuery\.isLoading \? <Loader/);
  assert.match(page, /No API keys yet/);
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
