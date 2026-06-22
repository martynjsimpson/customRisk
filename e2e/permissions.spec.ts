/**
 * E2E Permission Test Suite — QA-001 Sections 1, 2, 3, 5, 9, 12, 13, 19
 *
 * Tests run against the full application stack with cached storageState sessions
 * written by the auth setup project (e2e/auth/auth.setup.ts).
 *
 * Fixture data is seeded by `npm run e2e:seed` (e2e/fixtures/seed.ts) before
 * running this suite. All fixture records are identifiable by:
 *   - Users: email ending in @test.local
 *   - Registers: name prefixed with e2e-
 *
 * Selector strategy (per ADR-0011 and e2e-testing.md):
 *   - data-testid for structural/presence assertions where ARIA roles are ambiguous
 *   - getByRole / getByLabel for interactive controls (buttons, inputs, tabs)
 *   - getByText is avoided; text strings shift with copy changes
 *
 * data-testid attributes required by this suite that must be present in the
 * frontend before these tests can pass are documented in:
 *   docs/work/active-release.md § "E2E-002 data-testid gap list"
 *
 * See: docs/engineering/permission-test-plan.md for the full QA-001 checklist.
 * See: docs/decisions/ADR-0011-e2e-test-layer.md for test strategy.
 */

import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Fixture user credentials
// ---------------------------------------------------------------------------

const E2E_PASSWORD = process.env.E2E_TEST_PASSWORD ?? "";

const EMAILS = {
  "sys-admin":       "sys-admin@test.local",
  "reg-admin-a":     "reg-admin-a@test.local",
  "reg-viewer-a":    "reg-viewer-a@test.local",
  "risk-owner-a":    "risk-owner-a@test.local",
  "response-owner-a": "response-owner-a@test.local",
  "no-access":       "no-access@test.local",
} as const;

type Role = keyof typeof EMAILS;

/**
 * Log in as the given role on the supplied page.
 *
 * Called in beforeEach hooks instead of relying on storageState files.
 * The app uses rotating refresh tokens — a token can only be used once.
 * Reusing a saved storageState across tests within the same run triggers
 * token-reuse detection and revokes the whole token family. Fresh login
 * per test avoids this entirely.
 *
 * Handles rate limiting: if the login form shows "Too many authentication
 * attempts", waits 65 s for the 60 s window to expire, then retries.
 */
async function loginAs(page: Page, role: Role) {
  const RATE_LIMIT_TEXT = "Too many authentication attempts";

  async function attempt() {
    await page.goto("/login");
    await page.getByLabel("Email").fill(EMAILS[role]);
    await page.getByRole("textbox", { name: "Password" }).fill(E2E_PASSWORD);
    await page.getByRole("button", { name: /log in/i }).click();
  }

  await attempt();

  // If the rate-limit error appears, wait for the window to reset and retry
  const rateLimited = await page
    .getByText(RATE_LIMIT_TEXT)
    .isVisible({ timeout: 2_000 })
    .catch(() => false);
  if (rateLimited) {
    await page.waitForTimeout(65_000);
    await attempt();
  }

  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 15_000,
  });
}

// Fixture register names (seeded by e2e/fixtures/seed.ts)
const REGISTER_A_NAME = "e2e-register-a";
const REGISTER_B_NAME = "e2e-register-b";

// Fixture risk titles (seeded by e2e/fixtures/seed.ts)
const RISK_X_TITLE = "e2e-risk-x";
const RISK_Y_TITLE = "e2e-risk-y";

// Fixture response action text (seeded by e2e/fixtures/seed.ts)
const ACTION_A_TEXT = "e2e-action-a";

// ---------------------------------------------------------------------------
// Shared navigation helpers
// ---------------------------------------------------------------------------

async function navigateToRegisters(page: Page) {
  await page.goto("/registers");
  await page.waitForURL("/registers", { timeout: 10_000 });
}

