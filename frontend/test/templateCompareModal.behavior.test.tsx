/**
 * BUG-061 — TemplateLinkPanel Compare modal behavioural tests
 *
 * compareRegisterToTemplate's registerSettingsKeys now includes scoringFormula and
 * responseActionMode (backend/src/services/template.service.ts). A static assertion that the
 * backend array literal contains those two strings cannot catch a bug where the diff is computed
 * correctly but never reaches the screen — BUG-061's acceptance bar is explicit that the diff
 * must be "confirmed in the rendered Compare modal", not only in the comparison function. These
 * tests render TemplateLinkPanel's Compare modal and assert the diff entry is actually shown.
 */

import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getRegister: vi.fn(),
  unlinkRegisterFromTemplate: vi.fn(),
  compareRegisterToTemplate: vi.fn(),
  applyTemplateUpdateToDraft: vi.fn(),
}));

vi.mock("../src/api/registers.api", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getRegister: (...args: unknown[]) => mocks.getRegister(...args),
    unlinkRegisterFromTemplate: (...args: unknown[]) => mocks.unlinkRegisterFromTemplate(...args),
  };
});

vi.mock("../src/api/templates.api", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    compareRegisterToTemplate: (...args: unknown[]) => mocks.compareRegisterToTemplate(...args),
    applyTemplateUpdateToDraft: (...args: unknown[]) => mocks.applyTemplateUpdateToDraft(...args),
  };
});

vi.mock("../src/hooks/usePermissions", () => ({
  usePermissions: () => ({ isSystemAdmin: true, registerRoles: [] }),
}));

vi.mock("../src/components/ApiErrorAlert", () => ({
  ApiErrorAlert: () => null,
}));

const REGISTER_ID = "reg-1";

function makeRegister() {
  return {
    id: REGISTER_ID,
    name: "Test Register",
    linkedTemplate: {
      templateId: "tpl-1",
      templateName: "Standard Register Template",
      templateIsActive: true,
      linkedVersionId: "tpl-v1",
      linkedVersionNumber: 1,
      latestPublishedVersionId: "tpl-v1",
      latestPublishedVersionNumber: 1,
      isLatest: true,
    },
  };
}

function emptyDifferences() {
  return {
    registerSettings: [] as string[],
    customFieldsAdded: [] as string[],
    customFieldsRemoved: [] as string[],
    customFieldsChanged: [] as string[],
    likelihoodValuesAdded: [] as string[],
    likelihoodValuesRemoved: [] as string[],
    impactValuesAdded: [] as string[],
    impactValuesRemoved: [] as string[],
    riskLevelsAdded: [] as string[],
    riskLevelsRemoved: [] as string[],
    responseStrategiesAdded: [] as string[],
    responseStrategiesRemoved: [] as string[],
  };
}

function Wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider>{children}</MantineProvider>
    </QueryClientProvider>
  );
}

async function renderPanelAndOpenCompare() {
  const { TemplateLinkPanel } = await import("../src/features/configuration/TemplateLinkPanel");
  const user = userEvent.setup();

  render(
    <Wrapper>
      <TemplateLinkPanel registerId={REGISTER_ID} canManage={true} />
    </Wrapper>
  );

  const compareButton = await screen.findByRole("button", { name: /^compare$/i });
  await user.click(compareButton);

  return screen.findByRole("dialog");
}

describe("TemplateLinkPanel Compare modal — registerSettings diff rendering (BUG-061)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRegister.mockResolvedValue(makeRegister());
  });

  it("shows scoringFormula in the rendered diff when the register diverges only in scoringFormula", async () => {
    mocks.compareRegisterToTemplate.mockResolvedValue({
      hasDifferences: true,
      differences: { ...emptyDifferences(), registerSettings: ["scoringFormula"] },
    });

    const dialog = await renderPanelAndOpenCompare();

    await waitFor(() => {
      expect(within(dialog).getByText("Register settings changed")).toBeTruthy();
      expect(within(dialog).getByText("scoringFormula")).toBeTruthy();
    });
  });

  it("shows responseActionMode in the rendered diff when the register diverges only in responseActionMode", async () => {
    mocks.compareRegisterToTemplate.mockResolvedValue({
      hasDifferences: true,
      differences: { ...emptyDifferences(), registerSettings: ["responseActionMode"] },
    });

    const dialog = await renderPanelAndOpenCompare();

    await waitFor(() => {
      expect(within(dialog).getByText("Register settings changed")).toBeTruthy();
      expect(within(dialog).getByText("responseActionMode")).toBeTruthy();
    });
  });

  it("shows no registerSettings diff entry and the 'matches exactly' message when register and template are identical", async () => {
    mocks.compareRegisterToTemplate.mockResolvedValue({
      hasDifferences: false,
      differences: emptyDifferences(),
    });

    const dialog = await renderPanelAndOpenCompare();

    await waitFor(() => {
      expect(
        within(dialog).getByText(/this register's configuration matches the template exactly/i)
      ).toBeTruthy();
    });
    expect(within(dialog).queryByText("Register settings changed")).toBeNull();
    expect(within(dialog).queryByText("scoringFormula")).toBeNull();
    expect(within(dialog).queryByText("responseActionMode")).toBeNull();
  });
});
