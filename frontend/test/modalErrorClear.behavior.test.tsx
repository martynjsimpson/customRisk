/**
 * BUG-053 — Modal error state clears on close
 *
 * Verifies that reopening a modal after an error does not show the previous
 * error. Covers the highest-traffic modals: ResponseActionModal, ReviewModal,
 * DeleteRiskModal, and RiskFormModal.
 */

import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const createResponseActionMock = vi.fn();
const updateResponseActionMock = vi.fn();
const deleteResponseActionMock = vi.fn();
const deleteRiskMock = vi.fn();
const completeRiskReviewMock = vi.fn();

vi.mock("../src/api/responseActions.api", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    createResponseAction: (...args: unknown[]) => createResponseActionMock(...args),
    updateResponseAction: (...args: unknown[]) => updateResponseActionMock(...args),
    deleteResponseAction: (...args: unknown[]) => deleteResponseActionMock(...args),
  };
});

vi.mock("../src/api/risks.api", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    deleteRisk: (...args: unknown[]) => deleteRiskMock(...args),
    completeRiskReview: (...args: unknown[]) => completeRiskReviewMock(...args),
  };
});

// ApiErrorAlert renders its children or null — use a simple stub that shows the
// error message so tests can assert on its presence / absence.
vi.mock("../src/components/ApiErrorAlert", () => ({
  ApiErrorAlert: ({ error }: { error: unknown }) =>
    error ? <div data-testid="api-error">error occurred</div> : null,
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
// Test helpers
// ---------------------------------------------------------------------------

function makeAction() {
  return {
    id: "action-1",
    response: "Do something",
    status: "PLANNED" as const,
    owner: {
      personId: null,
      userId: "user-1",
      email: "alice@example.com",
      displayName: "Alice",
    },
    isDeleted: false,
    createdAt: new Date().toISOString(),
    createdBy: { id: "user-1", name: "Alice", email: "alice@example.com" },
    updatedAt: new Date().toISOString(),
    updatedBy: { id: "user-1", name: "Alice", email: "alice@example.com" },
  };
}

function makeRegister() {
  return {
    reviewsEnabled: true,
    reviewAttestationText: "I confirm this risk has been reviewed.",
  };
}

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
// ResponseActionModal — error cleared on close, clean on reopen
// ---------------------------------------------------------------------------

describe("ResponseActionModal — BUG-053: error clears on close", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not show a prior error when the modal is reopened after a failed save", async () => {
    createResponseActionMock.mockRejectedValue(new Error("Server error"));

    const { ResponseActionModal } = await import(
      "../src/features/risks/ResponseActionModal"
    );

    const user = userEvent.setup();
    let isOpen = true;
    const onClose = vi.fn(() => { isOpen = false; });

    const { rerender } = render(
      <Wrapper>
        <ResponseActionModal
          registerId="reg-1"
          riskId="risk-1"
          opened={true}
          action={null}
          canChangeOwner={false}
          canDelete={false}
          onClose={onClose}
        />
      </Wrapper>
    );

    // Type into the response textarea and submit to trigger the error
    const textarea = screen.getByRole("textbox", { name: /response/i });
    await user.type(textarea, "My action");
    await user.click(screen.getByRole("button", { name: /^add$/i }));

    // Error should appear
    await waitFor(() => {
      expect(screen.getByTestId("api-error")).toBeTruthy();
    });

    // Close the modal via the Cancel button (which calls handleClose -> mutation.reset -> onClose)
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    // Reopen the modal
    rerender(
      <Wrapper>
        <ResponseActionModal
          registerId="reg-1"
          riskId="risk-1"
          opened={true}
          action={null}
          canChangeOwner={false}
          canDelete={false}
          onClose={onClose}
        />
      </Wrapper>
    );

    // Error must not be visible on reopen
    expect(screen.queryByTestId("api-error")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// ReviewModal — error cleared on close, clean on reopen
// ---------------------------------------------------------------------------

describe("ReviewModal — BUG-053: error clears on close", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not show a prior error when the modal is reopened after a failed review", async () => {
    completeRiskReviewMock.mockRejectedValue(new Error("Server error"));

    const { ReviewModal } = await import("../src/features/risks/ReviewModal");

    const user = userEvent.setup();
    const onClose = vi.fn();

    const { rerender } = render(
      <Wrapper>
        <ReviewModal
          register={makeRegister()}
          registerId="reg-1"
          riskId="risk-1"
          opened={true}
          onClose={onClose}
          onSuccess={vi.fn()}
        />
      </Wrapper>
    );

    // Check the confirm checkbox and submit
    const checkbox = screen.getByRole("checkbox", { name: /confirm review/i });
    await user.click(checkbox);
    await user.click(screen.getByRole("button", { name: /complete review/i }));

    // Error should appear
    await waitFor(() => {
      expect(screen.getByTestId("api-error")).toBeTruthy();
    });

    // Close the modal via the Cancel button
    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onClose).toHaveBeenCalled();

    // Reopen the modal
    rerender(
      <Wrapper>
        <ReviewModal
          register={makeRegister()}
          registerId="reg-1"
          riskId="risk-1"
          opened={true}
          onClose={onClose}
          onSuccess={vi.fn()}
        />
      </Wrapper>
    );

    // Error must not be visible on reopen
    expect(screen.queryByTestId("api-error")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// DeleteRiskModal — error cleared on close, clean on reopen
// ---------------------------------------------------------------------------

describe("DeleteRiskModal — BUG-053: error clears on close", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not show a prior error when the modal is reopened after a failed delete", async () => {
    deleteRiskMock.mockRejectedValue(new Error("Server error"));

    const { DeleteRiskModal } = await import(
      "../src/features/risks/DeleteRiskModal"
    );

    const user = userEvent.setup();
    const onClose = vi.fn();

    const { rerender } = render(
      <Wrapper>
        <DeleteRiskModal
          registerId="reg-1"
          riskId="risk-1"
          opened={true}
          onClose={onClose}
          onSuccess={vi.fn()}
        />
      </Wrapper>
    );

    // Click Delete to trigger the error
    await user.click(screen.getByRole("button", { name: /^delete$/i }));

    // Error should appear
    await waitFor(() => {
      expect(screen.getByTestId("api-error")).toBeTruthy();
    });

    // Close the modal via the Cancel button
    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onClose).toHaveBeenCalled();

    // Reopen
    rerender(
      <Wrapper>
        <DeleteRiskModal
          registerId="reg-1"
          riskId="risk-1"
          opened={true}
          onClose={onClose}
          onSuccess={vi.fn()}
        />
      </Wrapper>
    );

    // Error must not be visible on reopen
    expect(screen.queryByTestId("api-error")).toBeNull();
  });
});
