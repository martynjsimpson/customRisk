import dotenv from 'dotenv';
import path from 'path';
import { defineConfig, devices } from '@playwright/test';

dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * Playwright E2E configuration.
 * See ADR-0011 for the full test strategy decision record.
 *
 * Tests run against the full application stack (backend + frontend).
 * Start both before running: `npm run dev:backend` and `npm run dev:frontend`.
 *
 * Auth: per-role storageState files are written by the auth setup project
 * and consumed by tests. Files live in e2e/auth/.auth/ (gitignored).
 *
 * Fixtures: run `npm run e2e:seed` before a test session and
 * `npm run e2e:teardown` after to reset state.
 */
export default defineConfig({
  testDir: './e2e',

  /* Fail the build if any test file has a `.only` in CI */
  forbidOnly: !!process.env.CI,

  /* Retry once on CI to reduce transient flakiness */
  retries: process.env.CI ? 1 : 0,

  /* Sequential by default — parallelism can be enabled per-project later */
  workers: process.env.CI ? 1 : undefined,

  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never' }]]
    : [['html', { open: 'on-failure' }]],

  use: {
    /* Application base URL */
    baseURL: 'http://localhost:5173',

    /* Collect traces on first retry in CI for debugging */
    trace: process.env.CI ? 'on-first-retry' : 'off',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',
  },

  projects: [
    /**
     * Auth setup project — runs before any test project that depends on it.
     * Logs in for each role and writes storageState to e2e/auth/.auth/.
     * The actual setup test file(s) are created by the test engineer.
     */
    {
      name: 'auth-setup',
      testMatch: /e2e\/auth\/.*\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    /**
     * Main test project — Chromium only (per ADR-0011 §2.1).
     * Depends on auth-setup so sessions are always available.
     */
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['auth-setup'],
    },
  ],
});
