/**
 * BUG-054 — Feature flag hardening (behavioural tests)
 *
 * Verifies that flag-gated UI degrades cleanly when its flag is disabled.
 * Static source checks cannot catch these bugs because the flag values are
 * only resolved at runtime.
 *
 * Scenarios covered:
 *
 * 1. childActions=false, register.responseActionMode="CHILD_RECORDS":
 *    - RiskDetailModal does NOT render ResponseActionsPanel
 *    - RiskDetailModal DOES show the legacy responseAction text field
 *
 * 2. childActions=false:
 *    - RegisterSettingsTab does NOT render the "Response Actions" fieldset
 *
 * 3. savedViews=false:
 *    - SavedViewsPanel button is NOT rendered in RiskRegisterPanel
 */

import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — must be hoisted before component imports
// ---------------------------------------------------------------------------

const useFeatureFlagsMock = vi.fn();

vi.mock("../src/hooks/useFeatureFlags", () => ({
  useFeatureFlags: (...args: unknown[]) => useFeatureFlagsMock(...args),
}));

const getRiskMock = vi.fn();
const listRiskReviewsMock = vi.fn();
const listRiskAuditMock = vi.fn();
const listRisksMock = vi.fn();
const getRiskFormConfigMock = vi.fn();
const getValidationSummaryMock = vi.fn();

vi.mock("../src/api/risks.api", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getRisk: (...args: unknown[]) => getRiskMock(...args),
    listRiskReviews: (...args: unknown[]) => listRiskReviewsMock(...args),
    listRisks: (...args: unknown[]) => listRisksMock(...args),
    getRiskFormConfig: (...args: unknown[]) => getRiskFormConfigMock(...args),
    getValidationSummary: (...args: unknown[]) => getValidationSummaryMock(...args),
  };
});

vi.mock("../src/api/audit.api", () => ({
  listRiskAudit: (...args: unknown[]) => listRiskAuditMock(...args),
}));

vi.mock("../src/components/ApiErrorAlert", () => ({
  ApiErrorAlert: () => null,
  getApiErrorCode: () => null,
  getApiErrorWarnings: () => [],
}));

vi.mock("../src/features/audit/AuditEventTable", () => ({
  AuditEventTable: () => null,
}));

// RiskRegisterPanel sub-components not needed for these tests
vi.mock("../src/features/risks/RiskFormModal", () => ({
  RiskFormModal: () => null,
}));
vi.mock("../src/features/risks/DeleteRiskModal", () => ({
  DeleteRiskModal: () => null,
}));
vi.mock("../src/features/risks/ReviewModal", () => ({
  ReviewModal: () => null,
}));
vi.mock("../src/features/risks/ColumnPicker", () => ({
  ColumnPicker: () => null,
}));

vi.mock("../src/hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({ user: { id: "user-1", name: "Alice", email: "alice@example.com" } }),
}));

vi.mock("../src/hooks/usePermissions", () => ({
  usePermissions: () => ({ isSystemAdmin: false }),
}));

vi.mock("../src/features/risks/useRiskTableColumns", () => ({
  useRegisterTableColumns: () => ({
    visibleColumns: ["riskId", "title"],
    setColumns: vi.fn(),
  }),
  filterValidRegisterColumns: (cols: string[]) => cols,
}));

// RegisterSettingsTab deps
const getRegisterMock = vi.fn();
const getConfigVersionStatusMock = vi.fn();
const getRegisterConfigurationMock = vi.fn();

vi.mock("../src/api/registers.api", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getRegister: (...args: unknown[]) => getRegisterMock(...args),
    updateRegister: vi.fn(),
    deleteRegister: vi.fn(),
  };
});

vi.mock("../src/api/configVersion.api", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getConfigVersionStatus: (...args: unknown[]) => getConfigVersionStatusMock(...args),
  };
});

