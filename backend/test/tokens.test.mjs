import assert from "node:assert/strict";
import { test } from "node:test";

process.env.JWT_ACCESS_SECRET = "test-secret-for-unit-tests-only-value";
process.env.JWT_ACCESS_EXPIRY = "60m";

import { generateApiKey, hashApiKey, signAccessToken, verifyAccessToken } from "../src/auth/tokens.ts";
import {
  generateRefreshToken,
  hashRefreshToken,
  verifyRefreshTokenHash,
} from "../src/auth/refreshTokens.ts";

// --- signAccessToken / verifyAccessToken ---

test("signAccessToken returns a JWT string", () => {
  const token = signAccessToken({ sub: "user-uuid-1234" });
  assert.equal(typeof token, "string");
  // JWTs have three base64url-encoded segments separated by dots
  assert.equal(token.split(".").length, 3);
});

test("verifyAccessToken returns the correct payload for a valid token", () => {
  const token = signAccessToken({ sub: "user-uuid-5678" });
  const payload = verifyAccessToken(token);
  assert.equal(payload.sub, "user-uuid-5678");
});

test("verifyAccessToken throws for an expired token", () => {
  // Sign with immediate expiry
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

// --- generateRefreshToken ---

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

// --- hashRefreshToken ---

test("hashRefreshToken is deterministic", () => {
  const token = "some-opaque-token-value";
  assert.equal(hashRefreshToken(token), hashRefreshToken(token));
});

test("hashRefreshToken returns a hex string", () => {
  const hash = hashRefreshToken("any-token");
  assert.match(hash, /^[0-9a-f]{64}$/);
});

// --- verifyRefreshTokenHash ---

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
  const badHash = "a".repeat(64);
  assert.equal(verifyRefreshTokenHash(token, badHash), false);
});

// --- generateApiKey ---

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

// --- hashApiKey ---

test("hashApiKey is deterministic", () => {
  const key = "cr_live_somekey";
  assert.equal(hashApiKey(key), hashApiKey(key));
});

test("hashApiKey returns a hex string", () => {
  const hash = hashApiKey("cr_live_testkey");
  assert.match(hash, /^[0-9a-f]{64}$/);
});
