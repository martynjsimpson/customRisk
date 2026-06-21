/**
 * Unit tests for backend/src/utils/formatters.ts.
 *
 * Covers toDateOnlyString and decimalToNumber — two utility functions
 * extracted from service files as part of MAINT-017. Tests are kept here
 * rather than relying solely on service-level callers so that the utility
 * contract is verified independently of any service's wiring.
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { toDateOnlyString, decimalToNumber } from "../src/utils/formatters.ts";

// ---------------------------------------------------------------------------
// toDateOnlyString
// ---------------------------------------------------------------------------

test("toDateOnlyString returns YYYY-MM-DD for a UTC midnight date", () => {
  const date = new Date("2024-03-15T00:00:00.000Z");
  assert.equal(toDateOnlyString(date), "2024-03-15");
});

test("toDateOnlyString slices at midnight regardless of time component", () => {
  const date = new Date("2024-11-01T23:59:59.999Z");
  assert.equal(toDateOnlyString(date), "2024-11-01");
});

test("toDateOnlyString returns null for a null input", () => {
  assert.equal(toDateOnlyString(null), null);
});

// ---------------------------------------------------------------------------
// decimalToNumber
// ---------------------------------------------------------------------------

test("decimalToNumber converts a Decimal string value to a JS number", () => {
  assert.equal(decimalToNumber("12.5"), 12.5);
});

test("decimalToNumber converts a Decimal integer value to a JS number", () => {
  assert.equal(decimalToNumber("0"), 0);
});

test("decimalToNumber handles negative values", () => {
  assert.equal(decimalToNumber("-3.14"), -3.14);
});
