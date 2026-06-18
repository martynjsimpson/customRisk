/**
 * PM1-05 — Preferences in React Query cache (behavioral tests)
 *
 * Verifies the three PM1-05 acceptance criteria that can only be caught at
 * runtime, not by static source assertions:
 *
 *  1. A preference mutation updates the in-memory query cache immediately —
 *     a subsequent read from usePreferences reflects the new value with no
 *     re-fetch required.
 *  2. A theme change (colorScheme) propagates to Mantine's colour-scheme state
 *     immediately via ColorSchemeSync, without requiring a re-fetch.
 *  3. If the bootstrap preference load fails, the rest of the app is not
 *     blocked — usePreferences returns null gracefully and protected UI
 *     continues to render.
 */

import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, act, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { PREFERENCES_QUERY_KEY } from "../src/hooks/usePreferences";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("../src/api/preferences.api", () => ({
  getMyPreferences: vi.fn(),
  updateMyPreferences: vi.fn()
}));

// usePreferences depends on useAuth — provide a minimal stub so the hook can
// render without a real AuthProvider.
vi.mock("../src/auth/session", () => ({
  useAuth: vi.fn(() => ({
    accessToken: "test-token",
    enabledFeatures: { userPreferences: true }
  }))
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

function Wrapper({
  children,
  queryClient
}: {
  children: React.ReactNode;
  queryClient: QueryClient;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider>{children}</MantineProvider>
    </QueryClientProvider>
  );
}

// ---------------------------------------------------------------------------
// 1. Cache is the single source of truth — mutations update it immediately
// ---------------------------------------------------------------------------

describe("PM1-05 — preference cache as single source of truth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("setQueryData on mutation makes the updated value immediately available via usePreferences", async () => {
    const { usePreferences } = await import("../src/hooks/usePreferences");
    const { updateMyPreferences } = await import("../src/api/preferences.api");
    const { useMutation, useQueryClient } = await import("@tanstack/react-query");

    const updatedPrefs = {
      colorScheme: "dark" as const,
      riskTableColumns: {}
    };

    (updateMyPreferences as ReturnType<typeof vi.fn>).mockResolvedValue(updatedPrefs);

    const queryClient = makeQueryClient();

    // Prime the cache with initial light-mode prefs
    queryClient.setQueryData(PREFERENCES_QUERY_KEY, {
      colorScheme: "light",
      riskTableColumns: {}
    });

    let capturedPrefs: ReturnType<typeof usePreferences> = null;
    let triggerMutation: (() => void) | null = null;

    function TestComponent() {
      const prefs = usePreferences();
      const qc = useQueryClient();
      const mutation = useMutation({
        mutationFn: () => updateMyPreferences({ colorScheme: "dark" }),
        onSuccess: (data) => {
          qc.setQueryData(PREFERENCES_QUERY_KEY, data);
        }
      });

      capturedPrefs = prefs;
      triggerMutation = () => mutation.mutate();

      return (
        <div data-testid="scheme">{prefs?.colorScheme ?? "none"}</div>
      );
    }

    render(
      <Wrapper queryClient={queryClient}>
        <TestComponent />
      </Wrapper>
    );

    // Initial state: light
    expect(screen.getByTestId("scheme").textContent).toBe("light");

    // Trigger the mutation
    await act(async () => {
      triggerMutation!();
    });

    // After onSuccess fires, cache is updated and usePreferences reads "dark"
    // without any re-fetch
    await waitFor(() => {
      expect(screen.getByTestId("scheme").textContent).toBe("dark");
    });

    // Confirm the API was only called once (no extra re-fetch)
    expect(updateMyPreferences).toHaveBeenCalledTimes(1);
  });

  it("staleTime: Infinity means usePreferences never triggers a background refetch after setQueryData", async () => {
    const { getMyPreferences } = await import("../src/api/preferences.api");
    const { usePreferences } = await import("../src/hooks/usePreferences");

    (getMyPreferences as ReturnType<typeof vi.fn>).mockResolvedValue({
      colorScheme: "auto",
      riskTableColumns: {}
    });

    const queryClient = makeQueryClient();

    // Prime the cache directly (as the bootstrap does)
    queryClient.setQueryData(PREFERENCES_QUERY_KEY, {
      colorScheme: "light",
      riskTableColumns: {}
    });

    function TestComponent() {
      const prefs = usePreferences();
      return <div data-testid="scheme">{prefs?.colorScheme ?? "none"}</div>;
    }

    render(
      <Wrapper queryClient={queryClient}>
        <TestComponent />
      </Wrapper>
    );

    // The primed value is read immediately
    expect(screen.getByTestId("scheme").textContent).toBe("light");

    // getMyPreferences should NOT have been called — staleTime: Infinity keeps
    // the pre-seeded cache entry fresh.
    expect(getMyPreferences).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 2. ColorSchemeSync propagates cached colorScheme to Mantine immediately
// ---------------------------------------------------------------------------

describe("PM1-05 — ColorSchemeSync applies theme from cache immediately", () => {
  it("reads colorScheme from cache and calls setColorScheme without a network round-trip", async () => {
    const { ColorSchemeSync } = await import("../src/components/ColorSchemeSync");
    const { getMyPreferences } = await import("../src/api/preferences.api");

    const queryClient = makeQueryClient();

    // Bootstrap: seed the cache as the session bootstrap would
    queryClient.setQueryData(PREFERENCES_QUERY_KEY, {
      colorScheme: "dark",
      riskTableColumns: {}
    });

    // Track what Mantine is told to set. We wrap ColorSchemeSync in a
    // MantineProvider so useMantineColorScheme is wired up correctly.
    const schemeValues: string[] = [];

    const { useMantineColorScheme } = await import("@mantine/core");

    function Observer() {
      const { colorScheme } = useMantineColorScheme();
      schemeValues.push(colorScheme);
      return null;
    }

    render(
      <Wrapper queryClient={queryClient}>
        <ColorSchemeSync />
        <Observer />
      </Wrapper>
    );

    // ColorSchemeSync useEffect should run and call setColorScheme("dark")
    await waitFor(() => {
      expect(schemeValues).toContain("dark");
    });

    // Confirm no API call was needed — the cached value was used
    expect(getMyPreferences).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 3. Graceful degradation — preference load failure does not block the app
// ---------------------------------------------------------------------------

describe("PM1-05 — graceful degradation when preferences unavailable", () => {
  it("usePreferences returns null when the cache is empty (no error thrown)", async () => {
    const { usePreferences } = await import("../src/hooks/usePreferences");
    const { getMyPreferences } = await import("../src/api/preferences.api");

    // Simulate preference fetch failure
    (getMyPreferences as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Network error")
    );

    const queryClient = makeQueryClient();
    // Cache is empty — bootstrap failed silently, nothing was seeded

    let capturedPrefs: ReturnType<typeof usePreferences> | undefined;

    function TestComponent() {
      capturedPrefs = usePreferences();
      return (
        <div data-testid="app-content">
          {capturedPrefs === null ? "no-prefs" : capturedPrefs.colorScheme}
        </div>
      );
    }

    render(
      <Wrapper queryClient={queryClient}>
        <TestComponent />
      </Wrapper>
    );

    // Component renders successfully — no error boundary triggered
    const content = screen.getByTestId("app-content");
    expect(content).toBeTruthy();
    expect(content.textContent).toBe("no-prefs");

    // usePreferences returned null, not an exception
    expect(capturedPrefs).toBeNull();
  });

  it("components consuming usePreferences handle null preferences without crashing", async () => {
    const { ColorSchemeSync } = await import("../src/components/ColorSchemeSync");
    const queryClient = makeQueryClient();
    // Empty cache — no preferences

    // Should render without throwing
    expect(() => {
      render(
        <Wrapper queryClient={queryClient}>
          <ColorSchemeSync />
        </Wrapper>
      );
    }).not.toThrow();
  });
});
