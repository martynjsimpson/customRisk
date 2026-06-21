/**
 * API key schema and service tests (PM13-01).
 *
 * Verifies that the Prisma schema defines the ApiKey model with all required
 * fields, and that the API key service and routes expose the expected
 * create/revoke/list contract.
 */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("API key schema has all required fields for PM13-01", async () => {
  const schema = await readFile(
    new URL("../prisma/schema.prisma", import.meta.url),
    "utf8"
  );

  assert.match(schema, /model ApiKey/);
  assert.match(schema, /keyPrefix\s+String/);
  assert.match(schema, /keyHash\s+String/);
  assert.match(schema, /lastUsedAt\s+DateTime\?/);
  assert.match(schema, /expiresAt\s+DateTime\?/);
  assert.match(schema, /revokedAt\s+DateTime\?/);
  assert.match(schema, /userId\s+String/);
  assert.match(schema, /createdByUserId\s+String\?/);
  assert.match(schema, /API_KEY/);
});

test("API key service never returns or stores the raw key — only hashes", async () => {
  const service = await readFile(
    new URL("../src/services/apiKeys.service.ts", import.meta.url),
    "utf8"
  );

  // Must hash using a one-way function before storing
  assert.match(service, /createHash/);
  assert.match(service, /sha256/);
  assert.match(service, /keyHash/);

  // The raw key must be returned in the create response exactly once
  assert.match(service, /rawKey/);

  // Must not store the raw key
  assert.doesNotMatch(service, /data:.*rawKey/);
});

test("API key service uses cryptographically random key generation", async () => {
  const service = await readFile(
    new URL("../src/services/apiKeys.service.ts", import.meta.url),
    "utf8"
  );

  assert.match(service, /randomBytes/);
  assert.match(service, /cr_live_/);
});

test("API key service enforces System Admin on admin operations (list all, admin revoke)", async () => {
  const service = await readFile(
    new URL("../src/services/apiKeys.service.ts", import.meta.url),
    "utf8"
  );

  // Admin guard must be present for the admin-scoped functions
  assert.match(service, /isSystemAdmin/);
  assert.match(service, /System Admin permission is required/);

  // User self-service create must NOT require admin — userId comes from session
  // (the create function must not check isSystemAdmin)
  const createFnMatch = service.match(/export async function createApiKey[\s\S]+?^}/m);
  assert.ok(createFnMatch, "createApiKey function must exist");
  assert.doesNotMatch(createFnMatch[0], /isSystemAdmin/);
});

test("API key service audits creation and revocation with prefix — never hash or raw key", async () => {
  const service = await readFile(
    new URL("../src/services/apiKeys.service.ts", import.meta.url),
    "utf8"
  );

  assert.match(service, /auditActions\.apiKeyCreated/);
  assert.match(service, /auditActions\.apiKeyRevoked/);
  assert.match(service, /keyPrefix/);
  // The audit summary/metadata must not reference keyHash
  assert.doesNotMatch(service, /keyHash.*summary/);
  assert.doesNotMatch(service, /summary.*keyHash/);
});

test("API key routes are behind apiKeys feature flag and System Admin middleware", async () => {
  const indexRoutes = await readFile(
    new URL("../src/routes/index.ts", import.meta.url),
    "utf8"
  );
  const apiKeyRoutes = await readFile(
    new URL("../src/routes/apiKeys.routes.ts", import.meta.url),
    "utf8"
  );

  assert.match(indexRoutes, /requireFeature\("apiKeys"\)/);
  assert.match(indexRoutes, /\/admin\/api-keys/);
  assert.match(apiKeyRoutes, /requireSystemAdmin/);
});

test("API key routes expose list, create, and delete operations only — no GET by id", async () => {
  const routes = await readFile(
    new URL("../src/routes/apiKeys.routes.ts", import.meta.url),
    "utf8"
  );

  assert.match(routes, /router\.get\("\/"/);
  assert.match(routes, /router\.post\(\s*"\/"/);
  assert.match(routes, /router\.delete\(\s*"\/:id"/);
  // No GET /:id — keys are never individually retrievable after creation
  assert.doesNotMatch(routes, /router\.get\("\/:id"/);
});

test("API key validator requires name; userId is no longer accepted (comes from session)", async () => {
  const { createApiKeySchema } = await import("../src/validators/apiKeys.schemas.ts");

  const valid = createApiKeySchema.parse({ name: "My key" });
  assert.equal(valid.name, "My key");
  assert.equal(valid.userId, undefined);

  // name is required
  assert.throws(() => createApiKeySchema.parse({}), /name/);
  assert.throws(() => createApiKeySchema.parse({ name: "" }), /name/);
});

test("revoke operation sets revokedAt and returns 409 for already-revoked keys", async () => {
  const service = await readFile(
    new URL("../src/services/apiKeys.service.ts", import.meta.url),
    "utf8"
  );

  assert.match(service, /revokedAt/);
  assert.match(service, /already revoked/i);
  assert.match(service, /409/);
});
