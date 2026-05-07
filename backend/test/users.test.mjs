import assert from "node:assert/strict";
import { test } from "node:test";

import { auditActionForUserActiveChange } from "../src/services/users.service.ts";

test("user activation helpers emit explicit audit action names", () => {
  assert.equal(auditActionForUserActiveChange(true), "USER_ACTIVATED");
  assert.equal(auditActionForUserActiveChange(false), "USER_DEACTIVATED");
});