vi.mock("../src/api/customFields.api", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getRegisterConfiguration: (...args: unknown[]) => getRegisterConfigurationMock(...args),
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <MemoryRouter>
      <QueryClientProvider client={makeQueryClient()}>
        <MantineProvider>{children}</MantineProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

function makeRisk() {
  return {
    id: "risk-1",
    displayRiskId: "R-001",
    title: "Test Risk",
    description: "A test risk",
    state: "OPEN",
    registerId: "reg-1",
    riskSequence: 1,
    riskScore: 6,
    createdDate: "2025-01-01",
    likelihood: { id: "l-1", name: "Medium" },
    impact: { id: "i-1", name: "High" },
    riskLevel: { id: "rl-1", name: "High", color: null },
    responseStrategy: { id: "rs-1", name: "Mitigate" },
    responseAction: "Old action text",
    nextReviewDate: null,
    owner: { id: "user-1", name: "Alice", email: "alice@example.com" },
    ownerPerson: null,
    reviewStatus: "NOT_REQUIRED",
    systemCreatedBy: { id: "user-1", name: "Alice", email: "alice@example.com" },
    systemUpdatedAt: new Date().toISOString(),
    systemCreatedAt: new Date().toISOString(),
    systemUpdatedBy: { id: "user-1", name: "Alice", email: "alice@example.com" },
    isOverdue: false,
    validationStatus: "OK",
    lastReviewedAt: null,
    lastReviewedBy: null,
    customFields: [],
    customFieldValues: [],
    responseActionMode: "CHILD_RECORDS" as const,
  };
}

function makeFormConfig(responseActionMode: "SIMPLE" | "CHILD_RECORDS" = "CHILD_RECORDS") {
  return {
    customFields: [],
    states: ["OPEN"],
    register: {
      id: "reg-1",
      defaultNewRiskState: "OPEN",
      reviewsEnabled: false,
      customFieldValidationEnabled: false,
      reviewStatusPosition: null,
      responseActionMode,
    },
    users: [],
    likelihoodValues: [],
    impactValues: [],
    riskLevels: [],
    responseStrategies: [],
  };
}

function makeRegisterRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "reg-1",
    name: "Test Register",
    description: null,
    effectiveRole: "REGISTER_ADMIN",
    riskIdPrefix: null,
    riskIdZeroPaddingEnabled: false,
    riskIdZeroPaddingWidth: 4,
    reviewsEnabled: true,
    defaultReviewFrequencyMonths: 12,
    allowViewerExport: false,
    customFieldValidationEnabled: false,
    responseActionMode: "CHILD_RECORDS",
    defaultNewRiskState: "OPEN",
    riskCount: 0,
    isDeleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// BUG-054 — childActions=false hardening (RiskDetailModal)
// ---------------------------------------------------------------------------

describe("BUG-054 — childActions=false: RiskDetailModal degrades cleanly", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useFeatureFlagsMock.mockReturnValue({ childActions: false, savedViews: false });
  });

  it("does not render ResponseActionsPanel when childActions is false, even if register is in CHILD_RECORDS mode", async () => {
    getRiskMock.mockResolvedValue(makeRisk());
    listRiskReviewsMock.mockResolvedValue([]);
    listRiskAuditMock.mockResolvedValue({ data: [], meta: { total: 0 } });

    const { RiskDetailModal } = await import("../src/features/risks/RiskDetailModal");

    render(
      <Wrapper>
        <RiskDetailModal
          registerId="reg-1"
          riskId="risk-1"
          formConfig={makeFormConfig("CHILD_RECORDS")}
          opened={true}
          canReview={false}
          canEditRows={true}
          canDelete={false}
          effectiveRole="REGISTER_ADMIN"
          currentUserId="user-1"
          onClose={vi.fn()}
          onRequestEdit={vi.fn()}
          onRequestReview={vi.fn()}
          onRequestDelete={vi.fn()}
        />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("Test Risk")).toBeTruthy();
    });

    // The "Risk Responses" heading only appears when ResponseActionsPanel renders
    expect(screen.queryByText("Risk Responses")).toBeNull();
  });

  it("shows responseAction text value when childActions is false, even if register is in CHILD_RECORDS mode", async () => {
    const risk = makeRisk();
    risk.responseAction = "Mitigate by patching";
    getRiskMock.mockResolvedValue(risk);
    listRiskReviewsMock.mockResolvedValue([]);
    listRiskAuditMock.mockResolvedValue({ data: [], meta: { total: 0 } });

    const { RiskDetailModal } = await import("../src/features/risks/RiskDetailModal");

    render(
      <Wrapper>
        <RiskDetailModal
          registerId="reg-1"
          riskId="risk-1"
          formConfig={makeFormConfig("CHILD_RECORDS")}
          opened={true}
          canReview={false}
          canEditRows={true}
          canDelete={false}
          effectiveRole="REGISTER_ADMIN"
          currentUserId="user-1"
          onClose={vi.fn()}
          onRequestEdit={vi.fn()}
          onRequestReview={vi.fn()}
          onRequestDelete={vi.fn()}
        />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("Mitigate by patching")).toBeTruthy();
    });
  });
});

