import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Stubs
// ---------------------------------------------------------------------------

vi.mock("../src/api/risks.api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/api/risks.api")>();
  return {
    ...actual,
    getRisk: vi.fn(),
    createRisk: vi.fn().mockResolvedValue({ id: "risk-1" }),
    updateRisk: vi.fn().mockResolvedValue({ id: "risk-1" }),
    RISK_STATES: ["DRAFT", "OPEN", "CLOSED"]
  };
});

vi.mock("../src/components/ApiErrorAlert", () => ({
  ApiErrorAlert: () => null,
  getApiErrorCode: () => null,
  getApiErrorWarnings: () => []
}));

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const USERS = [
  { id: "user-1", name: "Alice Smith", email: "alice@example.com", isActive: true },
  { id: "user-2", name: "Bob Jones", email: "bob@example.com", isActive: true }
];

const BASE_FORM_CONFIG = {
  states: ["DRAFT", "OPEN", "CLOSED"] as const,
  register: {
    id: "reg-1",
    defaultNewRiskState: "DRAFT" as const,
    reviewsEnabled: false,
    customFieldValidationEnabled: false
  },
  users: USERS,
  customFields: [],
  likelihoodValues: [{ id: "lh-1", name: "Low" }],
  impactValues: [{ id: "imp-1", name: "Low" }],
  riskLevels: [],
  responseStrategies: [{ id: "rs-1", name: "Accept" }]
};

const REGISTER = { id: "reg-1", name: "Test Register" };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function Wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider>{children}</MantineProvider>
    </QueryClientProvider>
  );
}

async function renderForm() {
  const { RiskFormModal } = await import("../src/features/risks/RiskFormModal");
  const onClose = vi.fn();
  const onSuccess = vi.fn();

  render(
    <Wrapper>
      <RiskFormModal
        register={REGISTER as any}
        formConfig={BASE_FORM_CONFIG as any}
        canManage={true}
        opened={true}
        editingRiskId={null}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    </Wrapper>
  );

  return { onClose, onSuccess };
}

function getOwnerInput() {
  return screen.getByPlaceholderText("Search by name or enter email");
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Risk Owner field — email-only mode (PM2-02)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the Owner combobox input", async () => {
    await renderForm();
    expect(getOwnerInput()).toBeTruthy();
  });

  it("filters user options when the user types a name", async () => {
    await renderForm();
    await userEvent.type(getOwnerInput(), "Alice");

    await waitFor(() => {
      expect(screen.getByText(/Alice Smith/)).toBeTruthy();
    });
    expect(screen.queryByText(/Bob Jones/)).toBeFalsy();
  });

  it("shows 'Email only' badge when a valid email not matching any user is typed", async () => {
    await renderForm();
    await userEvent.type(getOwnerInput(), "newperson@external.com");

    await waitFor(() => {
      expect(screen.getByText("Email only")).toBeTruthy();
    });
  });

  it("does NOT show 'Email only' badge when a known user email is typed", async () => {
    await renderForm();
    await userEvent.type(getOwnerInput(), "alice@example.com");

    await waitFor(() => {
      expect(screen.getByText(/Alice Smith/)).toBeTruthy();
    });
    expect(screen.queryByText("Email only")).toBeFalsy();
  });

  it("sends ownerUserId (not ownerEmail) when a known user is selected", async () => {
    const { createRisk } = await import("../src/api/risks.api");
    await renderForm();

    // Select a known user
    await userEvent.type(getOwnerInput(), "Alice");
    await waitFor(() => screen.getByText(/Alice Smith/));
    await userEvent.click(screen.getByText(/Alice Smith/));

    // Fill other required fields
    await userEvent.type(screen.getByRole("textbox", { name: /Title/ }), "Test risk");
    await userEvent.type(screen.getByRole("textbox", { name: /Description/ }), "A description");

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(createRisk).toHaveBeenCalledWith(
        "reg-1",
        expect.objectContaining({ ownerUserId: "user-1" })
      );
    });
    const [, payload] = (createRisk as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(payload.ownerEmail).toBeUndefined();
  });

  it("sends ownerEmail (not ownerUserId) when an email-only option is selected", async () => {
    const { createRisk } = await import("../src/api/risks.api");
    await renderForm();

    // Type a free-text email
    await userEvent.type(getOwnerInput(), "newperson@external.com");
    await waitFor(() => screen.getByText("Email only"));
    await userEvent.click(screen.getByText("Email only"));

    await userEvent.type(screen.getByRole("textbox", { name: /Title/ }), "Test risk");
    await userEvent.type(screen.getByRole("textbox", { name: /Description/ }), "A description");

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(createRisk).toHaveBeenCalledWith(
        "reg-1",
        expect.objectContaining({ ownerEmail: "newperson@external.com" })
      );
    });
    const [, payload] = (createRisk as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(payload.ownerUserId).toBeUndefined();
  });

  it("shows a validation error when the owner field is left empty on submit", async () => {
    const user = userEvent.setup();
    await renderForm();

    // Fill the required fields so that HTML5 native validation does not block
    // the form submit event before Mantine's onSubmit handler can run.
    await user.type(screen.getByRole("textbox", { name: /Title/ }), "Test risk");
    await user.type(screen.getByRole("textbox", { name: /Description/ }), "A description");

    await user.click(screen.getByRole("button", { name: "Save" }));

    const errorEl = await screen.findByText(/owner is required/i, {}, { timeout: 3000 });
    expect(errorEl).toBeTruthy();
  });
});
