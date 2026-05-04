import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("seed script bootstraps a System Admin from environment variables", async () => {
  const seed = await readFile(new URL("../prisma/seed.ts", import.meta.url), "utf8");

  assert.match(seed, /required\("SEED_ADMIN_PASSWORD"\)/);
  assert.match(seed, /optional\("SEED_ADMIN_EMAIL"/);
  assert.match(seed, /validatePasswordPolicy\(password, email, name\)/);
  assert.match(seed, /isSystemAdmin:\s*true/);
  assert.match(seed, /isActive:\s*true/);
  assert.match(seed, /failedLoginAttempts:\s*0/);
  assert.doesNotMatch(seed, /replace_with_local_dev_password/);
});