async function navigateToRegisterA(page: Page) {
  await navigateToRegisters(page);
  await page
    .locator(`[data-testid="register-row-link"][data-register-name="${REGISTER_A_NAME}"]`)
    .click();
  await page.waitForURL(/\/registers\//, { timeout: 10_000 });
  await page.getByRole("tab", { name: "Risks" }).waitFor({ timeout: 10_000 });
}

async function openRiskXInRegisterA(page: Page) {
  await navigateToRegisterA(page);
  await page
    .locator(`[data-testid="risk-row-link"][data-risk-title="${RISK_X_TITLE}"]`)
    .waitFor({ timeout: 15_000 });
  await page
    .locator(`[data-testid="risk-row-link"][data-risk-title="${RISK_X_TITLE}"]`)
    .click();
  // Wait for risk detail modal — look for the field table (from MAINT-021)
  await page
    .locator(`[data-testid="risk-detail-field-table"]`)
    .waitFor({ timeout: 10_000 });
}

async function openRiskXResponseActionsPanel(
  page: Page,
) {
  await navigateToRegisterA(page);
  await page
    .locator(`[data-testid="risk-row-link"][data-risk-title="${RISK_X_TITLE}"]`)
    .waitFor({ timeout: 15_000 });
  await page
    .locator(`[data-testid="risk-row-link"][data-risk-title="${RISK_X_TITLE}"]`)
    .click();
  await page
    .locator(`[data-testid="response-actions-panel"]`)
    .waitFor({ timeout: 10_000 });
}

// ---------------------------------------------------------------------------
// Section 19 — Unauthenticated Access
// (No storageState — runs in a clean browser context)
// ---------------------------------------------------------------------------

test.describe("Section 19 — Unauthenticated Access", () => {
  // Override storageState to ensure no session is loaded for any test here
  test.use({ storageState: { cookies: [], origins: [] } });

  test("19.1 — /registers redirects to /login when unauthenticated", async ({ page }) => {
    await page.goto("/registers");
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test("19.1 — / redirects to /login when unauthenticated", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test("19.2 — GET /api/registers without session returns 401", async ({ request }) => {
    const res = await request.get("/api/v1/registers");
    expect(res.status()).toBe(401);
  });

  test("19.2 — GET /api/users without session returns 401", async ({ request }) => {
    const res = await request.get("/api/v1/users");
    expect(res.status()).toBe(401);
  });

  test("19.2 — GET /api/audit without session returns 401", async ({ request }) => {
    const res = await request.get("/api/v1/audit");
    expect(res.status()).toBe(401);
  });

  test("19.3 — GET /api/registers with invalid Bearer token returns 401", async ({
    request,
  }) => {
    const res = await request.get("/api/v1/registers", {
      headers: { Authorization: "Bearer not-a-valid-token" },
    });
    expect(res.status()).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Section 12 — System Audit Log Access
// ---------------------------------------------------------------------------

test.describe("Section 12 — System Admin sees /audit", () => {
  test.beforeEach(async ({ page }) => { await loginAs(page, "sys-admin"); });

  test("12.1 — System Admin can navigate to /audit and sees audit log heading", async ({
    page,
  }) => {
    await page.goto("/audit");
    await expect(page).toHaveURL("/audit");
    await expect(page.getByRole("heading", { name: "Audit" })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("12.1 — System Admin sees the Audit nav link", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Audit" })).toBeVisible({
      timeout: 10_000,
    });
  });
});

test.describe("Section 12 — Register Admin cannot access /audit", () => {
  test.beforeEach(async ({ page }) => { await loginAs(page, "reg-admin-a"); });

  test("12.3 — Register Admin does not see the Audit nav link", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Audit" })).toHaveCount(0, {
      timeout: 10_000,
    });
  });
});

test.describe("Section 12 — Register Viewer cannot access /audit", () => {
  test.beforeEach(async ({ page }) => { await loginAs(page, "reg-viewer-a"); });

  test("12.4 — Register Viewer does not see the Audit nav link", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Audit" })).toHaveCount(0, {
      timeout: 10_000,
    });
  });
});

test.describe("Section 12 — Risk Owner cannot access /audit", () => {
  test.beforeEach(async ({ page }) => { await loginAs(page, "risk-owner-a"); });

  test("12.5 — Risk Owner does not see the Audit nav link", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Audit" })).toHaveCount(0, {
      timeout: 10_000,
    });
  });
});

// ---------------------------------------------------------------------------
// Section 13 — User Management
// ---------------------------------------------------------------------------

