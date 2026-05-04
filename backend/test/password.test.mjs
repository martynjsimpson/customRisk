import assert from "node:assert/strict";
import { test } from "node:test";

// Use cost factor 4 to keep tests fast without changing policy logic
process.env.BCRYPT_COST_FACTOR = "4";

import { hashPassword, validatePasswordPolicy, verifyPassword } from "../src/auth/password.ts";

// --- hashPassword ---

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

// --- verifyPassword ---

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

// --- validatePasswordPolicy: length ---

test("validatePasswordPolicy rejects passwords shorter than 12 characters", () => {
  const errors = validatePasswordPolicy("Short1!", "user@example.com", "Alice");
  assert.ok(errors.some((e) => /12 characters/i.test(e)));
});

test("validatePasswordPolicy accepts passwords of exactly 12 characters", () => {
  const errors = validatePasswordPolicy("Abcdefg1234!", "user@example.com", "Alice");
  assert.equal(errors.length, 0);
});

// --- validatePasswordPolicy: character requirements ---

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

// --- validatePasswordPolicy: identity checks ---

test("validatePasswordPolicy rejects password matching email (case-insensitive)", () => {
  const errors = validatePasswordPolicy("user@example.com", "USER@EXAMPLE.COM", "Alice");
  assert.ok(errors.some((e) => /email/i.test(e)));
});

test("validatePasswordPolicy rejects password matching display name (case-insensitive)", () => {
  const errors = validatePasswordPolicy("alice", "user@example.com", "ALICE");
  assert.ok(errors.some((e) => /display name/i.test(e)));
});

// --- validatePasswordPolicy: valid password ---

test("validatePasswordPolicy returns no errors for a fully valid password", () => {
  const errors = validatePasswordPolicy("ValidPass1!xyz", "user@example.com", "Alice Smith");
  assert.deepEqual(errors, []);
});

test("validatePasswordPolicy returns multiple errors when multiple rules fail", () => {
  // Too short, no uppercase, no digit, no special char
  const errors = validatePasswordPolicy("abc", "user@example.com", "Alice");
  assert.ok(errors.length >= 4);
});
