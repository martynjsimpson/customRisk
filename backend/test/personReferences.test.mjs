import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { formatPersonDisplay, isValidEmail } from "../src/services/personReference.service.ts";

test("isValidEmail accepts standard email formats", () => {
  assert.equal(isValidEmail("user@example.com"), true);
  assert.equal(isValidEmail("user.name+tag@sub.domain.co.uk"), true);
});

test("isValidEmail rejects malformed addresses", () => {
  assert.equal(isValidEmail("notanemail"), false);
  assert.equal(isValidEmail("@missing.local"), false);
  assert.equal(isValidEmail("user@"), false);
  assert.equal(isValidEmail(""), false);
});

test("formatPersonDisplay returns resolved display when user is linked", () => {
  const result = formatPersonDisplay({
    id: "person-1",
    email: "alice@example.com",
    displayName: null,
    userId: "user-1",
    user: { id: "user-1", name: "Alice Smith", email: "alice@example.com", isActive: true }
  });
  assert.equal(result.isResolved, true);
  assert.equal(result.displayName, "Alice Smith");
  assert.equal(result.isActive, true);
  assert.equal(result.email, "alice@example.com");
});

test("formatPersonDisplay returns unresolved display for email-only references", () => {
  const result = formatPersonDisplay({
    id: "person-2",
    email: "external@example.com",
    displayName: "External User",
    userId: null,
    user: null
  });
  assert.equal(result.isResolved, false);
  assert.equal(result.displayName, "External User");
  assert.equal(result.isActive, false);
});

test("formatPersonDisplay falls back to email when displayName is absent", () => {
  const result = formatPersonDisplay({
    id: "person-3",
    email: "nolabel@example.com",
    displayName: null,
    userId: null,
    user: null
  });
  assert.equal(result.displayName, "nolabel@example.com");
});

test("persons router is mounted under /persons in the API index", async () => {
  const index = await readFile(new URL("../src/routes/index.ts", import.meta.url), "utf8");
  assert.match(index, /router\.use\("\/persons", createPersonsRouter\(\)\)/);
  assert.match(index, /createPersonsRouter/);
});

test("persons search route requires authentication and validates query", async () => {
  const routes = await readFile(new URL("../src/routes/persons.routes.ts", import.meta.url), "utf8");
  assert.match(routes, /router\.get\(\s*["']\/search["']/);
  assert.match(routes, /authenticate/);
  assert.match(routes, /personSearchQuerySchema/);
  assert.match(routes, /q: z\.string\(\)\.trim\(\)\.min\(1\)/);
  assert.match(routes, /limit: z\.coerce\.number\(\)\.int\(\)/);
});

test("persons unresolved route is restricted to system admins", async () => {
  const routes = await readFile(new URL("../src/routes/persons.routes.ts", import.meta.url), "utf8");
  const service = await readFile(new URL("../src/services/personReference.service.ts", import.meta.url), "utf8");
  assert.match(routes, /router\.get\(\s*["']\/unresolved["']/);
  assert.match(routes, /requireSystemAdmin/);
  assert.match(service, /listUnresolvedPersonReferences/);
  assert.match(service, /where:\s*\{\s*userId:\s*null\s*\}/);
});

test("auth service links person reference to user on successful login", async () => {
  const service = await readFile(new URL("../src/services/auth.service.ts", import.meta.url), "utf8");
  assert.match(service, /linkPersonReferenceToUser/);
  assert.match(service, /linkPersonReferenceToUser\(user\.id, normalisedEmail\)/);
});

test("risks service resolves person input for owner on create and update", async () => {
  const service = await readFile(new URL("../src/services/risks.service.ts", import.meta.url), "utf8");
  assert.match(service, /resolvePersonInput/);
  assert.match(service, /ownerPersonId/);
  assert.match(service, /type: "user", userId: input\.ownerUserId/);
});
