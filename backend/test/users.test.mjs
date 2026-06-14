import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { auditActionForUserActiveChange, deepMergeObjects } from "../src/services/users.service.ts";

test("user activation helpers emit explicit audit action names", () => {
  assert.equal(auditActionForUserActiveChange(true), "USER_ACTIVATED");
  assert.equal(auditActionForUserActiveChange(false), "USER_DEACTIVATED");
});

// PM1-03: deep merge for preferences

test("deepMergeObjects merges top-level scalar values", () => {
  const target = { colorScheme: "light" };
  const source = { colorScheme: "dark" };
  const result = deepMergeObjects(target, source);
  assert.deepEqual(result, { colorScheme: "dark" });
});

test("deepMergeObjects preserves target keys not present in source", () => {
  const target = { colorScheme: "light", riskTableColumns: { myRisks: ["title"] } };
  const source = { colorScheme: "dark" };
  const result = deepMergeObjects(target, source);
  assert.deepEqual(result, { colorScheme: "dark", riskTableColumns: { myRisks: ["title"] } });
});

test("deepMergeObjects recursively merges nested objects", () => {
  const target = {
    riskTableColumns: {
      registers: { "uuid-1": ["title", "state"], "uuid-2": ["title"] },
      myRisks: ["title", "state"]
    }
  };
  const source = {
    riskTableColumns: {
      registers: { "uuid-3": ["title"] }
    }
  };
  const result = deepMergeObjects(target, source);
  assert.deepEqual(result, {
    riskTableColumns: {
      registers: {
        "uuid-1": ["title", "state"],
        "uuid-2": ["title"],
        "uuid-3": ["title"]
      },
      myRisks: ["title", "state"]
    }
  });
});

test("deepMergeObjects does not mutate target", () => {
  const target = { riskTableColumns: { registers: { "uuid-1": ["title"] } } };
  const source = { riskTableColumns: { registers: { "uuid-2": ["state"] } } };
  deepMergeObjects(target, source);
  assert.deepEqual(target, { riskTableColumns: { registers: { "uuid-1": ["title"] } } });
});

test("deepMergeObjects replaces arrays rather than merging them", () => {
  const target = { riskTableColumns: { myRisks: ["title", "state"] } };
  const source = { riskTableColumns: { myRisks: ["title"] } };
  const result = deepMergeObjects(target, source);
  assert.deepEqual(result, { riskTableColumns: { myRisks: ["title"] } });
});

test("deepMergeObjects handles empty target", () => {
  const result = deepMergeObjects({}, { colorScheme: "dark" });
  assert.deepEqual(result, { colorScheme: "dark" });
});

test("deepMergeObjects handles empty source", () => {
  const result = deepMergeObjects({ colorScheme: "light" }, {});
  assert.deepEqual(result, { colorScheme: "light" });
});

// PM1-01: password change should preserve the current session while revoking others

test("changeMyPassword excludes the current refresh token from revocation", async () => {
  const usersService = await readFile(new URL("../src/services/users.service.ts", import.meta.url), "utf8");
  const sessionService = await readFile(new URL("../src/services/sessionTokens.service.ts", import.meta.url), "utf8");

  // The service passes currentRefreshToken as excludeHash to revokeActiveRefreshTokens
  assert.match(usersService, /const excludeHash = currentRefreshToken \? hashRefreshToken\(currentRefreshToken\) : undefined/);
  assert.match(usersService, /revokeActiveRefreshTokens\(actor\.id, tx, excludeHash\)/);

  // revokeActiveRefreshTokens accepts an optional exclusion hash and filters it out
  assert.match(sessionService, /excludeTokenHash\?: string/);
  assert.match(sessionService, /excludeTokenHash \? \{ tokenHash: \{ not: excludeTokenHash \} \} : \{\}/);
});

test("changeMyPasswordController passes the refresh token cookie to the service", async () => {
  const controller = await readFile(new URL("../src/controllers/users.controller.ts", import.meta.url), "utf8");

  // Controller extracts cookie and forwards it so the service can preserve that session
  assert.match(controller, /getRefreshTokenFromRequest\(request\)/);
  assert.match(controller, /changeMyPassword\(actorOrThrow\(request\), request\.body, getRefreshTokenFromRequest\(request\)\)/);
});

test("password change revokes all OTHER active refresh tokens for the user", async () => {
  const usersService = await readFile(new URL("../src/services/users.service.ts", import.meta.url), "utf8");
  const sessionService = await readFile(new URL("../src/services/sessionTokens.service.ts", import.meta.url), "utf8");

  // Revocation query targets the user, only non-revoked tokens, and excludes the current one
  assert.match(sessionService, /userId,\n\s*revokedAt: null/);
  assert.match(sessionService, /data: \{ revokedAt: new Date\(\) \}/);

  // Service calls revokeActiveRefreshTokens (not revokeRefreshToken) so all sessions are swept
  assert.match(usersService, /await revokeActiveRefreshTokens\(actor\.id, tx, excludeHash\)/);
});

// PM2-02 / PM2-05: Risk Owner email-only and access control via ownerPersonId

test("risk access control checks ownerPerson.userId as well as ownerUserId", async () => {
  const service = await readFile(new URL("../src/services/risks.service.ts", import.meta.url), "utf8");

  // Edit permission gate checks both legacy ownerUserId and person-linked userId
  assert.match(service, /existing\.ownerUserId !== actor\.id && existing\.ownerPerson\?\.userId !== actor\.id/);

  // List/my-risks queries include both owner fields in the OR clause
  assert.match(service, /\{ ownerUserId: actor\.id \}/);
  assert.match(service, /\{ ownerPerson: \{ userId: actor\.id \} \}/);
});

test("risk create resolves ownerUserId to a PersonReference via ownerPerson", async () => {
  const service = await readFile(new URL("../src/services/risks.service.ts", import.meta.url), "utf8");

  // createRisk resolves the userId to a personReference ID and connects it
  assert.match(service, /resolvePersonInput\(\{ type: "user", userId: input\.ownerUserId \}, tx\)/);
  assert.match(service, /ownerPerson: \{ connect: \{ id: ownerPersonId \} \}/);
});

test("risk update resolves new ownerUserId to a PersonReference", async () => {
  const service = await readFile(new URL("../src/services/risks.service.ts", import.meta.url), "utf8");

  assert.match(service, /newOwnerPersonId = await resolvePersonInput\(\{ type: "user", userId: input\.ownerUserId \}, tx\)/);
  assert.match(service, /ownerPersonId: newOwnerPersonId/);
});