test.describe("Section 13 — System Admin manages users", () => {
  test.beforeEach(async ({ page }) => { await loginAs(page, "sys-admin"); });

  test("13.1 — System Admin can navigate to /users and sees the Users heading", async ({
    page,
  }) => {
    await page.goto("/users");
    await expect(page.getByRole("heading", { name: "Users" })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("13.1 — System Admin sees the Users nav link", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Users" })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("13.2 — System Admin can open the Add user modal", async ({ page }) => {
    await page.goto("/users");
    await page.getByRole("button", { name: "Add user" }).click();
    await expect(page.getByRole("dialog", { name: "Add user" })).toBeVisible({
      timeout: 10_000,
    });
  });
});

test.describe("Section 13 — Register Admin cannot manage users", () => {
  test.beforeEach(async ({ page }) => { await loginAs(page, "reg-admin-a"); });

  test("13.7 — Register Admin does not see the Users nav link", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Users" })).toHaveCount(0, {
      timeout: 10_000,
    });
  });

  test("13.8 (API) — Register Admin gets 4xx when calling GET /api/users", async ({
    page,
  }) => {
    // Load the session via page navigation, then use page.request which carries
    // the session cookies into the API call.
    await page.goto("/");
    const res = await page.request.get("/api/v1/users");
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });
});

test.describe("Section 13 — Register Viewer cannot manage users", () => {
  test.beforeEach(async ({ page }) => { await loginAs(page, "reg-viewer-a"); });

  test("13.9 — Register Viewer does not see the Users nav link", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Users" })).toHaveCount(0, {
      timeout: 10_000,
    });
  });
});

// ---------------------------------------------------------------------------
// Section 1 — Register CRUD
// ---------------------------------------------------------------------------

