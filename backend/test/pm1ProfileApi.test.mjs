import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("PM1-01 routes expose authenticated self-service profile endpoints", async () => {
  const usersRoutes = await readFile(new URL("../src/routes/users.routes.ts", import.meta.url), "utf8");

  assert.match(usersRoutes, /router\.patch\("\/me", authenticate, validateRequest\(\{ body: updateOwnProfileSchema \}\), asyncRoute\(updateOwnProfileController\)\);/);
  assert.match(usersRoutes, /router\.post\(\s*"\/me\/change-password",\s*authenticate,\s*validateRequest\(\{ body: changeOwnPasswordSchema \}\),\s*asyncRoute\(changeOwnPasswordController\)\s*\);/);
  assert.match(usersRoutes, /router\.use\(authenticate, requireSystemAdmin\);/);
});

test("PM1-01 service verifies current password, enforces policy, and revokes other sessions only", async () => {
  const usersService = await readFile(new URL("../src/services/users.service.ts", import.meta.url), "utf8");
  const authService = await readFile(new URL("../src/services/auth.service.ts", import.meta.url), "utf8");
  const authController = await readFile(new URL("../src/controllers/auth.controller.ts", import.meta.url), "utf8");

  assert.match(usersService, /verifyPassword\(input\.currentPassword, existing\.passwordHash\)/);
  assert.match(usersService, /passwordPolicyError\(input\.newPassword, existing\.email, existing\.name\)/);
  assert.match(usersService, /New password must be different from your current password/);
  assert.match(usersService, /revokeOtherRefreshTokens\(actor\.id, currentRefreshToken, tx\)/);
  assert.match(authService, /tokenHash: currentTokenHash \? \{ not: currentTokenHash \} : undefined/);
  assert.match(authController, /const AUTH_COOKIE_PATH = "\/api\/v1";/);
});

test("PM1-01 audit stays redacted and uses dedicated self-service actions", async () => {
  const usersService = await readFile(new URL("../src/services/users.service.ts", import.meta.url), "utf8");
  const auditActions = await readFile(new URL("../src/audit/auditActions.ts", import.meta.url), "utf8");
  const changeOwnPasswordSection = usersService.match(
    /export async function changeOwnPassword[\s\S]*?export async function setUserActive/
  )?.[0];

  assert.match(auditActions, /userDisplayNameUpdated: "USER_DISPLAY_NAME_UPDATED"/);
  assert.match(auditActions, /userPasswordChanged: "USER_PASSWORD_CHANGED"/);
  assert.match(usersService, /action: auditActions\.userDisplayNameUpdated/);
  assert.match(usersService, /action: auditActions\.userPasswordChanged/);
  assert.match(usersService, /metadataJson: \{\s*revokedOtherSessions: revokedSessionCount\s*\}/);
  assert.ok(changeOwnPasswordSection, "expected to isolate changeOwnPassword implementation");
  assert.doesNotMatch(changeOwnPasswordSection, /metadataJson: \{[^}]*currentPassword/s);
  assert.doesNotMatch(changeOwnPasswordSection, /metadataJson: \{[^}]*newPassword/s);
  assert.doesNotMatch(changeOwnPasswordSection, /fieldChanges/);
});
