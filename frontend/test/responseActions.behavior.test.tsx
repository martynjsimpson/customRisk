/**
 * Response Actions (PM7-CORE) — behavioural tests
 *
 * Covers:
 * 1. ResponseActionsPanel renders the panel when in CHILD_RECORDS mode
 * 2. ResponseActionsPanel shows "Add Action" for Admin/Risk Owner; hides it for RAO
 * 3. ResponseActionsPanel filters to own actions when filterToUserId is set
 * 4. ResponseActionModal submits POST on create
 * 5. ResponseActionModal submits PATCH on edit
 * 6. ResponseActionModal shows Owner field as read-only when canChangeOwner is false
 * 7. RiskDetailModal suppresses responseAction text field in CHILD_RECORDS mode
 * 8. RiskDetailModal shows ResponseActionsPanel in CHILD_RECORDS mode
 * 9. RiskDetailModal hides edit/review/delete buttons for RESPONSE_ACTION_OWNER
 */

import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const listResponseActionsMock = vi.fn();
const createResponseActionMock = vi.fn();
const updateResponseActionMock = vi.fn();
const deleteResponseActionMock = vi.fn();
const getRiskMock = vi.fn();
const listRiskReviewsMock = vi.fn();
const listRiskAuditMock = vi.fn();

vi.mock("../src/api/responseActions.api", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    listResponseActions: (...args: unknown[]) => listResponseActionsMock(...args),
    createResponseAction: (...args: unknown[]) => createResponseActionMock(...args),
    updateResponseAction: (...args: unknown[]) => updateResponseActionMock(...args),
    deleteResponseAction: (...args: unknown[]) => deleteResponseActionMock(...args),
  };
});

vi.mock("../src/api/risks.api", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getRisk: (...args: unknown[]) => getRiskMock(...args),
    listRiskReviews: (...args: unknown[]) => listRiskReviewsMock(...args),
  };
});

vi.mock("../src/api/audit.api", () => ({
  listRiskAudit: (...args: unknown[]) => listRiskAuditMock(...args),
}));

vi.mock("../src/components/ApiErrorAlert", () => ({
  ApiErrorAlert: () => null,
}));

vi.mock("../src/features/audit/AuditEventTable", () => ({
  AuditEventTable: () => null,
}));

vi.mock("../src/components/PersonPicker", () => ({
  PersonPicker: ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
  }) => (
    <input
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

// ---------------------------------------------------------------------------
// Test data helpers
// ---------------------------------------------------------------------------

function makeAction(overrides: Partial<{
  id: string;
  response: string;
  status: string;
  ownerUserId: string | null;
  ownerEmail: string | null;
  ownerDisplayName: string | null;
}> = {}) {
  return {
    id: overrides.id ?? "action-1",
    response: overrides.response ?? "Do something",
    status: overrides.status ?? "PLANNED",
    owner: {
      personId: null,
      userId: overrides.ownerUserId ?? null,
      email: overrides.ownerEmail ?? null,
      displayName: overrides.ownerDisplayName ?? null,
    },
    isDeleted: false,
    createdAt: new Date().toISOString(),
    createdBy: { id: "user-1", name: "Alice", email: "alice@example.com" },
    updatedAt: new Date().toISOString(),
    updatedBy: { id: "user-1", name: "Alice", email: "alice@example.com" },
  };
}

function makeRisk(responseActionMode: "SIMPLE" | "CHILD_RECORDS" = "SIMPLE") {
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
    responseActionMode,
  };
}

function makeFormConfig(responseActionMode: "SIMPLE" | "CHILD_RECORDS" = "SIMPLE") {
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

// ---------------------------------------------------------------------------
// Wrapper
// ---------------------------------------------------------------------------

function Wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider>{children}</MantineProvider>
    </QueryClientProvider>
  );
}

// ---------------------------------------------------------------------------
// ResponseActionsPanel tests
// ---------------------------------------------------------------------------