test.describe("Section 1 — System Admin register access", () => {
  test.beforeEach(async ({ page }) => { await loginAs(page, "sys-admin"); });

  test("1.1 — System Admin sees Register A and Register B in the list", async ({
    page,
  }) => {
    await navigateToRegisters(page);
    await expect(
      page.locator(
        `[data-testid="register-row-link"][data-register-name="${REGISTER_A_NAME}"]`,
      ),
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.locator(
        `[data-testid="register-row-link"][data-register-name="${REGISTER_B_NAME}"]`,
      ),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("1.2 — System Admin sees the Create register button", async ({ page }) => {
    await navigateToRegisters(page);
    await expect(
      page.getByRole("button", { name: /create register/i }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("1.1 — System Admin sees Configuration, Permissions, Audit tabs in Register A", async ({
    page,
  }) => {
    await navigateToRegisterA(page);
    await expect(page.getByRole("tab", { name: "Configuration" })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByRole("tab", { name: "Permissions" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Audit" })).toBeVisible();
  });
});

test.describe("Section 1 — Register Admin access", () => {
  test.beforeEach(async ({ page }) => { await loginAs(page, "reg-admin-a"); });

  test("1.5 — Register Admin sees Register A", async ({ page }) => {
    await navigateToRegisters(page);
    await expect(
      page.locator(
        `[data-testid="register-row-link"][data-register-name="${REGISTER_A_NAME}"]`,
      ),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("1.7 — Register Admin does not see Create register button", async ({
    page,
  }) => {
    await navigateToRegisters(page);
    await expect(
      page.getByRole("button", { name: /create register/i }),
    ).toHaveCount(0, { timeout: 10_000 });
  });

  test("1.9 — Register Admin does not see Register B", async ({ page }) => {
    await navigateToRegisters(page);
    await expect(
      page.locator(
        `[data-testid="register-row-link"][data-register-name="${REGISTER_B_NAME}"]`,
      ),
    ).toHaveCount(0, { timeout: 10_000 });
  });

  test("1.6 — Register Admin sees Configuration, Permissions, Audit tabs", async ({
    page,
  }) => {
    await navigateToRegisterA(page);
    await expect(page.getByRole("tab", { name: "Configuration" })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByRole("tab", { name: "Permissions" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Audit" })).toBeVisible();
  });

  test("1.8 — Register Admin does not see a Delete register button", async ({
    page,
  }) => {
    await navigateToRegisterA(page);
    await expect(
      page.getByRole("button", { name: /delete register/i }),
    ).toHaveCount(0, { timeout: 10_000 });
  });
});

test.describe("Section 1 — Register Viewer access", () => {
  test.beforeEach(async ({ page }) => { await loginAs(page, "reg-viewer-a"); });

  test("1.10 — Register Viewer sees Register A", async ({ page }) => {
    await navigateToRegisters(page);
    await expect(
      page.locator(
        `[data-testid="register-row-link"][data-register-name="${REGISTER_A_NAME}"]`,
      ),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("1.11 — Register Viewer does not see Configuration, Permissions, Audit tabs", async ({
    page,
  }) => {
    await navigateToRegisterA(page);
    await expect(page.getByRole("tab", { name: "Configuration" })).toHaveCount(0);
    await expect(page.getByRole("tab", { name: "Permissions" })).toHaveCount(0);
    await expect(page.getByRole("tab", { name: "Audit" })).toHaveCount(0);
  });

  test("1.12 — Register Viewer does not see Create register button", async ({
    page,
  }) => {
    await navigateToRegisters(page);
    await expect(
      page.getByRole("button", { name: /create register/i }),
    ).toHaveCount(0, { timeout: 10_000 });
  });
});

test.describe("Section 1 — Risk Owner register access", () => {
  test.beforeEach(async ({ page }) => { await loginAs(page, "risk-owner-a"); });

  test("1.13 — Risk Owner sees Register A", async ({ page }) => {
    await navigateToRegisters(page);
    await expect(
      page.locator(
        `[data-testid="register-row-link"][data-register-name="${REGISTER_A_NAME}"]`,
      ),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("1.14 — Risk Owner does not see Configuration, Permissions, Audit tabs", async ({
    page,
  }) => {
    await navigateToRegisterA(page);
    await expect(page.getByRole("tab", { name: "Configuration" })).toHaveCount(0);
    await expect(page.getByRole("tab", { name: "Permissions" })).toHaveCount(0);
    await expect(page.getByRole("tab", { name: "Audit" })).toHaveCount(0);
  });
});

test.describe("Section 1 — Risk Response Owner register access", () => {
  test.beforeEach(async ({ page }) => { await loginAs(page, "response-owner-a"); });

  test("1.15 — Risk Response Owner sees Register A", async ({ page }) => {
    await navigateToRegisters(page);
    await expect(
      page.locator(
        `[data-testid="register-row-link"][data-register-name="${REGISTER_A_NAME}"]`,
      ),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("1.16 — Risk Response Owner does not see Configuration, Permissions, Audit tabs", async ({
    page,
  }) => {
    await navigateToRegisterA(page);
    await expect(page.getByRole("tab", { name: "Configuration" })).toHaveCount(0);
    await expect(page.getByRole("tab", { name: "Permissions" })).toHaveCount(0);
    await expect(page.getByRole("tab", { name: "Audit" })).toHaveCount(0);
  });
});

test.describe("Section 1 — No-access user sees no registers", () => {
  test.beforeEach(async ({ page }) => { await loginAs(page, "no-access"); });

  test("1.17 — No-access user sees no registers in the list", async ({ page }) => {
    await navigateToRegisters(page);
    await expect(
      page.locator(`[data-testid="register-row-link"]`),
    ).toHaveCount(0, { timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// Section 2 — Risk CRUD
// ---------------------------------------------------------------------------

test.describe("Section 2 — System Admin risk access", () => {
  test.beforeEach(async ({ page }) => { await loginAs(page, "sys-admin"); });

  test("2.1 — System Admin sees Risk X in Register A", async ({ page }) => {
    await navigateToRegisterA(page);
    await expect(
      page.locator(`[data-testid="risk-row-link"][data-risk-title="${RISK_X_TITLE}"]`),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("2.3 — System Admin sees Add risk button", async ({ page }) => {
    await navigateToRegisterA(page);
    await expect(
      page.getByRole("button", { name: /add risk/i }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("2.5 — System Admin sees Delete button on risk rows", async ({ page }) => {
    await navigateToRegisterA(page);
    await page
      .locator(`[data-testid="risk-row-link"][data-risk-title="${RISK_X_TITLE}"]`)
      .waitFor({ timeout: 15_000 });
    await expect(
      page.getByRole("button", { name: /delete/i }).first(),
    ).toBeVisible();
  });
});

test.describe("Section 2 — Register Admin risk access", () => {
  test.beforeEach(async ({ page }) => { await loginAs(page, "reg-admin-a"); });

  test("2.6 — Register Admin sees risk list for Register A", async ({ page }) => {
    await navigateToRegisterA(page);
    await expect(
      page.locator(`[data-testid="risk-row-link"][data-risk-title="${RISK_X_TITLE}"]`),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("2.7 — Register Admin sees Add risk button", async ({ page }) => {
    await navigateToRegisterA(page);
    await expect(
      page.getByRole("button", { name: /add risk/i }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("2.9 — Register Admin does not see Delete button on risk rows", async ({
    page,
  }) => {
    await navigateToRegisterA(page);
    await page
      .locator(`[data-testid="risk-row-link"][data-risk-title="${RISK_X_TITLE}"]`)
      .waitFor({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: /delete/i })).toHaveCount(0);
  });
});

test.describe("Section 2 — Register Viewer risk access", () => {
  test.beforeEach(async ({ page }) => { await loginAs(page, "reg-viewer-a"); });

  test("2.10 — Register Viewer sees risk list (read-only)", async ({ page }) => {
    await navigateToRegisterA(page);
    await expect(
      page.locator(`[data-testid="risk-row-link"][data-risk-title="${RISK_X_TITLE}"]`),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("2.12 — Register Viewer does not see Add risk button", async ({ page }) => {
    await navigateToRegisterA(page);
    await page.locator(`[data-testid="risk-row-link"]`).first().waitFor({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: /add risk/i })).toHaveCount(0);
  });

  test("2.13 — Register Viewer does not see Edit button on risk rows", async ({
    page,
  }) => {
    await navigateToRegisterA(page);
    await page.locator(`[data-testid="risk-row-link"]`).first().waitFor({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: /^edit$/i })).toHaveCount(0);
  });
});

test.describe("Section 2 — Risk Owner risk access", () => {
  test.beforeEach(async ({ page }) => { await loginAs(page, "risk-owner-a"); });

  test("2.14 — Risk Owner sees at least Risk X in the list", async ({ page }) => {
    await navigateToRegisterA(page);
    await expect(
      page.locator(`[data-testid="risk-row-link"][data-risk-title="${RISK_X_TITLE}"]`),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("2.16 — Risk Owner sees Edit button for Risk X (risk they own)", async ({
    page,
  }) => {
    await navigateToRegisterA(page);
    const riskXRow = page.locator(
      `[data-testid="risk-table-row"][data-risk-title="${RISK_X_TITLE}"]`,
    );
    await riskXRow.waitFor({ timeout: 15_000 });
    await expect(riskXRow.getByRole("button", { name: /^edit$/i })).toBeVisible();
  });

  test("2.17 — Risk Owner does not see Risk Y (risk they do not own) in the list", async ({
    page,
  }) => {
    await navigateToRegisterA(page);
    // Wait for the table to load by confirming Risk X (owned by this user) is present
    await page
      .locator(`[data-testid="risk-table-row"][data-risk-title="${RISK_X_TITLE}"]`)
      .waitFor({ timeout: 15_000 });
    // Risk Y (owned by a different user) must not appear — Risk Owners only see their own risks
    await expect(
      page.locator(`[data-testid="risk-table-row"][data-risk-title="${RISK_Y_TITLE}"]`),
    ).toHaveCount(0);
  });

  test("2.18 — Risk Owner does not see Delete button", async ({ page }) => {
    await navigateToRegisterA(page);
    await page
      .locator(`[data-testid="risk-row-link"][data-risk-title="${RISK_X_TITLE}"]`)
      .waitFor({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: /delete/i })).toHaveCount(0);
  });
});

test.describe("Section 2 — Risk Response Owner risk access", () => {
  test.beforeEach(async ({ page }) => { await loginAs(page, "response-owner-a"); });

  test("2.20 — Risk Response Owner can view Risk X (visible via linked action)", async ({
    page,
  }) => {
    await navigateToRegisterA(page);
    await expect(
      page.locator(`[data-testid="risk-row-link"][data-risk-title="${RISK_X_TITLE}"]`),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("2.22 — Risk Response Owner does not see Edit button on any row", async ({
    page,
  }) => {
    await navigateToRegisterA(page);
    await page.locator(`[data-testid="risk-row-link"]`).first().waitFor({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: /^edit$/i })).toHaveCount(0);
  });

  test("2.23 — Risk Response Owner does not see Add risk button", async ({
    page,
  }) => {
    await navigateToRegisterA(page);
    await page.locator(`[data-testid="risk-row-link"]`).first().waitFor({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: /add risk/i })).toHaveCount(0);
  });
});

test.describe("Section 2 — No-access user cannot see risks", () => {
  test.beforeEach(async ({ page }) => { await loginAs(page, "no-access"); });

  test("2.24 — No-access user sees no registers, cannot reach risks", async ({
    page,
  }) => {
    await navigateToRegisters(page);
    await expect(
      page.locator(
        `[data-testid="register-row-link"][data-register-name="${REGISTER_A_NAME}"]`,
      ),
    ).toHaveCount(0, { timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// Section 3 — Risk Response Action CRUD (Child Record Mode)
// ---------------------------------------------------------------------------

test.describe("Section 3 — System Admin response action access", () => {
  test.beforeEach(async ({ page }) => { await loginAs(page, "sys-admin"); });

  test("3.1 — System Admin sees Action A in Risk X response actions panel", async ({
    page,
  }) => {
    await openRiskXResponseActionsPanel(page);
    await expect(
      page.locator(
        `[data-testid="response-action-row"][data-action-text="${ACTION_A_TEXT}"]`,
      ),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("3.2 — System Admin sees Add action button", async ({ page }) => {
    await openRiskXResponseActionsPanel(page);
    await expect(
      page.getByRole("button", { name: /add (response )?action/i }),
    ).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Section 3 — Register Admin response action access", () => {
  test.beforeEach(async ({ page }) => { await loginAs(page, "reg-admin-a"); });

  test("3.5 — Register Admin sees response actions for Risk X", async ({ page }) => {
    await openRiskXResponseActionsPanel(page);
    await expect(
      page.locator(
        `[data-testid="response-action-row"][data-action-text="${ACTION_A_TEXT}"]`,
      ),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("3.6 — Register Admin sees Add action button", async ({ page }) => {
    await openRiskXResponseActionsPanel(page);
    await expect(
      page.getByRole("button", { name: /add (response )?action/i }),
    ).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Section 3 — Register Viewer response action access", () => {
  test.beforeEach(async ({ page }) => { await loginAs(page, "reg-viewer-a"); });

  test("3.9 — Register Viewer sees response actions (read-only)", async ({ page }) => {
    await openRiskXResponseActionsPanel(page);
    await expect(
      page.locator(
        `[data-testid="response-action-row"][data-action-text="${ACTION_A_TEXT}"]`,
      ),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("3.10 — Register Viewer does not see Add action button", async ({ page }) => {
    await openRiskXResponseActionsPanel(page);
    await page
      .locator(`[data-testid="response-action-row"]`)
      .first()
      .waitFor({ timeout: 10_000 });
    await expect(
      page.getByRole("button", { name: /add (response )?action/i }),
    ).toHaveCount(0);
  });
});

test.describe("Section 3 — Risk Owner response action access", () => {
  test.beforeEach(async ({ page }) => { await loginAs(page, "risk-owner-a"); });

  test("3.13 — Risk Owner sees response actions for Risk X", async ({ page }) => {
    await openRiskXResponseActionsPanel(page);
    await expect(
      page.locator(
        `[data-testid="response-action-row"][data-action-text="${ACTION_A_TEXT}"]`,
      ),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("3.14 — Risk Owner sees Add action button for Risk X (they own the risk)", async ({
    page,
  }) => {
    await openRiskXResponseActionsPanel(page);
    await expect(
      page.getByRole("button", { name: /add (response )?action/i }),
    ).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Section 3 — Risk Response Owner response action access", () => {
  test.beforeEach(async ({ page }) => { await loginAs(page, "response-owner-a"); });

  test("3.18 — Risk Response Owner sees Action A in Risk X detail", async ({
    page,
  }) => {
    await openRiskXResponseActionsPanel(page);
    await expect(
      page.locator(
        `[data-testid="response-action-row"][data-action-text="${ACTION_A_TEXT}"]`,
      ),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("3.22 — Risk Response Owner does not see Add action button", async ({
    page,
  }) => {
    await openRiskXResponseActionsPanel(page);
    await page
      .locator(`[data-testid="response-action-row"]`)
      .first()
      .waitFor({ timeout: 10_000 });
    await expect(
      page.getByRole("button", { name: /add (response )?action/i }),
    ).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// Section 5 — Custom Field Visibility (Risk Response Owner)
// ---------------------------------------------------------------------------

test.describe("Section 5 — Risk Response Owner custom field visibility", () => {
  test.beforeEach(async ({ page }) => { await loginAs(page, "response-owner-a"); });

  test("5.1 — Risk Response Owner sees F1 (visible to response owners)", async ({
    page,
  }) => {
    await openRiskXInRegisterA(page);
    await expect(
      page
        .locator(`[data-testid="risk-detail-field-th"]`)
        .filter({ hasText: "E2E Field F1" }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("5.2 — Risk Response Owner does not see F2 (hidden from response owners)", async ({
    page,
  }) => {
    await openRiskXInRegisterA(page);
    await expect(
      page
        .locator(`[data-testid="risk-detail-field-th"]`)
        .filter({ hasText: "E2E Field F2" }),
    ).toHaveCount(0, { timeout: 10_000 });
  });
});

test.describe("Section 5 — Register Viewer sees all non-admin custom fields", () => {
  test.beforeEach(async ({ page }) => { await loginAs(page, "reg-viewer-a"); });

  test("5.5 — Register Viewer sees F2 (restriction only applies to Response Owners)", async ({
    page,
  }) => {
    await openRiskXInRegisterA(page);
    await expect(
      page
        .locator(`[data-testid="risk-detail-field-th"]`)
        .filter({ hasText: "E2E Field F2" }),
    ).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Section 5 — Risk Owner sees all custom fields", () => {
  test.beforeEach(async ({ page }) => { await loginAs(page, "risk-owner-a"); });

  test("5.6 — Risk Owner sees F2 (restriction does not apply to Risk Owners)", async ({
    page,
  }) => {
    await openRiskXInRegisterA(page);
    await expect(
      page
        .locator(`[data-testid="risk-detail-field-th"]`)
        .filter({ hasText: "E2E Field F2" }),
    ).toBeVisible({ timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// Section 9 — Export Controls
// ---------------------------------------------------------------------------

test.describe("Section 9 — System Admin can export", () => {
  test.beforeEach(async ({ page }) => { await loginAs(page, "sys-admin"); });

  test("9.1 — System Admin sees Export CSV button in Register A", async ({ page }) => {
    await navigateToRegisterA(page);
    await page.locator(`[data-testid="risk-row-link"]`).first().waitFor({ timeout: 15_000 });
    await expect(
      page.getByRole("button", { name: /export csv/i }),
    ).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Section 9 — Register Admin can export", () => {
  test.beforeEach(async ({ page }) => { await loginAs(page, "reg-admin-a"); });

  test("9.2 — Register Admin sees Export CSV button in Register A", async ({ page }) => {
    await navigateToRegisterA(page);
    await page.locator(`[data-testid="risk-row-link"]`).first().waitFor({ timeout: 15_000 });
    await expect(
      page.getByRole("button", { name: /export csv/i }),
    ).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Section 9 — Register Viewer cannot export (allowViewerExport = false)", () => {
  // Register A is seeded with allowViewerExport: false
  test.beforeEach(async ({ page }) => { await loginAs(page, "reg-viewer-a"); });

  test("9.4 — Register Viewer does not see Export CSV button", async ({ page }) => {
    await navigateToRegisterA(page);
    await page.locator(`[data-testid="risk-row-link"]`).first().waitFor({ timeout: 15_000 });
    await expect(
      page.getByRole("button", { name: /export csv/i }),
    ).toHaveCount(0, { timeout: 10_000 });
  });
});

test.describe("Section 9 — Risk Owner cannot export", () => {
  test.beforeEach(async ({ page }) => { await loginAs(page, "risk-owner-a"); });

  test("9.5 — Risk Owner does not see Export CSV button", async ({ page }) => {
    await navigateToRegisterA(page);
    await page.locator(`[data-testid="risk-row-link"]`).first().waitFor({ timeout: 15_000 });
    await expect(
      page.getByRole("button", { name: /export csv/i }),
    ).toHaveCount(0, { timeout: 10_000 });
  });
});

test.describe("Section 9 — Risk Response Owner cannot export", () => {
  test.beforeEach(async ({ page }) => { await loginAs(page, "response-owner-a"); });

  test("9.6 — Risk Response Owner does not see Export CSV button", async ({ page }) => {
    await navigateToRegisterA(page);
    await page.locator(`[data-testid="risk-row-link"]`).first().waitFor({ timeout: 15_000 });
    await expect(
      page.getByRole("button", { name: /export csv/i }),
    ).toHaveCount(0, { timeout: 10_000 });
  });
});
