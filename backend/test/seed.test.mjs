import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("seed script bootstraps a System Admin from environment variables", async () => {
  const seed = await readFile(new URL("../prisma/seed.ts", import.meta.url), "utf8");

  assert.match(seed, /required\("SEED_ADMIN_PASSWORD"\)/);
  assert.match(seed, /SEED_DEMO_USER_PASSWORD/);
  assert.match(seed, /optional\("SEED_ADMIN_EMAIL"/);
  assert.match(seed, /validatePasswordPolicy\(password, email, name\)/);
  assert.match(seed, /validatePasswordPolicy\(demoPassword, "demo@customrisk\.local", "Demo User"\)/);
  assert.match(seed, /isSystemAdmin:\s*true/);
  assert.match(seed, /isActive:\s*true/);
  assert.match(seed, /failedLoginAttempts:\s*0/);
  assert.match(seed, /Alice Register Admin/);
  assert.match(seed, /Bob Risk Owner/);
  assert.match(seed, /Carol Viewer/);
  assert.match(seed, /Information Security Risk Register/);
  assert.match(seed, /Operational Risk Register/);
  assert.match(seed, /riskIdPrefix:\s*"ISEC"/);
  assert.match(seed, /defaultReviewFrequencyMonths:\s*6/);
  assert.match(seed, /state:\s*"OPEN"/);
  assert.match(seed, /state:\s*"DRAFT"/);
  assert.match(seed, /state:\s*"CLOSED"/);
  assert.match(seed, /nextReviewDaysFromNow:\s*-14/);
  assert.match(seed, /nextReviewDaysFromNow:\s*20/);
  assert.match(seed, /19 representative risks/);
  assert.match(seed, /riskLevelDefaultColors/);
  assert.match(seed, /responseStrategyDefaults = \["Accept", "Mitigate", "Transfer", "Avoid"\]/);
  assert.doesNotMatch(seed, /replace_with_local_dev_password/);
  assert.doesNotMatch(seed, /Password123/);
});
