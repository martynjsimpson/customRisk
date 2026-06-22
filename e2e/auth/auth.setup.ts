/**
 * E2E authentication setup — Playwright storageState per named role.
 *
 * This setup project runs before any test project that depends on it
 * (see playwright.config.ts `dependencies: ['auth-setup']`).
 *
 * For each named fixture user, it:
 *  1. Navigates to the login page
 *  2. Submits the login form
 *  3. Waits for a successful redirect (confirming the session is active)
 *  4. Saves the browser storage state to e2e/auth/.auth/<role>.json
 *
 * Individual tests then load a cached session via `use: { storageState }` in
 * their project configuration rather than repeating the login flow per test.
 *
 * The .auth/ directory is gitignored. Session files are generated at the start
 * of each local or CI test session.
 *
 * See: docs/decisions/ADR-0011-e2e-test-layer.md §2.3
 * See: docs/spikes/SPIKE-003.md §4.2 for the named user definitions
 */

import path from "node:path";
import { test as setup } from "@playwright/test";

const E2E_PASSWORD = process.env.E2E_TEST_PASSWORD;
if (!E2E_PASSWORD) {
  throw new Error("E2E_TEST_PASSWORD environment variable must be set before running auth setup.");
}

const AUTH_DIR = path.join(__dirname, ".auth");

/**
 * Named roles and their corresponding fixture email addresses.
 * The output file name is used by test projects to load the cached session.
 *
 * These map 1:1 with the users seeded in e2e/fixtures/seed.ts.
 */
const ROLES = [
  { role: "sys-admin",       email: "sys-admin@test.local"       },
  { role: "reg-admin-a",     email: "reg-admin-a@test.local"     },
  { role: "reg-viewer-a",    email: "reg-viewer-a@test.local"    },
  { role: "risk-owner-a",    email: "risk-owner-a@test.local"    },
  { role: "response-owner-a", email: "response-owner-a@test.local" },
  { role: "no-access",       email: "no-access@test.local"       },
] as const;

for (const { role, email } of ROLES) {
  setup(`authenticate as ${role}`, async ({ page }) => {
    const storageStatePath = path.join(AUTH_DIR, `${role}.json`);

    // Navigate to the login page
    await page.goto("/login");

    // Fill in credentials and submit
    await page.getByLabel("Email").fill(email);
    await page.getByRole("textbox", { name: "Password" }).fill(E2E_PASSWORD!);
    await page.getByRole("button", { name: /log in/i }).click();

    // Wait for a successful redirect away from the login page, confirming
    // the session cookie has been issued and the application is ready
    await page.waitForURL((url) => !url.pathname.includes("/login"), {
      timeout: 10_000,
    });

    // Save the browser storage state (cookies + localStorage) for this role
    await page.context().storageState({ path: storageStatePath });
  });
}
