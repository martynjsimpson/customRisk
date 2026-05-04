import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("backend package exposes required quality scripts", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

  assert.equal(packageJson.scripts.typecheck, "tsc --noEmit --project tsconfig.json");
  assert.match(packageJson.scripts.test, /^node --test/);
});
