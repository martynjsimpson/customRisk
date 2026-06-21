/**
 * Authentication unit tests.
 *
 * Covers password hashing and verification (bcrypt), password policy
 * validation, JWT access token signing and verification, API key generation
 * and hashing, and refresh token lifecycle. Uses cost factor 4 to keep
 * tests fast.
 */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

process.env.BCRYPT_COST_FACTOR = "4";
process.env.JWT_ACCESS_SECRET = "test-secret-for-unit-tests-only-value";
process.env.JWT_ACCESS_EXPIRY = "60m";

import { hashPassword, validatePasswordPolicy, verifyPassword } from "../src/auth/password.ts";
import { generateApiKey, hashApiKey, signAccessToken, verifyAccessToken } from "../src/auth/tokens.ts";
import {
  generateRefreshToken,
  hashRefreshToken,
  verifyRefreshTokenHash
} from "../src/auth/refreshTokens.ts";

// Password hashing

test("hashPassword returns a bcrypt hash distinct from the plain password", async () => {
  const hash = await hashPassword("TestPassword1!");
  assert.notEqual(hash, "TestPassword1!");
  assert.match(hash, /^\$2[ab]\$/);
});

test("hashPassword produces different hashes for the same input (random salt)", async () => {
  const hash1 = await hashPassword("TestPassword1!");
  const hash2 = await hashPassword("TestPassword1!");
  assert.notEqual(hash1, hash2);
});

test("verifyPassword returns true for the correct password", async () => {
  const hash = await hashPassword("CorrectPassword1!");
  assert.equal(await verifyPassword("CorrectPassword1!", hash), true);
});

test("verifyPassword returns false for a wrong password", async () => {
  const hash = await hashPassword("CorrectPassword1!");
  assert.equal(await verifyPassword("WrongPassword1!", hash), false);
});

test("verifyPassword returns false for an empty string", async () => {
  const hash = await hashPassword("CorrectPassword1!");
  assert.equal(await verifyPassword("", hash), false);
});

// Password policy

test("validatePasswordPolicy rejects passwords shorter than 12 characters", () => {
  const errors = validatePasswordPolicy("Short1!", "user@example.com", "Alice");
  assert.ok(errors.some((e) => /12 characters/i.test(e)));
});

test("validatePasswordPolicy accepts passwords of exactly 12 characters", () => {
  const errors = validatePasswordPolicy("Abcdefg1234!", "user@example.com", "Alice");
  assert.equal(errors.length, 0);
});

test("validatePasswordPolicy rejects passwords without an uppercase letter", () => {
  const errors = validatePasswordPolicy("alllowercase1!", "user@example.com", "Alice");
  assert.ok(errors.some((e) => /uppercase/i.test(e)));
});

test("validatePasswordPolicy rejects passwords without a lowercase letter", () => {
  const errors = validatePasswordPolicy("ALLUPPERCASE1!", "user@example.com", "Alice");
  assert.ok(errors.some((e) => /lowercase/i.test(e)));
});

test("validatePasswordPolicy rejects passwords without a digit", () => {
  const errors = validatePasswordPolicy("NoDigitsHere!!", "user@example.com", "Alice");
  assert.ok(errors.some((e) => /digit/i.test(e)));
});

test("validatePasswordPolicy rejects passwords without a special character", () => {
  const errors = validatePasswordPolicy("NoSpecialChars1", "user@example.com", "Alice");
  assert.ok(errors.some((e) => /special character/i.test(e)));
});

test("validatePasswordPolicy accepts all documented special characters", () => {
  const specialChars = '!@#$%^&*()_+-=[]{}|;\':",.<>?';
  for (const ch of specialChars) {
    const password = `Abcdefg1234${ch}`;
    const errors = validatePasswordPolicy(password, "user@example.com", "Alice");
    assert.equal(errors.length, 0, `Expected no errors for special char: ${ch}`);
  }
});

test("validatePasswordPolicy rejects password matching email (case-insensitive)", () => {
  const errors = validatePasswordPolicy("user@example.com", "USER@EXAMPLE.COM", "Alice");
  assert.ok(errors.some((e) => /email/i.test(e)));
});

test("validatePasswordPolicy rejects password matching display name (case-insensitive)", () => {
  const errors = validatePasswordPolicy("alice", "user@example.com", "ALICE");
  assert.ok(errors.some((e) => /display name/i.test(e)));
});

test("validatePasswordPolicy returns no errors for a fully valid password", () => {
  const errors = validatePasswordPolicy("ValidPass1!xyz", "user@example.com", "Alice Smith");
  assert.deepEqual(errors, []);
});

test("validatePasswordPolicy returns multiple errors when multiple rules fail", () => {
  const errors = validatePasswordPolicy("abc", "user@example.com", "Alice");
  assert.ok(errors.length >= 4);
});

