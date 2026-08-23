/**
 * UI-024 — TemplateDriftBanner behavioural tests
 *
 * Covers:
 * 1. TemplateDriftBanner itself: renders for linkedTemplate.isLatest === false, and is absent
 *    for isLatest === true and for linkedTemplate === null (pure component, no data fetching).
 * 2. RegisterDetailPage integration: the banner is absent for a user without manage rights even
 *    when the register is linked and drifted, and its CTA switches the active tab to
 *    Configuration.
 *
 * Heavy sibling panels (risks, configuration, permissions, audit) are stubbed out — this test is
 * only concerned with the banner's gating and the tab-switch wiring, not those panels' own
 * behaviour (which is covered elsewhere).
 */

import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TemplateDriftBanner } from "../src/features/configuration/TemplateDriftBanner";
import type { LinkedTemplate } from "../src/api/registers.api";

// ---------------------------------------------------------------------------
// Part 1 — TemplateDriftBanner in isolation (pure component)
// ---------------------------------------------------------------------------

function makeLinkedTemplate(overrides: Partial<LinkedTemplate> = {}): LinkedTemplate {
  return {
    templateId: "tpl-1",
    templateName: "Standard Register Template",
    templateIsActive: true,
    linkedVersionId: "tpl-v1",
    linkedVersionNumber: 1,
    latestPublishedVersionId: "tpl-v2",
    latestPublishedVersionNumber: 2,
    isLatest: false,
    ...overrides,
  };
}

describe("TemplateDriftBanner", () => {
  it("renders the drift banner when linkedTemplate.isLatest is false", () => {
    render(
      <MantineProvider>
        <TemplateDriftBanner linkedTemplate={makeLinkedTemplate({ isLatest: false })} onViewChanges={vi.fn()} />
      </MantineProvider>
    );

    expect(screen.getByTestId("template-drift-banner")).toBeTruthy();
    expect(screen.getByTestId("template-drift-banner-cta")).toBeTruthy();
    expect(screen.getByText(/standard register template/i)).toBeTruthy();
  });

  it("does not render when linkedTemplate.isLatest is true", () => {
    render(
      <MantineProvider>
        <TemplateDriftBanner linkedTemplate={makeLinkedTemplate({ isLatest: true })} onViewChanges={vi.fn()} />
      </MantineProvider>
    );

    expect(screen.queryByTestId("template-drift-banner")).toBeNull();
  });

  it("does not render when linkedTemplate is null", () => {
    render(
      <MantineProvider>
        <TemplateDriftBanner linkedTemplate={null} onViewChanges={vi.fn()} />
      </MantineProvider>
    );

    expect(screen.queryByTestId("template-drift-banner")).toBeNull();
  });

  it("calls onViewChanges when the CTA is clicked", async () => {
    const onViewChanges = vi.fn();
    const user = userEvent.setup();

    render(
      <MantineProvider>
        <TemplateDriftBanner linkedTemplate={makeLinkedTemplate()} onViewChanges={onViewChanges} />
      </MantineProvider>
    );

    await user.click(screen.getByTestId("template-drift-banner-cta"));
    expect(onViewChanges).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Part 2 — RegisterDetailPage integration: manage-rights gating and tab switch
// ---------------------------------------------------------------------------

const mocks = vi.hoisted(() => ({
  getRegister: vi.fn(),
  listRegisterPermissions: vi.fn(),
  listRegisterPermissionCandidates: vi.fn(),
  isSystemAdmin: false,
}));

vi.mock("../src/api/registers.api", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getRegister: (...args: unknown[]) => mocks.getRegister(...args),
    listRegisterPermissions: (...args: unknown[]) => mocks.listRegisterPermissions(...args),
    listRegisterPermissionCandidates: (...args: unknown[]) => mocks.listRegisterPermissionCandidates(...args),
  };
});

vi.mock("../src/hooks/usePermissions", () => ({
  usePermissions: () => ({ isSystemAdmin: mocks.isSystemAdmin, registerRoles: [] }),
}));

vi.mock("../src/components/ApiErrorAlert", () => ({
  ApiErrorAlert: () => null,
}));

// Stub the heavy sibling panels — this test only cares about the banner and tab switching.
vi.mock("../src/features/risks/RiskRegisterPanel", () => ({
  RiskRegisterPanel: () => <div data-testid="stub-risks-panel" />,
}));
vi.mock("../src/features/configuration/RegisterConfigurationPanel", () => ({
  RegisterConfigurationPanel: () => <div data-testid="stub-configuration-panel" />,
}));
vi.mock("../src/features/registers/RegisterPermissionsPanel", () => ({
  RegisterPermissionsPanel: () => <div data-testid="stub-permissions-panel" />,
}));
vi.mock("../src/features/audit/RegisterAuditPanel", () => ({
  RegisterAuditPanel: () => <div data-testid="stub-audit-panel" />,
}));

const REGISTER_ID = "reg-1";

function makeRegister(overrides: Record<string, unknown> = {}) {
  return {
    id: REGISTER_ID,
    name: "Drifted Register",
    description: "",
    effectiveRole: "REGISTER_ADMIN" as const,
    linkedTemplate: makeLinkedTemplate({ isLatest: false }),
    ...overrides,
  };
}

async function renderDetailPage() {
  const { RegisterDetailPage } = await import("../src/pages/RegisterDetailPage");
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  render(
    <MemoryRouter initialEntries={[`/registers/${REGISTER_ID}`]}>
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <Routes>
            <Route path="/registers/:registerId" element={<RegisterDetailPage />} />
          </Routes>
        </MantineProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

describe("RegisterDetailPage — TemplateDriftBanner integration (UI-024)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listRegisterPermissions.mockResolvedValue([]);
    mocks.listRegisterPermissionCandidates.mockResolvedValue([]);
  });

  it("shows the drift banner for a user with manage rights, and its CTA switches to the Configuration tab", async () => {
    mocks.isSystemAdmin = false;
    mocks.getRegister.mockResolvedValue(makeRegister({ effectiveRole: "REGISTER_ADMIN" }));

    await renderDetailPage();
    const user = userEvent.setup();

    const banner = await screen.findByTestId("template-drift-banner");
    expect(banner).toBeTruthy();

    // Mantine Tabs keeps all panels mounted (display: none for inactive ones) — assert via the
    // tab's aria-selected state rather than presence/absence in the DOM.
    const risksTab = await screen.findByRole("tab", { name: "Risks" });
    const configTab = screen.getByRole("tab", { name: "Configuration" });
    expect(risksTab.getAttribute("aria-selected")).toBe("true");
    expect(configTab.getAttribute("aria-selected")).toBe("false");

    await user.click(screen.getByTestId("template-drift-banner-cta"));

    await waitFor(() => {
      expect(configTab.getAttribute("aria-selected")).toBe("true");
    });
    expect(risksTab.getAttribute("aria-selected")).toBe("false");
  });

  it("does not show the drift banner for a user without manage rights, even though the register is linked and drifted", async () => {
    mocks.isSystemAdmin = false;
    mocks.getRegister.mockResolvedValue(makeRegister({ effectiveRole: "REGISTER_VIEWER" }));

    await renderDetailPage();

    // Wait for the register to finish loading (risks panel — always rendered for any role).
    await screen.findByTestId("stub-risks-panel");

    expect(screen.queryByTestId("template-drift-banner")).toBeNull();
    // Configuration tab itself is not offered to a non-manager, either.
    expect(screen.queryByRole("tab", { name: "Configuration" })).toBeNull();
  });
});
