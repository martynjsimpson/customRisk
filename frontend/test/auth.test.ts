/**
 * Auth / session management — static assertion tests
 *
 * Verifies the security properties of the authentication layer at source level:
 *
 * - Access tokens are stored only in memory (never in localStorage, sessionStorage,
 *   or cookies), and the Axios client attaches them as Authorization headers.
 * - The session bootstraps through a refresh call on load.
 * - PM1-05: ProfilePage preference mutations update the React Query cache on
 *   success so downstream consumers see the change without a refetch.
 */

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
  assert.match(session, /queryClient\.removeQueries\(\{ queryKey: PREFERENCES_QUERY_KEY \}\)/);
  assert.match(session, /queryClient\.setQueryData\(PREFERENCES_QUERY_KEY,/);
  assert.doesNotMatch(session, /localStorage/);
  assert.doesNotMatch(session, /sessionStorage/);
  assert.doesNotMatch(session, /document\.cookie/);

  assert.match(client, /withCredentials: true/);
  assert.match(client, /Authorization = `Bearer \$\{token\}`/);
  assert.doesNotMatch(client, /localStorage|sessionStorage/);
});

// PM1-05: ProfilePage preferences mutation must update the React Query cache on success

test("ProfilePage color-scheme mutation updates the preferences React Query cache on success", async () => {
  const profilePage = await readFile(new URL("../src/pages/ProfilePage.tsx", import.meta.url), "utf8");

  // The mutation must call setQueryData with PREFERENCES_QUERY_KEY so downstream
  // consumers (usePreferences, ColorSchemeSync) see the updated value without a refetch.
  assert.match(profilePage, /queryClient\.setQueryData\(PREFERENCES_QUERY_KEY,\s*data\)/);

  // The mutation function must target the preferences API, not an unrelated endpoint.
  assert.match(profilePage, /updateMyPreferences\(\s*\{\s*colorScheme:\s*scheme\s*\}\s*\)/);

  // PREFERENCES_QUERY_KEY must be imported from the hook — not duplicated as a literal.
  assert.match(profilePage, /import.*PREFERENCES_QUERY_KEY.*from/);
});