// Access tokens

test("signAccessToken returns a JWT string", () => {
  const token = signAccessToken({ sub: "user-uuid-1234" });
  assert.equal(typeof token, "string");
  assert.equal(token.split(".").length, 3);
});

test("verifyAccessToken returns the correct payload for a valid token", () => {
  const token = signAccessToken({ sub: "user-uuid-5678" });
  const payload = verifyAccessToken(token);
  assert.equal(payload.sub, "user-uuid-5678");
});

test("verifyAccessToken throws for an expired token", () => {
  import("jsonwebtoken").then(({ default: jwt }) => {
    const expired = jwt.sign({ sub: "user-id" }, process.env.JWT_ACCESS_SECRET, { expiresIn: 0 });
    assert.throws(() => verifyAccessToken(expired));
  });
});

test("verifyAccessToken throws for a token signed with a different secret", () => {
  import("jsonwebtoken").then(({ default: jwt }) => {
    const tampered = jwt.sign({ sub: "user-id" }, "wrong-secret");
    assert.throws(() => verifyAccessToken(tampered));
  });
});

test("verifyAccessToken throws for a completely invalid string", () => {
  assert.throws(() => verifyAccessToken("not.a.jwt"));
});

// Refresh tokens

test("generateRefreshToken returns a non-empty token string", () => {
  const { token } = generateRefreshToken();
  assert.equal(typeof token, "string");
  assert.ok(token.length > 0);
});

test("generateRefreshToken returns a hash distinct from the token", () => {
  const { token, hash } = generateRefreshToken();
  assert.notEqual(token, hash);
});

test("generateRefreshToken produces unique tokens on each call", () => {
  const { token: t1 } = generateRefreshToken();
  const { token: t2 } = generateRefreshToken();
  assert.notEqual(t1, t2);
});

test("hashRefreshToken is deterministic", () => {
  const token = "some-opaque-token-value";
  assert.equal(hashRefreshToken(token), hashRefreshToken(token));
});

test("hashRefreshToken returns a hex string", () => {
  const hash = hashRefreshToken("any-token");
  assert.match(hash, /^[0-9a-f]{64}$/);
});

test("verifyRefreshTokenHash returns true for the correct token and hash", () => {
  const { token, hash } = generateRefreshToken();
  assert.equal(verifyRefreshTokenHash(token, hash), true);
});

test("verifyRefreshTokenHash returns false for a wrong token", () => {
  const { hash } = generateRefreshToken();
  assert.equal(verifyRefreshTokenHash("wrong-token", hash), false);
});

test("verifyRefreshTokenHash returns false for a tampered hash", () => {
  const { token } = generateRefreshToken();
  assert.equal(verifyRefreshTokenHash(token, "a".repeat(64)), false);
});

// API keys

test("generateApiKey returns a key with the cr_live_ prefix", () => {
  const { key } = generateApiKey();
  assert.ok(key.startsWith("cr_live_"));
});

test("generateApiKey returns a prefix that is the first 16 characters of the key", () => {
  const { key, prefix } = generateApiKey();
  assert.equal(prefix, key.substring(0, 16));
});

test("generateApiKey returns a hash distinct from the key", () => {
  const { key, hash } = generateApiKey();
  assert.notEqual(key, hash);
});

test("generateApiKey produces unique keys on each call", () => {
  const { key: k1 } = generateApiKey();
  const { key: k2 } = generateApiKey();
  assert.notEqual(k1, k2);
});

test("hashApiKey is deterministic", () => {
  const key = "cr_live_somekey";
  assert.equal(hashApiKey(key), hashApiKey(key));
});

test("hashApiKey returns a hex string", () => {
  const hash = hashApiKey("cr_live_testkey");
  assert.match(hash, /^[0-9a-f]{64}$/);
});

// Auth routes security

test("auth routes apply rate limits and browser refresh tokens stay cookie-only", async () => {
  const routes = await readFile(new URL("../src/routes/auth.routes.ts", import.meta.url), "utf8");
  const rateLimit = await readFile(new URL("../src/middleware/rateLimit.ts", import.meta.url), "utf8");
  const controller = await readFile(new URL("../src/controllers/auth.controller.ts", import.meta.url), "utf8");
  const cookies = await readFile(new URL("../src/utils/cookies.ts", import.meta.url), "utf8");

  assert.match(routes, /"\/login", loginRateLimit/);
  assert.match(routes, /"\/refresh", refreshRateLimit/);
  assert.match(rateLimit, /getRateLimitWindowMs\(\)/);
  assert.match(rateLimit, /getRateLimitMaxLogin\(\)/);
  assert.match(rateLimit, /RATE_LIMITED/);

  // Cookie reading is centralised in utils/cookies.ts; controller delegates to it
  assert.match(cookies, /request\.headers\.cookie/);
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
