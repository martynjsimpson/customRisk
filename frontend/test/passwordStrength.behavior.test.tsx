/**
 * QOL-001 — Password strength meter on ProfilePage (behavioural tests)
 *
 * Verifies three acceptance criteria:
 *
 *  1. The strength indicator is not visible when the new-password field is empty.
 *  2. The strength indicator appears and updates live as the user types.
 *  3. The change-password form can be submitted regardless of password strength
 *     (the meter is informational, not a blocker).
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
  listMyApiKeys: vi.fn().mockResolvedValue([]),
  createMyApiKey: vi.fn(),
  revokeMyApiKey: vi.fn()
}));

vi.mock("../src/api/profile.api", () => ({
  updateMyProfile: vi.fn(),
  changeMyPassword: vi.fn().mockResolvedValue(undefined)
}));

vi.mock("../src/api/preferences.api", () => ({
  updateMyPreferences: vi.fn()
}));

vi.mock("../src/auth/session", () => ({
  useAuth: vi.fn(() => ({
    user: { id: "u1", name: "Alice Smith", email: "alice@example.com" },
    logout: vi.fn(),
    appEnvironment: null
  }))
}));

vi.mock("../src/hooks/useFeatureFlags", () => ({
  useFeatureFlags: () => ({
    apiKeys: false,
    userPreferences: false
  })
}));

vi.mock("../src/hooks/usePreferences", () => ({
  PREFERENCES_QUERY_KEY: ["preferences"]
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
      <MantineProvider>
        <Notifications />
        {children}
      </MantineProvider>
    </QueryClientProvider>
  );
}

// ---------------------------------------------------------------------------
// QOL-001 tests
// ---------------------------------------------------------------------------

describe("QOL-001 — Password strength meter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("strength indicator is not visible when the new-password field is empty", async () => {
    const { ProfilePage } = await import("../src/pages/ProfilePage");

    render(<ProfilePage />, { wrapper: Wrapper });

    // The strength label should not appear before the user types anything
    expect(screen.queryByText(/Strength:/i)).toBeNull();
  });

  it("strength indicator appears after the user starts typing in the new-password field", async () => {
    const { ProfilePage } = await import("../src/pages/ProfilePage");
    const user = userEvent.setup();

    render(<ProfilePage />, { wrapper: Wrapper });

    const newPasswordInput = screen.getByTestId("new-password-input") as HTMLInputElement;
    expect(newPasswordInput).toBeTruthy();

    await user.type(newPasswordInput, "abc");

    // The Popover opens and the strength label must now appear
    await waitFor(() => {
      expect(screen.getByText(/Strength:/i)).toBeTruthy();
    });
  });

  it("strength label updates from Weak to Strong as the user builds a stronger password", async () => {
    const { ProfilePage } = await import("../src/pages/ProfilePage");
    const user = userEvent.setup();

    render(<ProfilePage />, { wrapper: Wrapper });

    const newPasswordInput = screen.getByTestId("new-password-input") as HTMLInputElement;

    // Type a short, weak password
    await user.type(newPasswordInput, "abc");

    await waitFor(() => {
      expect(screen.getByText(/Strength:\s*Weak/i)).toBeTruthy();
    });

    // Extend to a strong password: 12+ chars, uppercase, digit, special char
    await user.type(newPasswordInput, "DEFGH1!@#0123");

    await waitFor(() => {
      expect(screen.getByText(/Strength:\s*Strong/i)).toBeTruthy();
    });
  });

  it("change-password form can be submitted regardless of password strength", async () => {
    const { changeMyPassword } = await import("../src/api/profile.api");
    const { ProfilePage } = await import("../src/pages/ProfilePage");
    const user = userEvent.setup();

    render(<ProfilePage />, { wrapper: Wrapper });

    const currentPasswordInput = screen.getByTestId("current-password-input") as HTMLInputElement;
    const newPasswordInput = screen.getByTestId("new-password-input") as HTMLInputElement;
    const confirmPasswordInput = screen.getByTestId("confirm-password-input") as HTMLInputElement;

    // Fill with a deliberately weak password — strength meter shows "Weak"
    await user.type(currentPasswordInput, "OldPassword1");
    await user.type(newPasswordInput, "weak");
    await user.type(confirmPasswordInput, "weak");

    // The form should still be submittable — strength is informational only
    const submitButton = screen.getByRole("button", { name: /change password/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(changeMyPassword).toHaveBeenCalledWith("OldPassword1", "weak");
    });
  });
});