describe("ResponseActionsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders action rows from the API", async () => {
    listResponseActionsMock.mockResolvedValue([makeAction({ response: "Fix the firewall" })]);

    const { ResponseActionsPanel } = await import(
      "../src/features/risks/ResponseActionsPanel"
    );

    render(
      <Wrapper>
        <ResponseActionsPanel
          registerId="reg-1"
          riskId="risk-1"
          canCreate={true}
          canChangeOwner={true}
          canDelete={true}
          filterToUserId={null}
        />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("Fix the firewall")).toBeTruthy();
    });
  });

  it("shows Add Action button when canCreate is true", async () => {
    listResponseActionsMock.mockResolvedValue([]);

    const { ResponseActionsPanel } = await import(
      "../src/features/risks/ResponseActionsPanel"
    );

    render(
      <Wrapper>
        <ResponseActionsPanel
          registerId="reg-1"
          riskId="risk-1"
          canCreate={true}
          canChangeOwner={true}
          canDelete={true}
          filterToUserId={null}
        />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /add action/i })).toBeTruthy();
    });
  });

  it("hides Add Action button when canCreate is false", async () => {
    listResponseActionsMock.mockResolvedValue([]);

    const { ResponseActionsPanel } = await import(
      "../src/features/risks/ResponseActionsPanel"
    );

    render(
      <Wrapper>
        <ResponseActionsPanel
          registerId="reg-1"
          riskId="risk-1"
          canCreate={false}
          canChangeOwner={false}
          canDelete={false}
          filterToUserId="user-99"
        />
      </Wrapper>
    );

    // Wait for query to resolve
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /add action/i })).toBeNull();
    });
  });

  it("shows inline Delete button when canDelete is true and calls deleteResponseAction after confirm", async () => {
    listResponseActionsMock.mockResolvedValue([
      makeAction({ id: "action-del", response: "Delete me" }),
    ]);
    deleteResponseActionMock.mockResolvedValue(undefined);
    // Auto-confirm the window.confirm dialog
    vi.spyOn(window, "confirm").mockReturnValue(true);

    const { ResponseActionsPanel } = await import(
      "../src/features/risks/ResponseActionsPanel"
    );

    const user = userEvent.setup();

    render(
      <Wrapper>
        <ResponseActionsPanel
          registerId="reg-1"
          riskId="risk-1"
          canCreate={true}
          canChangeOwner={true}
          canDelete={true}
          filterToUserId={null}
        />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("Delete me")).toBeTruthy();
    });

    const deleteButton = screen.getByRole("button", { name: /^delete$/i });
    await user.click(deleteButton);

    await waitFor(() => {
      expect(deleteResponseActionMock).toHaveBeenCalledWith("reg-1", "risk-1", "action-del");
    });
  });

  it("hides inline Delete button when canDelete is false", async () => {
    listResponseActionsMock.mockResolvedValue([
      makeAction({ id: "action-1", response: "Some action" }),
    ]);

    const { ResponseActionsPanel } = await import(
      "../src/features/risks/ResponseActionsPanel"
    );

    render(
      <Wrapper>
        <ResponseActionsPanel
          registerId="reg-1"
          riskId="risk-1"
          canCreate={false}
          canChangeOwner={true}
          canDelete={false}
          filterToUserId={null}
        />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("Some action")).toBeTruthy();
    });

    // Edit button is present (canChangeOwner=true), Delete button is not
    expect(screen.getByRole("button", { name: /^edit$/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^delete$/i })).toBeNull();
  });

  it("does not call deleteResponseAction when window.confirm is cancelled", async () => {
    listResponseActionsMock.mockResolvedValue([
      makeAction({ id: "action-cancel", response: "Cancel delete" }),
    ]);
    vi.spyOn(window, "confirm").mockReturnValue(false);

    const { ResponseActionsPanel } = await import(
      "../src/features/risks/ResponseActionsPanel"
    );

    const user = userEvent.setup();

    render(
      <Wrapper>
        <ResponseActionsPanel
          registerId="reg-1"
          riskId="risk-1"
          canCreate={false}
          canChangeOwner={true}
          canDelete={true}
          filterToUserId={null}
        />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("Cancel delete")).toBeTruthy();
    });

    const deleteButton = screen.getByRole("button", { name: /^delete$/i });
    await user.click(deleteButton);

    expect(deleteResponseActionMock).not.toHaveBeenCalled();
  });

  it("filters actions to only own when filterToUserId is set", async () => {
    listResponseActionsMock.mockResolvedValue([
      makeAction({ id: "a-1", response: "My action", ownerUserId: "user-99" }),
      makeAction({ id: "a-2", response: "Someone else's action", ownerUserId: "user-other" }),
    ]);

    const { ResponseActionsPanel } = await import(
      "../src/features/risks/ResponseActionsPanel"
    );

    render(
      <Wrapper>
        <ResponseActionsPanel
          registerId="reg-1"
          riskId="risk-1"
          canCreate={false}
          canChangeOwner={false}
          canDelete={false}
          filterToUserId="user-99"
        />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("My action")).toBeTruthy();
      expect(screen.queryByText("Someone else's action")).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// ResponseActionModal tests
// ---------------------------------------------------------------------------

describe("ResponseActionModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls createResponseAction on save in create mode", async () => {
    createResponseActionMock.mockResolvedValue(makeAction({ response: "New action" }));

    const { ResponseActionModal } = await import(
      "../src/features/risks/ResponseActionModal"
    );

    const user = userEvent.setup();

    render(
      <Wrapper>
        <ResponseActionModal
          registerId="reg-1"
          riskId="risk-1"
          opened={true}
          action={null}
          canChangeOwner={true}
          canDelete={false}
          onClose={vi.fn()}
        />
      </Wrapper>
    );

    const textarea = screen.getByRole("textbox", { name: /response/i });
    await user.click(textarea);
    await user.type(textarea, "New action text");

    const saveButton = screen.getByRole("button", { name: /^add$/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(createResponseActionMock).toHaveBeenCalledWith(
        "reg-1",
        "risk-1",
        expect.objectContaining({ response: "New action text" })
      );
    });
  });

  it("calls updateResponseAction on save in edit mode", async () => {
    const existingAction = makeAction({ id: "action-edit", response: "Existing text" });
    updateResponseActionMock.mockResolvedValue({ ...existingAction, response: "Updated text" });

    const { ResponseActionModal } = await import(
      "../src/features/risks/ResponseActionModal"
    );

    const user = userEvent.setup();

    render(
      <Wrapper>
        <ResponseActionModal
          registerId="reg-1"
          riskId="risk-1"
          opened={true}
          action={existingAction as any}
          canChangeOwner={true}
          canDelete={true}
          onClose={vi.fn()}
        />
      </Wrapper>
    );

    // Textarea should be pre-filled
    const textarea = screen.getByRole("textbox", { name: /response/i });
    await user.clear(textarea);
    await user.type(textarea, "Updated text");

    const saveButton = screen.getByRole("button", { name: /^save$/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(updateResponseActionMock).toHaveBeenCalledWith(
        "reg-1",
        "risk-1",
        "action-edit",
        expect.objectContaining({ response: "Updated text" })
      );
    });
  });

  it("shows Owner field as read-only (disabled TextInput) when canChangeOwner is false", async () => {
    const existingAction = makeAction({
      ownerDisplayName: "Bob",
      ownerEmail: "bob@example.com",
    });

    const { ResponseActionModal } = await import(
      "../src/features/risks/ResponseActionModal"
    );

    render(
      <Wrapper>
        <ResponseActionModal
          registerId="reg-1"
          riskId="risk-1"
          opened={true}
          action={existingAction as any}
          canChangeOwner={false}
          canDelete={false}
          onClose={vi.fn()}
        />
      </Wrapper>
    );

    // PersonPicker should NOT be rendered — instead a disabled TextInput.
    // The PersonPicker mock renders an <input aria-label="Owner">.
    // The disabled TextInput also renders an input with label "Owner".
    // We check that the input is disabled.
    const ownerInput = screen.getByDisplayValue("Bob");
    expect((ownerInput as HTMLInputElement).disabled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// RiskDetailModal integration — child records mode
// ---------------------------------------------------------------------------

describe("RiskDetailModal — CHILD_RECORDS mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listRiskReviewsMock.mockResolvedValue([]);
    listRiskAuditMock.mockResolvedValue({ data: [], meta: { total: 0 } });
    listResponseActionsMock.mockResolvedValue([]);
  });

  it("hides legacy responseAction row when mode is CHILD_RECORDS", async () => {
    getRiskMock.mockResolvedValue(makeRisk("CHILD_RECORDS"));

    const { RiskDetailModal } = await import(
      "../src/features/risks/RiskDetailModal"
    );

    render(
      <Wrapper>
        <RiskDetailModal
          registerId="reg-1"
          riskId="risk-1"
          formConfig={makeFormConfig("CHILD_RECORDS") as any}
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
      // "Risk Response Action" is the column header for the responseAction field
      expect(screen.queryByText("Risk Response Action")).toBeNull();
    });
  });

  it("shows ResponseActionsPanel heading when mode is CHILD_RECORDS", async () => {
    getRiskMock.mockResolvedValue(makeRisk("CHILD_RECORDS"));

    const { RiskDetailModal } = await import(
      "../src/features/risks/RiskDetailModal"
    );

    render(
      <Wrapper>
        <RiskDetailModal
          registerId="reg-1"
          riskId="risk-1"
          formConfig={makeFormConfig("CHILD_RECORDS") as any}
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
      expect(screen.getByText("Risk Responses")).toBeTruthy();
    });
  });

  it("hides edit/review/delete buttons for RESPONSE_ACTION_OWNER", async () => {
    getRiskMock.mockResolvedValue(makeRisk("CHILD_RECORDS"));
    listResponseActionsMock.mockResolvedValue([
      makeAction({ ownerUserId: "user-rao" }),
    ]);

    const { RiskDetailModal } = await import(
      "../src/features/risks/RiskDetailModal"
    );

    render(
      <Wrapper>
        <RiskDetailModal
          registerId="reg-1"
          riskId="risk-1"
          formConfig={makeFormConfig("CHILD_RECORDS") as any}
          opened={true}
          canReview={false}
          canEditRows={false}
          canDelete={false}
          effectiveRole="RESPONSE_ACTION_OWNER"
          currentUserId="user-rao"
          onClose={vi.fn()}
          onRequestEdit={vi.fn()}
          onRequestReview={vi.fn()}
          onRequestDelete={vi.fn()}
        />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /^edit$/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /^review$/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /^delete$/i })).toBeNull();
    });
  });

  it("shows legacy responseAction row when mode is SIMPLE", async () => {
    getRiskMock.mockResolvedValue(makeRisk("SIMPLE"));

    const { RiskDetailModal } = await import(
      "../src/features/risks/RiskDetailModal"
    );

    render(
      <Wrapper>
        <RiskDetailModal
          registerId="reg-1"
          riskId="risk-1"
          formConfig={makeFormConfig("SIMPLE") as any}
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
      expect(screen.getByText("Risk Response Action")).toBeTruthy();
    });
  });
});
