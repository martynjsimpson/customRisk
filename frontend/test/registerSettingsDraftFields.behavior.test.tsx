/**
 * DRAFT-UNIFIED — RegisterSettingsTab behavioural tests
 *
 * Covers docs/architecture/register-config-draft-system.md section 5.4: every register settings
 * field handler in RegisterSettingsTab (other than responseActionMode, which has its own
 * dedicated mutation pair and is covered in responseActionMode.behavior.test.tsx) must:
 *
 * 1. In draft mode with an active draft, commit ONLY its own field via updateDraftConfig, and
 *    never call updateRegister.
 * 2. In draft mode with no active draft, be disabled and fire nothing.
 * 3. Outside draft mode, still write via updateRegister on form blur (regression guard for the
 *    direct-write path, which stays supported per section 5.3).
 *
 * It also covers the read side: form values must load from the draft snapshot
 * (configQuery.data.register) in draft mode and from the live register otherwise — a static test
 * cannot catch a bug here, because the source still "mentions the right hooks" either way; only a
 * render proves which one actually populates the form.
 */

import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock hoisted state
// ---------------------------------------------------------------------------

const mocks = vi.hoisted(() => ({
  getRegister: vi.fn(),
  updateRegister: vi.fn(),
  getConfigVersionStatus: vi.fn(),
  updateDraftConfig: vi.fn(),
  getRegisterConfiguration: vi.fn(),
  flags: { draftConfig: true, childActions: false } as { draftConfig: boolean; childActions: boolean },
}));

vi.mock("../src/api/registers.api", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getRegister: (...args: unknown[]) => mocks.getRegister(...args),
    updateRegister: (...args: unknown[]) => mocks.updateRegister(...args),
    deleteRegister: vi.fn(),
  };
});

vi.mock("../src/api/configVersion.api", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getConfigVersionStatus: (...args: unknown[]) => mocks.getConfigVersionStatus(...args),
    updateDraftConfig: (...args: unknown[]) => mocks.updateDraftConfig(...args),
  };
});

vi.mock("../src/api/customFields.api", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getRegisterConfiguration: (...args: unknown[]) => mocks.getRegisterConfiguration(...args),
  };
});

vi.mock("../src/hooks/usePermissions", () => ({
  usePermissions: () => ({ isSystemAdmin: false, registerRoles: [] }),
}));

vi.mock("../src/hooks/useFeatureFlags", () => ({
  useFeatureFlags: () => ({ ...mocks.flags }),
}));