// ---------------------------------------------------------------------------
// BUG-054 — childActions=false hardening (RegisterSettingsTab)
// ---------------------------------------------------------------------------

describe("BUG-054 — childActions=false: RegisterSettingsTab hides Response Actions fieldset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useFeatureFlagsMock.mockReturnValue({ childActions: false, draftConfig: false });
    getRegisterMock.mockResolvedValue(makeRegisterRecord());
    getConfigVersionStatusMock.mockResolvedValue({ hasDraft: false });
  });

  it("does not render the Response Actions fieldset when childActions is false", async () => {
    const { RegisterSettingsTab } = await import(
      "../src/features/configuration/RegisterSettingsTab"
    );

    render(
      <Wrapper>
        <RegisterSettingsTab registerId="reg-1" />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Name")).toBeTruthy();
    });

    expect(screen.queryByText("Response Actions")).toBeNull();
    expect(screen.queryByText("Child Records mode")).toBeNull();
  });

  it("renders the Response Actions fieldset when childActions is true", async () => {
    useFeatureFlagsMock.mockReturnValue({ childActions: true, draftConfig: false });

    const { RegisterSettingsTab } = await import(
      "../src/features/configuration/RegisterSettingsTab"
    );

    render(
      <Wrapper>
        <RegisterSettingsTab registerId="reg-1" />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Name")).toBeTruthy();
    });

    expect(screen.getByText("Child Records mode")).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// BUG-054 — savedViews=false hardening (RiskRegisterPanel)
// ---------------------------------------------------------------------------

describe("BUG-054 — savedViews=false: RiskRegisterPanel does not render SavedViewsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useFeatureFlagsMock.mockReturnValue({ savedViews: false, childActions: false });
    getRiskFormConfigMock.mockResolvedValue(makeFormConfig("SIMPLE"));
    listRisksMock.mockResolvedValue({ data: [], meta: { total: 0, page: 1, pageSize: 25 } });
    getValidationSummaryMock.mockResolvedValue({ blockCount: 0, warnCount: 0, total: 0 });
  });

  it("does not render the Saved Views button when savedViews flag is false", async () => {
    const { RiskRegisterPanel } = await import("../src/features/risks/RiskRegisterPanel");

    render(
      <Wrapper>
        <RiskRegisterPanel register={makeRegisterRecord() as any} />
      </Wrapper>
    );

    await waitFor(() => {
      // Panel has loaded (ColumnPicker mock renders null, so just wait for loader to clear)
      expect(screen.queryByRole("button", { name: /saved views/i })).toBeNull();
    });

    // Confirm SavedViewsPanel-specific UI is absent
    expect(screen.queryByRole("button", { name: /saved views/i })).toBeNull();
  });
});
