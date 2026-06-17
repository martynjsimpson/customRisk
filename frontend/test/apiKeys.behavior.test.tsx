/**
 * PM13-01 — API Keys page behavioural tests
 *
 * Verifies two runtime behaviours that static source checks cannot catch:
 *
 *  1. The raw key reveal modal appears only after a successful create mutation
 *     and contains the returned rawKey value.
 *  2. Closing the raw key modal (via the Done button) clears the rawKey state
 *     so it is never shown again.
 */

import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("../src/api/apiKeys.api", () => ({
  listApiKeys: vi.fn().mockResolvedValue([]),
  createApiKey: vi.fn(),
  revokeApiKey: vi.fn()
}));

vi.mock("../src/components/ApiErrorAlert", () => ({
  ApiErrorAlert: () => null
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
      <MantineProvider>{children}</MantineProvider>
    </QueryClientProvider>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PM13-01 — ApiKeysPage raw key reveal modal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("raw key modal opens with the returned key after a successful create", async () => {
    const { createApiKey } = await import("../src/api/apiKeys.api");
    const { ApiKeysPage } = await import("../src/pages/ApiKeysPage");

    (createApiKey as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "key-1",
      name: "My test key",
      keyPrefix: "cr_live_abc",
      rawKey: "cr_live_abc123supersecretvalue",
      createdAt: new Date().toISOString(),
      expiresAt: null
    });

    const user = userEvent.setup();
    render(<ApiKeysPage />, { wrapper: Wrapper });

    // Open the create modal
    await user.click(screen.getByRole("button", { name: /create api key/i }));

    // Fill in the name field
    const nameInput = await screen.findByLabelText(/name/i);
    await user.type(nameInput, "My test key");

    // Submit the form
    await user.click(screen.getByRole("button", { name: /^create$/i }));

    // Raw key reveal modal must appear and show the actual key
    await waitFor(() => {
      expect(screen.getByText("cr_live_abc123supersecretvalue")).toBeTruthy();
    });

    // Warning copy must be visible
    expect(screen.getByText(/copy this key now/i)).toBeTruthy();
    expect(screen.getByText(/not be shown again/i)).toBeTruthy();
  });

  it("closing the raw key modal clears the key so it cannot be seen again", async () => {
    const { createApiKey } = await import("../src/api/apiKeys.api");
    const { ApiKeysPage } = await import("../src/pages/ApiKeysPage");

    (createApiKey as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "key-2",
      name: "Ephemeral key",
      keyPrefix: "cr_live_xyz",
      rawKey: "cr_live_xyzSECRETKEY999",
      createdAt: new Date().toISOString(),
      expiresAt: null
    });

    const user = userEvent.setup();
    render(<ApiKeysPage />, { wrapper: Wrapper });

    // Open the create modal and submit
    await user.click(screen.getByRole("button", { name: /create api key/i }));
    const nameInput = await screen.findByLabelText(/name/i);
    await user.type(nameInput, "Ephemeral key");
    await user.click(screen.getByRole("button", { name: /^create$/i }));

    // Wait for the raw key to appear
    await waitFor(() => {
      expect(screen.getByText("cr_live_xyzSECRETKEY999")).toBeTruthy();
    });

    // Click Done to dismiss
    await user.click(screen.getByRole("button", { name: /^done$/i }));

    // The raw key must no longer be in the DOM
    await waitFor(() => {
      expect(screen.queryByText("cr_live_xyzSECRETKEY999")).toBeNull();
    });
  });

  it("raw key modal does not appear before any create mutation has run", async () => {
    const { ApiKeysPage } = await import("../src/pages/ApiKeysPage");

    render(<ApiKeysPage />, { wrapper: Wrapper });

    // Neither the warning text nor any raw key should be in the initial render
    expect(screen.queryByText(/copy this key now/i)).toBeNull();
    expect(screen.queryByText(/not be shown again/i)).toBeNull();
  });
});
