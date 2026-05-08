import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("frontend keeps access tokens in memory and bootstraps through refresh", async () => {
  const session = await readFile(new URL("../src/auth/session.tsx", import.meta.url), "utf8");
  const client = await readFile(new URL("../src/api/client.ts", import.meta.url), "utf8");

  assert.match(session, /let memoryAccessToken: string \| null = null/);
  assert.match(session, /refreshSession\(\)/);
  assert.match(session, /setAccessToken\(refreshed\.accessToken\)/);
  assert.match(session, /setAccessToken\(result\.accessToken\)/);
  assert.match(session, /setAccessToken\(null\)/);
  assert.match(session, /else if \(!cancelled\) \{\s*setPreferences\(null\);/);
  assert.match(session, /\} else \{\s*setPreferences\(null\);/);
  assert.doesNotMatch(session, /localStorage/);
  assert.doesNotMatch(session, /sessionStorage/);
  assert.doesNotMatch(session, /document\.cookie/);

  assert.match(client, /withCredentials: true/);
  assert.match(client, /Authorization = `Bearer \$\{token\}`/);
  assert.doesNotMatch(client, /localStorage|sessionStorage/);
});
