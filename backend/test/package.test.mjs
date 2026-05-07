import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("backend package exposes required quality scripts", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

  assert.equal(packageJson.scripts.typecheck, "tsc --noEmit --project tsconfig.json");
  assert.match(packageJson.scripts.test, /--test/);
  assert.equal(packageJson.scripts["prisma:deploy"], "prisma migrate deploy");
  assert.equal(packageJson.scripts["prisma:seed"], "tsx prisma/seed.ts");
});