vi.mock("../src/components/ApiErrorAlert", () => ({
  ApiErrorAlert: () => null,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const REGISTER_ID = "reg-1";

// Live register values (distinct from the draft values below, so tests can prove which one the
// form actually reads from).
function makeLiveRegister(overrides: Record<string, unknown> = {}) {
  return {
    id: REGISTER_ID,
    name: "Live Name",
    description: "Live description",
    riskIdPrefix: "LIV",
    riskIdZeroPaddingEnabled: false,
    riskIdZeroPaddingWidth: 4,
    reviewsEnabled: false,
    defaultReviewFrequencyMonths: 6,
    allowViewerExport: false,
    customFieldValidationEnabled: false,
    responseActionMode: "SIMPLE" as const,
    effectiveRole: "REGISTER_ADMIN" as const,
    openRisksCount: 0,
    overdueRisksCount: 0,
    linkedTemplate: null,
    ...overrides,
  };
}

// Draft snapshot values, deliberately different from the live register above.
function makeRegisterConfig(overrides: Record<string, unknown> = {}) {
  return {
    customFields: [],
    states: ["OPEN"],
    register: {
      id: REGISTER_ID,
      name: "Draft Name",
      description: "Draft description",
      riskIdPrefix: "DFT",
      riskIdZeroPaddingEnabled: false,
      riskIdZeroPaddingWidth: 5,
      reviewsEnabled: true,
      defaultReviewFrequencyMonths: 9,
      allowViewerExport: true,
      customFieldValidationEnabled: true,
      responseActionMode: "SIMPLE" as const,
      ...overrides,
    },
    users: [],
    likelihoodValues: [],
    impactValues: [],
    riskLevels: [],
    responseStrategies: [],
  };
}

function makeStatus(hasDraft: boolean) {
  return {
    hasDraft,
    currentVersion: hasDraft ? null : { id: "v-1", versionNumber: 1 },
  };
}

function Wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <MantineProvider>{children}</MantineProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

async function renderTab() {
  const { RegisterSettingsTab } = await import("../src/features/configuration/RegisterSettingsTab");
  render(
    <Wrapper>
      <RegisterSettingsTab registerId={REGISTER_ID} />
    </Wrapper>
  );
}

// ---------------------------------------------------------------------------
// Draft mode with an active draft
// ---------------------------------------------------------------------------

describe("RegisterSettingsTab — draft mode with an active draft (DRAFT-UNIFIED)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.flags.draftConfig = true;
    mocks.getRegister.mockResolvedValue(makeLiveRegister());
    mocks.getConfigVersionStatus.mockResolvedValue(makeStatus(true));
    mocks.getRegisterConfiguration.mockResolvedValue(makeRegisterConfig());
    mocks.updateDraftConfig.mockResolvedValue({});
    mocks.updateRegister.mockResolvedValue(makeLiveRegister());
  });

  it("loads every settings field from the draft snapshot, not the live register", async () => {
    await renderTab();

    const nameInput = await screen.findByRole("textbox", { name: /^name$/i });
    await waitFor(() => expect((nameInput as HTMLInputElement).value).toBe("Draft Name"));

    expect((screen.getByRole("textbox", { name: /^prefix$/i }) as HTMLInputElement).value).toBe("DFT");
    // reviewsEnabled is true in the draft snapshot but false on the live register — proves the
    // form is not silently falling back to the live row.
    expect((screen.getByRole("checkbox", { name: /^reviews enabled$/i }) as HTMLInputElement).checked).toBe(true);
  });

  it("name: blur commits only { name } via updateDraftConfig, never updateRegister", async () => {
    await renderTab();
    const user = userEvent.setup();

    const nameInput = await screen.findByRole("textbox", { name: /^name$/i });
    await waitFor(() => expect((nameInput as HTMLInputElement).value).toBe("Draft Name"));
    await user.clear(nameInput);
    await user.type(nameInput, "Renamed Register");
    await user.tab();

    await waitFor(() => {
      expect(mocks.updateDraftConfig).toHaveBeenCalledWith(REGISTER_ID, {
        register: { name: "Renamed Register" },
      });
    });
    expect(mocks.updateRegister).not.toHaveBeenCalled();
  });

  it("description: blur commits only { description } via updateDraftConfig, never updateRegister", async () => {
    await renderTab();
    const user = userEvent.setup();

    const descriptionInput = await screen.findByRole("textbox", { name: /^description$/i });
    await waitFor(() => expect((descriptionInput as HTMLTextAreaElement).value).toBe("Draft description"));
    await user.clear(descriptionInput);
    await user.type(descriptionInput, "New description");
    await user.tab();

    await waitFor(() => {
      expect(mocks.updateDraftConfig).toHaveBeenCalledWith(REGISTER_ID, {
        register: { description: "New description" },
      });
    });
    expect(mocks.updateRegister).not.toHaveBeenCalled();
  });

  it("riskIdPrefix: blur commits only { riskIdPrefix } via updateDraftConfig, never updateRegister", async () => {
    await renderTab();
    const user = userEvent.setup();

    const prefixInput = await screen.findByRole("textbox", { name: /^prefix$/i });
    await waitFor(() => expect((prefixInput as HTMLInputElement).value).toBe("DFT"));
    await user.clear(prefixInput);
    await user.type(prefixInput, "NEW");
    await user.tab();

    await waitFor(() => {
      expect(mocks.updateDraftConfig).toHaveBeenCalledWith(REGISTER_ID, {
        register: { riskIdPrefix: "NEW" },
      });
    });
    expect(mocks.updateRegister).not.toHaveBeenCalled();
  });

  it("riskIdZeroPaddingEnabled: toggling commits only { riskIdZeroPaddingEnabled } via updateDraftConfig, never updateRegister", async () => {
    await renderTab();
    const user = userEvent.setup();

    const checkbox = await screen.findByRole("checkbox", { name: /zero-pad risk ids/i });
    await waitFor(() => expect((checkbox as HTMLInputElement).checked).toBe(false));
    await user.click(checkbox);

    await waitFor(() => {
      expect(mocks.updateDraftConfig).toHaveBeenCalledWith(REGISTER_ID, {
        register: { riskIdZeroPaddingEnabled: true },
      });
    });
    expect(mocks.updateRegister).not.toHaveBeenCalled();
  });

  it("riskIdZeroPaddingWidth: after enabling zero-padding, blur commits only { riskIdZeroPaddingWidth }", async () => {
    await renderTab();
    const user = userEvent.setup();

    // Padding width starts disabled — the draft snapshot has riskIdZeroPaddingEnabled: false.
    const checkbox = await screen.findByRole("checkbox", { name: /zero-pad risk ids/i });
    await user.click(checkbox);
    await waitFor(() => expect(mocks.updateDraftConfig).toHaveBeenCalledTimes(1));

    const widthInput = await screen.findByLabelText(/padding width/i);
    await waitFor(() => expect((widthInput as HTMLInputElement).disabled).toBe(false));
    await user.clear(widthInput);
    await user.type(widthInput, "6");
    await user.tab();

    await waitFor(() => {
      expect(mocks.updateDraftConfig).toHaveBeenLastCalledWith(REGISTER_ID, {
        register: { riskIdZeroPaddingWidth: 6 },
      });
    });
    expect(mocks.updateRegister).not.toHaveBeenCalled();
  });

  it("allowViewerExport: toggling commits only { allowViewerExport } via updateDraftConfig, never updateRegister", async () => {
    await renderTab();
    const user = userEvent.setup();

    const checkbox = await screen.findByRole("checkbox", { name: /allow register viewers to export/i });
    await waitFor(() => expect((checkbox as HTMLInputElement).checked).toBe(true));
    await user.click(checkbox);

    await waitFor(() => {
      expect(mocks.updateDraftConfig).toHaveBeenCalledWith(REGISTER_ID, {
        register: { allowViewerExport: false },
      });
    });
    expect(mocks.updateRegister).not.toHaveBeenCalled();
  });

  it("customFieldValidationEnabled: toggling commits only { customFieldValidationEnabled } via updateDraftConfig, never updateRegister", async () => {
    await renderTab();
    const user = userEvent.setup();

    const checkbox = await screen.findByRole("checkbox", { name: /enable custom field validation/i });
    await waitFor(() => expect((checkbox as HTMLInputElement).checked).toBe(true));
    await user.click(checkbox);

    await waitFor(() => {
      expect(mocks.updateDraftConfig).toHaveBeenCalledWith(REGISTER_ID, {
        register: { customFieldValidationEnabled: false },
      });
    });
    expect(mocks.updateRegister).not.toHaveBeenCalled();
  });

  it("reviewsEnabled: toggling commits only { reviewsEnabled } via updateDraftConfig, never updateRegister", async () => {
    await renderTab();
    const user = userEvent.setup();

    const checkbox = await screen.findByRole("checkbox", { name: /^reviews enabled$/i });
    await waitFor(() => expect((checkbox as HTMLInputElement).checked).toBe(true));
    await user.click(checkbox);

    await waitFor(() => {
      expect(mocks.updateDraftConfig).toHaveBeenCalledWith(REGISTER_ID, {
        register: { reviewsEnabled: false },
      });
    });
    expect(mocks.updateRegister).not.toHaveBeenCalled();
  });

  it("defaultReviewFrequencyMonths: blur commits only { defaultReviewFrequencyMonths } via updateDraftConfig, never updateRegister", async () => {
    await renderTab();
    const user = userEvent.setup();

    // Draft snapshot has reviewsEnabled: true, so this field starts enabled.
    const frequencyInput = await screen.findByLabelText(/default review frequency \(months\)/i);
    await waitFor(() => expect((frequencyInput as HTMLInputElement).disabled).toBe(false));
    await user.clear(frequencyInput);
    await user.type(frequencyInput, "18");
    await user.tab();

    await waitFor(() => {
      expect(mocks.updateDraftConfig).toHaveBeenCalledWith(REGISTER_ID, {
        register: { defaultReviewFrequencyMonths: 18 },
      });
    });
    expect(mocks.updateRegister).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Draft mode with no active draft — settingsLocked
// ---------------------------------------------------------------------------

describe("RegisterSettingsTab — draft mode with no active draft (settingsLocked)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.flags.draftConfig = true;
    mocks.getRegister.mockResolvedValue(makeLiveRegister());
    mocks.getConfigVersionStatus.mockResolvedValue(makeStatus(false));
    mocks.getRegisterConfiguration.mockResolvedValue(makeRegisterConfig());
    mocks.updateDraftConfig.mockResolvedValue({});
    mocks.updateRegister.mockResolvedValue(makeLiveRegister());
  });

  it("disables every settings field and never calls updateDraftConfig or updateRegister", async () => {
    await renderTab();
    const user = userEvent.setup();

    const nameInput = await screen.findByRole("textbox", { name: /^name$/i });
    await waitFor(() => expect((nameInput as HTMLInputElement).value).toBe("Live Name"));

    expect((nameInput as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole("textbox", { name: /^prefix$/i }) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole("checkbox", { name: /zero-pad risk ids/i }) as HTMLInputElement).disabled).toBe(true);
    expect(
      (screen.getByRole("checkbox", { name: /allow register viewers to export/i }) as HTMLInputElement).disabled
    ).toBe(true);
    expect(
      (screen.getByRole("checkbox", { name: /enable custom field validation/i }) as HTMLInputElement).disabled
    ).toBe(true);
    expect((screen.getByRole("checkbox", { name: /^reviews enabled$/i }) as HTMLInputElement).disabled).toBe(true);

    // A disabled field cannot fire its own commit handler; the config query is also disabled
    // (enabled: draftConfigMode && hasDraft), so the draft snapshot is never even fetched.
    await user.tab();
    expect(mocks.getRegisterConfiguration).not.toHaveBeenCalled();
    expect(mocks.updateDraftConfig).not.toHaveBeenCalled();
    expect(mocks.updateRegister).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Outside draft mode — direct-write path regression guard
// ---------------------------------------------------------------------------

describe("RegisterSettingsTab — outside draft mode (direct-write regression guard)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.flags.draftConfig = false;
    mocks.getRegister.mockResolvedValue(makeLiveRegister());
    mocks.getConfigVersionStatus.mockResolvedValue(makeStatus(false));
    mocks.getRegisterConfiguration.mockResolvedValue(makeRegisterConfig());
    mocks.updateDraftConfig.mockResolvedValue({});
    mocks.updateRegister.mockResolvedValue(makeLiveRegister());
  });

  it("loads settings from the live register, not the draft snapshot, when draftConfigMode is false", async () => {
    await renderTab();

    const nameInput = await screen.findByRole("textbox", { name: /^name$/i });
    await waitFor(() => expect((nameInput as HTMLInputElement).value).toBe("Live Name"));
    expect(mocks.getRegisterConfiguration).not.toHaveBeenCalled();
  });

  it("form blur commits via updateRegister (direct path), never updateDraftConfig", async () => {
    await renderTab();
    const user = userEvent.setup();

    const nameInput = await screen.findByRole("textbox", { name: /^name$/i });
    await waitFor(() => expect((nameInput as HTMLInputElement).value).toBe("Live Name"));
    await user.clear(nameInput);
    await user.type(nameInput, "Directly Saved Name");
    // handleFormBlur only fires updateSettingsMutation when focus truly leaves the form
    // (event.currentTarget.contains(event.relatedTarget) is false). Fire the blur directly with
    // an explicit relatedTarget outside the form, rather than relying on enough Tab presses to
    // walk past every field and button in the form.
    fireEvent.blur(nameInput, { relatedTarget: document.body });

    await waitFor(() => {
      expect(mocks.updateRegister).toHaveBeenCalledWith(
        REGISTER_ID,
        expect.objectContaining({ name: "Directly Saved Name" })
      );
    });
    expect(mocks.updateDraftConfig).not.toHaveBeenCalled();
  });
});
