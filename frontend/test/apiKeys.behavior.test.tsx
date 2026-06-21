/**
 * PM13-01 — API Keys behavioural tests (post PM-decision UX redesign)
 *
 * Covers two surfaces:
 *
 *  A. ApiKeysPage (admin audit view) — read-only, no create button, revoke only
 *  B. ProfilePage API Keys section — generate key, one-time reveal modal,
 *     modal is dismissed and key cleared on Done
 */

import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("../src/api/apiKeys.api", () => ({
  adminListApiKeys: vi.fn().mockResolvedValue([]),
  adminRevokeApiKey: vi.fn(),
  listMyApiKeys: vi.fn().mockResolvedValue([]),
  createMyApiKey: vi.fn(),
  revokeMyApiKey: vi.fn()
}));

vi.mock("../src/api/profile.api", () => ({
  updateMyProfile: vi.fn(),
  changeMyPassword: vi.fn()
}));

vi.mock("../src/api/preferences.api", () => ({
  updateMyPreferences: vi.fn()
}));

vi.mock("../src/components/ApiErrorAlert", () => ({
  ApiErrorAlert: () => null
}));

vi.mock("../src/auth/session", () => ({
  useAuth: () => ({
    user: { id: "u1", name: "Alice Smith", email: "alice@example.com" },
    logout: vi.fn(),
    appEnvironment: null
  })
}));

vi.mock("../src/hooks/useFeatureFlags", () => ({
  useFeatureFlags: () => ({
    apiKeys: true,
    userPreferences: false
  })
}));

vi.mock("../src/hooks/usePreferences", () => ({
  PREFERENCES_QUERY_KEY: ["preferences"]
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={makeQueryClient()}>
      <MantineProvider>
        <Notifications />
        {children}
      </MantineProvider>
    </QueryClientProvider>
  );
}

// ---------------------------------------------------------------------------
// A. ApiKeysPage — admin audit view
// ---------------------------------------------------------------------------

describe("PM13-01-A — ApiKeysPage admin audit view", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const api = await import("../src/api/apiKeys.api");
    (api.adminListApiKeys as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  });

  it("renders the oversight helper text with no create button", async () => {
    const { ApiKeysPage } = await import("../src/pages/ApiKeysPage");

    render(<ApiKeysPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText(/read-only audit view/i)).toBeTruthy();
    });

    expect(screen.queryByRole("button", { name: /create/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /generate/i })).toBeNull();
  });

  it("shows Owner column in the table header", async () => {
    const { adminListApiKeys } = await import("../src/api/apiKeys.api");
    const { ApiKeysPage } = await import("../src/pages/ApiKeysPage");

    (adminListApiKeys as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: "k1",
        name: "CI key",
        keyPrefix: "cr_live_abc",
        status: "active",
        createdAt: new Date().toISOString(),
        lastUsedAt: null,
        expiresAt: null,
        revokedAt: null,
        user: { id: "u1", name: "Alice Smith", email: "alice@example.com" },
        createdBy: null
      }
    ]);

    render(<ApiKeysPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeTruthy();
    });

    expect(screen.getByText(/owner/i)).toBeTruthy();
    expect(screen.getByText("CI key")).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// B. ProfilePage API Keys section
// ---------------------------------------------------------------------------

describe("PM13-01-B — ProfilePage API Keys section", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const api = await import("../src/api/apiKeys.api");
    (api.listMyApiKeys as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  });

  it("raw key reveal modal opens with the returned key after generating", async () => {
    const { createMyApiKey } = await import("../src/api/apiKeys.api");
    const { ProfilePage } = await import("../src/pages/ProfilePage");

    (createMyApiKey as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "key-1",
      name: "My test key",
      keyPrefix: "cr_live_abc",
      rawKey: "cr_live_abc123supersecretvalue",
      status: "active",
      createdAt: new Date().toISOString(),
      expiresAt: null,
      lastUsedAt: null
    });

    const user = userEvent.setup();
    render(<ProfilePage />, { wrapper: Wrapper });

    // Open the generate modal
    await user.click(await screen.findByRole("button", { name: /generate api key/i }));

    // The generate modal opens as a dialog. Use the stable data-testid attribute
    // to locate the name input rather than relying on placeholder text.
    await screen.findByRole("dialog");
    const nameInput = screen.getByTestId("api-key-name-input") as HTMLElement;
    await user.type(nameInput, "My test key");

    // Submit
    await user.click(screen.getByRole("button", { name: /^generate$/i }));

    // Raw key reveal modal must appear
    await waitFor(() => {
      expect(screen.getByText("cr_live_abc123supersecretvalue")).toBeTruthy();
    });

    expect(screen.getByText(/copy this key now/i)).toBeTruthy();
    expect(screen.getByText(/not be shown again/i)).toBeTruthy();
  });

  it("closing the raw key modal clears the key so it cannot be seen again", async () => {
    const { createMyApiKey } = await import("../src/api/apiKeys.api");
    const { ProfilePage } = await import("../src/pages/ProfilePage");

    (createMyApiKey as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "key-2",
      name: "Ephemeral key",
      keyPrefix: "cr_live_xyz",
      rawKey: "cr_live_xyzSECRETKEY999",
      status: "active",
      createdAt: new Date().toISOString(),
      expiresAt: null,
      lastUsedAt: null
    });

    const user = userEvent.setup();
    render(<ProfilePage />, { wrapper: Wrapper });

    // Generate a key
    await user.click(await screen.findByRole("button", { name: /generate api key/i }));
    await screen.findByRole("dialog");
    const nameInput = screen.getByTestId("api-key-name-input") as HTMLElement;
    await user.type(nameInput, "Ephemeral key");
    await user.click(screen.getByRole("button", { name: /^generate$/i }));

    await waitFor(() => {
      expect(screen.getByText("cr_live_xyzSECRETKEY999")).toBeTruthy();
    });

    // Dismiss via Done
    await user.click(screen.getByRole("button", { name: /^done$/i }));

    await waitFor(() => {
      expect(screen.queryByText("cr_live_xyzSECRETKEY999")).toBeNull();
    });
  });

  it("raw key modal does not appear on initial render", async () => {
    const { ProfilePage } = await import("../src/pages/ProfilePage");

    render(<ProfilePage />, { wrapper: Wrapper });

    // Wait for the API Keys section heading to be present — use getAllByText
    // because both the section heading and description text contain "api keys"
    await waitFor(() => {
      expect(screen.getAllByText(/api keys/i).length).toBeGreaterThan(0);
    });

    expect(screen.queryByText(/copy this key now/i)).toBeNull();
    expect(screen.queryByText(/not be shown again/i)).toBeNull();
  });
});
