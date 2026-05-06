import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("auth routes apply rate limits and browser refresh tokens stay cookie-only", async () => {
  const routes = await readFile(new URL("../src/routes/auth.routes.ts", import.meta.url), "utf8");
  const rateLimit = await readFile(new URL("../src/middleware/rateLimit.ts", import.meta.url), "utf8");
  const controller = await readFile(new URL("../src/controllers/auth.controller.ts", import.meta.url), "utf8");

  assert.match(routes, /"\/login", loginRateLimit/);
  assert.match(routes, /"\/refresh", refreshRateLimit/);
  assert.match(rateLimit, /getRateLimitWindowMs\(\)/);
  assert.match(rateLimit, /getRateLimitMaxLogin\(\)/);
  assert.match(rateLimit, /RATE_LIMITED/);

  assert.match(controller, /request\.headers\.cookie/);
  assert.doesNotMatch(controller, /request\.body\.refreshToken/);
  assert.match(controller, /httpOnly: true/);
  assert.match(controller, /secure: process\.env\.NODE_ENV === "production"/);
  assert.match(controller, /sameSite: "strict"/);
  assert.match(controller, /path: AUTH_COOKIE_PATH/);
  assert.match(controller, /clearCookie\(REFRESH_COOKIE_NAME/);
});

test("refresh rotation, reuse detection, inactive-user rejection, and deactivation revocation are enforced", async () => {
  const authService = await readFile(new URL("../src/services/auth.service.ts", import.meta.url), "utf8");
  const usersService = await readFile(new URL("../src/services/users.service.ts", import.meta.url), "utf8");

  assert.match(authService, /existingToken\.revokedAt \|\| existingToken\.replacedByTokenId/);
  assert.match(authService, /tokenFamilyId: existingToken\.tokenFamilyId/);
  assert.match(authService, /replacedByTokenId: replacement\.id/);
  assert.match(authService, /action: auditActions\.refreshTokenReuseDetected/);
  assert.match(authService, /existingToken\.expiresAt <= new Date\(\) \|\| !existingToken\.user\.isActive/);
  assert.match(authService, /!user \|\| !user\.isActive/);
  assert.match(authService, /FAILED_LOGIN_LIMIT = 5/);
  assert.match(authService, /LOCKOUT_DURATION_MS = 15 \* 60 \* 1000/);
  assert.match(authService, /accountLocked/);
  assert.match(authService, /Invalid email or password/);
  assert.doesNotMatch(authService, /throw new ApiError\([^)]*password/i);

  assert.match(usersService, /refreshToken\.updateMany/);
  assert.match(usersService, /where: \{ userId, revokedAt: null \}/);
  assert.match(usersService, /data: \{ revokedAt: new Date\(\) \}/);
});

test("CORS and secret handling follow the security model", async () => {
  const app = await readFile(new URL("../src/app.ts", import.meta.url), "utf8");
  const env = await readFile(new URL("../src/config/env.ts", import.meta.url), "utf8");
  const logger = await readFile(new URL("../src/config/logger.ts", import.meta.url), "utf8");
  const auditWriter = await readFile(new URL("../src/audit/auditWriter.ts", import.meta.url), "utf8");

  assert.match(app, /app\.use\(cors\(/);
  assert.match(app, /credentials: true/);
  assert.match(app, /allowedOrigins\.includes\(origin\)/);
  assert.match(app, /NODE_ENV === "production" && allowedOrigins\.includes\("\*"\)/);
  assert.match(env, /CORS_ALLOWED_ORIGINS/);

  assert.doesNotMatch(logger, /password|refreshToken|JWT_ACCESS_SECRET|JWT_REFRESH_SECRET/);
  assert.match(auditWriter, /"password"/);
  assert.match(auditWriter, /"accessToken"/);
  assert.match(auditWriter, /"refreshToken"/);
  assert.match(auditWriter, /"authorization"/);
  assert.match(auditWriter, /"\[REDACTED\]"/);
});
