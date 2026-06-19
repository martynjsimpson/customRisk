/**
 * UI-005 — My Risks filter bar behavioural tests
 *
 * Verifies that the filter controls on /my-risks actually cause getMyRisks to
 * be called with the corresponding query parameters. Static source checks
 * cannot catch this: the bug would be that setSearchParams updates the URL but
 * the useMemo dependency on the URLSearchParams object doesn't re-evaluate
 * (object identity stays the same in some React Router environments), so the
 * TanStack Query key stays the same and no new fetch fires.
 *
 * The fix is to derive primitive string values from searchParams before passing
 * them as useMemo dependencies, so Object.is comparisons work correctly.
 */

import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — must appear before any component import
// ---------------------------------------------------------------------------

const getMyRisksMock = vi.fn();

vi.mock("../src/api/dashboard.api", () => ({
  getMyRisks: (...args: unknown[]) => getMyRisksMock(...args),
  exportMyRisks: vi.fn().mockResolvedValue({ blob: new Blob(), filename: "export.csv" })
}));

vi.mock("../src/api/registers.api", () => ({
  getRegister: vi.fn().mockResolvedValue({
    id: "reg-1",
    name: "Test Register",
    effectiveRole: "VIEWER",
    reviewsEnabled: false
  })
}));

vi.mock("../src/api/risks.api", () => ({
  getRiskFormConfig: vi.fn().mockResolvedValue({
    states: [],
    customFields: [],
    users: [],
    likelihoodValues: [],
    impactValues: [],
    riskLevels: [],
    responseStrategies: [],
    register: {
      id: "reg-1",
      defaultNewRiskState: "DRAFT",
      reviewsEnabled: false,
      customFieldValidationEnabled: false
    }
  })
}));

vi.mock("../src/components/ApiErrorAlert", () => ({
  ApiErrorAlert: () => null
}));

vi.mock("../src/auth/session", () => ({
  useAuth: () => ({
    accessToken: "token",
    user: { id: "user-1", name: "Alice", email: "alice@example.com" },
    permissions: { isSystemAdmin: false, registerRoles: {} },
    enabledFeatures: {},
    isBootstrapping: false,
    logout: vi.fn(),
    appEnvironment: null
  })
}));

vi.mock("../src/hooks/useFeatureFlags", () => ({
  useFeatureFlags: () => ({})
}));

vi.mock("../src/hooks/usePreferences", () => ({
  usePreferences: () => null,
  PREFERENCES_QUERY_KEY: ["preferences"]
}));

vi.mock("../src/features/risks/useRiskTableColumns", () => ({
  useMyRisksTableColumns: () => ({
    visibleColumns: ["register", "title", "state", "level"],
    setColumns: vi.fn()
  })
}));

vi.mock("../src/features/risks/ColumnPicker", () => ({
  ColumnPicker: () => null
}));

// ---------------------------------------------------------------------------
// Lazy import — after vi.mock() calls are hoisted
// ---------------------------------------------------------------------------

import { MyRisksPage } from "../src/pages/MyRisksPage";

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const RISK_1 = {
  id: "risk-1",
  displayRiskId: "R-001",
  title: "Supply chain disruption",
  state: "OPEN",
  riskScore: 6,
  riskLevel: { id: "rl-1", name: "High", color: null },
  reviewStatus: "NOT_REQUIRED",
  nextReviewDate: null,
  register: { id: "reg-1", name: "Operations" },
  owner: { id: "user-1", name: "Alice" },
  customFieldValues: []
};

const RISK_2 = {
  id: "risk-2",
  displayRiskId: "R-002",
  title: "Data breach",
  state: "OPEN",
  riskScore: 9,
  riskLevel: { id: "rl-2", name: "Critical", color: null },
  reviewStatus: "NOT_REQUIRED",
  nextReviewDate: null,
  register: { id: "reg-1", name: "Operations" },
  owner: { id: "user-1", name: "Alice" },
  customFieldValues: []
};

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
        <MemoryRouter initialEntries={["/my-risks"]}>
          <Routes>
            <Route path="/my-risks" element={children} />
          </Routes>
        </MemoryRouter>
      </MantineProvider>
    </QueryClientProvider>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("UI-005: MyRisksPage filter bar", () => {
  beforeEach(() => {
    getMyRisksMock.mockResolvedValue([RISK_1, RISK_2]);
  });

  it("calls getMyRisks on initial load", async () => {
    render(<MyRisksPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(getMyRisksMock).toHaveBeenCalledTimes(1);
    });
  });

  it("calls getMyRisks with search param after typing in the search box", async () => {
    const user = userEvent.setup();
    render(<MyRisksPage />, { wrapper: Wrapper });

    // Wait for initial load
    await waitFor(() => expect(getMyRisksMock).toHaveBeenCalledTimes(1));

    const searchInput = screen.getByRole("textbox", { name: /search/i });
    await user.type(searchInput, "breach");

    await waitFor(() => {
      const calls = getMyRisksMock.mock.calls;
      const lastCall = calls[calls.length - 1][0] as { search?: string };
      expect(lastCall.search).toBe("breach");
    });
  });

  it("shows filtered results when search triggers a new API response", async () => {
    const user = userEvent.setup();
    render(<MyRisksPage />, { wrapper: Wrapper });

    // Wait for both risks to appear
    await waitFor(() => {
      expect(screen.getByText("Supply chain disruption")).toBeTruthy();
      expect(screen.getByText("Data breach")).toBeTruthy();
    });

    // After typing, API returns only the matching risk
    getMyRisksMock.mockResolvedValue([RISK_2]);

    const searchInput = screen.getByRole("textbox", { name: /search/i });
    await user.type(searchInput, "breach");

    await waitFor(() => {
      expect(screen.queryByText("Supply chain disruption")).toBeNull();
      expect(screen.getByText("Data breach")).toBeTruthy();
    });
  });

  it("Reset button clears filters and refetches without params", async () => {
    const user = userEvent.setup();
    render(<MyRisksPage />, { wrapper: Wrapper });

    await waitFor(() => expect(getMyRisksMock).toHaveBeenCalledTimes(1));

    const searchInput = screen.getByRole("textbox", { name: /search/i });
    await user.type(searchInput, "breach");

    // Reset button should appear while a filter is active
    const resetButton = await screen.findByRole("button", { name: /reset/i });
    await user.click(resetButton);

    await waitFor(() => {
      const calls = getMyRisksMock.mock.calls;
      const lastCall = calls[calls.length - 1][0] as { search?: string };
      expect(lastCall.search).toBeUndefined();
    });
  });
});
