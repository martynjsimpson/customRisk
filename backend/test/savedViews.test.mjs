import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("SavedView schema has all required fields for PM11-01", async () => {
  const schema = await readFile(
    new URL("../prisma/schema.prisma", import.meta.url),
    "utf8"
  );

  assert.match(schema, /model SavedView/);
  assert.match(schema, /userId\s+String/);
  assert.match(schema, /registerId\s+String\?/);
  assert.match(schema, /name\s+String/);
  assert.match(schema, /filterJson\s+Json/);
  assert.match(schema, /sortJson\s+Json/);
  assert.match(schema, /columnsJson\s+Json/);
  assert.match(schema, /SAVED_VIEW/);
});

test("SavedView schema enforces unique name per user and register", async () => {
  const schema = await readFile(
    new URL("../prisma/schema.prisma", import.meta.url),
    "utf8"
  );

  // @@unique([userId, registerId, name]) — composite unique constraint
  assert.match(schema, /@@unique\(\[userId, registerId, name\]\)/);
});

test("savedViews service: list returns only views owned by the calling user", async () => {
  const service = await readFile(
    new URL("../src/services/savedViews.service.ts", import.meta.url),
    "utf8"
  );

  // Must scope query to actor.id
  assert.match(service, /userId: actor\.id/);
  assert.match(service, /registerId/);
});

test("savedViews service: ownership is enforced on update and delete (404 for other user's views)", async () => {
  const service = await readFile(
    new URL("../src/services/savedViews.service.ts", import.meta.url),
    "utf8"
  );

  // Both update and delete must check existing.userId !== actor.id and throw 404
  assert.match(service, /existing\.userId !== actor\.id/);
  assert.match(service, /404/);
  assert.match(service, /Saved view not found/);
});

test("savedViews service: name conflict returns 409 on create and update", async () => {
  const service = await readFile(
    new URL("../src/services/savedViews.service.ts", import.meta.url),
    "utf8"
  );

  assert.match(service, /409/);
  assert.match(service, /already exists/);
});

test("savedViews service: register access is checked before all operations", async () => {
  const service = await readFile(
    new URL("../src/services/savedViews.service.ts", import.meta.url),
    "utf8"
  );

  assert.match(service, /assertRegisterAccess/);
  assert.match(service, /canViewRegister/);
});

test("savedViews service: all mutations are wrapped in a transaction with an audit event", async () => {
  const service = await readFile(
    new URL("../src/services/savedViews.service.ts", import.meta.url),
    "utf8"
  );

  assert.match(service, /prisma\.\$transaction/);
  assert.match(service, /recordAuditEvent/);
  assert.match(service, /auditActions\.savedViewCreated/);
  assert.match(service, /auditActions\.savedViewUpdated/);
  assert.match(service, /auditActions\.savedViewDeleted/);
});

test("savedViews service: audit objectType is SAVED_VIEW", async () => {
  const service = await readFile(
    new URL("../src/services/savedViews.service.ts", import.meta.url),
    "utf8"
  );

  assert.match(service, /objectType: "SAVED_VIEW"/);
});

test("savedViews routes expose GET list, POST create, PATCH update, DELETE — all scoped under /:registerId", async () => {
  const routes = await readFile(
    new URL("../src/routes/savedViews.routes.ts", import.meta.url),
    "utf8"
  );

  // After BUG-054, prefix is stripped from the sub-router — paths are now relative
  // and inherited from the mount point in registers.routes.ts.
  assert.match(routes, /router\.get\(\s*"\/"/);
  assert.match(routes, /router\.post\(\s*"\/"/);
  assert.match(routes, /router\.patch\(\s*"\/:viewId"/);
  assert.match(routes, /router\.delete\(\s*"\/:viewId"/);
});

test("savedViews routes are mounted under /registers with savedViews feature flag", async () => {
  const registersRoutes = await readFile(
    new URL("../src/routes/registers.routes.ts", import.meta.url),
    "utf8"
  );

  assert.match(registersRoutes, /requireFeature\("savedViews"\)/);
  assert.match(registersRoutes, /createSavedViewsSubRouter/);
});

test("savedViews routes use requireRegisterAccess middleware", async () => {
  const routes = await readFile(
    new URL("../src/routes/savedViews.routes.ts", import.meta.url),
    "utf8"
  );

  assert.match(routes, /requireRegisterAccess/);
});

test("savedViews validators: createSavedViewSchema requires name and allows optional filters/sort/columns", async () => {
  const { createSavedViewSchema, updateSavedViewSchema } = await import(
    "../src/validators/savedViews.schemas.ts"
  );

  // Valid create with name only
  const minimal = createSavedViewSchema.parse({ name: "My View" });
  assert.equal(minimal.name, "My View");
  assert.equal(minimal.filters, undefined);

  // Valid create with all fields
  const full = createSavedViewSchema.parse({
    name: "Full View",
    filters: { status: "open" },
    sort: { field: "title", direction: "asc" },
    columns: ["title", "status", "owner"]
  });
  assert.equal(full.name, "Full View");
  assert.deepEqual(full.columns, ["title", "status", "owner"]);

  // Name is required
  assert.throws(() => createSavedViewSchema.parse({}), /name/);

  // Name cannot be empty string
  assert.throws(() => createSavedViewSchema.parse({ name: "  " }));
});

test("savedViews validators: updateSavedViewSchema has all fields optional", async () => {
  const { updateSavedViewSchema } = await import(
    "../src/validators/savedViews.schemas.ts"
  );

  // Empty update is valid
  const empty = updateSavedViewSchema.parse({});
  assert.equal(empty.name, undefined);

  // Partial update
  const partial = updateSavedViewSchema.parse({ name: "Renamed" });
  assert.equal(partial.name, "Renamed");
});

test("savedViews validators: params schemas require valid UUIDs", async () => {
  const { savedViewIdParamsSchema, savedViewRegisterParamsSchema } = await import(
    "../src/validators/savedViews.schemas.ts"
  );

  const validUuid = "00000000-0000-4000-8000-000000000001";
  const validUuid2 = "00000000-0000-4000-8000-000000000002";

  // Register params: valid
  const reg = savedViewRegisterParamsSchema.parse({ registerId: validUuid });
  assert.equal(reg.registerId, validUuid);

  // Register params: invalid
  assert.throws(() => savedViewRegisterParamsSchema.parse({ registerId: "not-a-uuid" }));

  // ViewId params: valid
  const view = savedViewIdParamsSchema.parse({ registerId: validUuid, viewId: validUuid2 });
  assert.equal(view.viewId, validUuid2);

  // ViewId params: missing viewId
  assert.throws(() => savedViewIdParamsSchema.parse({ registerId: validUuid }));
});
