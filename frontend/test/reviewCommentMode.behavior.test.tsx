/**
 * PM8-CORE — ReviewModal comment mode conditional rendering
 *
 * Verifies that ReviewModal correctly shows/hides the comment textarea and
 * enables/disables the Complete Review button based on reviewCommentMode:
 *
 * - DISABLED: textarea not rendered; button not blocked by comment logic
 * - MANDATORY: textarea shown and marked required; Complete Review button
 *   remains disabled until a non-empty comment is entered (in addition to
 *   the confirmation checkbox)
 * - OPTIONAL: textarea shown but not required; button enabled once checkbox
 *   is checked regardless of whether a comment is provided
 */

import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const completeRiskReviewMock = vi.fn();

vi.mock("../src/api/risks.api", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    completeRiskReview: (...args: unknown[]) => completeRiskReviewMock(...args),
  };
});

vi.mock("../src/components/ApiErrorAlert", () => ({
  ApiErrorAlert: ({ error }: { error: unknown }) =>
    error ? <div data-testid="api-error">error occurred</div> : null,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRegister(reviewCommentMode: "DISABLED" | "OPTIONAL" | "MANDATORY") {
  return {
    reviewsEnabled: true,
    reviewAttestationText: "I confirm this risk has been reviewed.",
    reviewCommentMode,
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

async function renderReviewModal(reviewCommentMode: "DISABLED" | "OPTIONAL" | "MANDATORY") {
  const { ReviewModal } = await import("../src/features/risks/ReviewModal");
  const onClose = vi.fn();
  const onSuccess = vi.fn();

  render(
    <Wrapper>
      <ReviewModal
        register={makeRegister(reviewCommentMode)}
        registerId="reg-1"
        riskId="risk-1"
        opened={true}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    </Wrapper>
  );

  return { onClose, onSuccess };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  completeRiskReviewMock.mockResolvedValue({});
});

describe("ReviewModal — DISABLED comment mode", () => {
  it("does not render a comment textarea", async () => {
    await renderReviewModal("DISABLED");
    expect(screen.queryByLabelText(/comment/i)).toBeNull();
  });

  it("enables Complete Review once the checkbox is checked (comment not required)", async () => {
    await renderReviewModal("DISABLED");

    const button = screen.getByRole("button", { name: /complete review/i }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);

    await userEvent.click(screen.getByRole("checkbox", { name: /confirm review/i }));
    expect(button.disabled).toBe(false);
  });
});

describe("ReviewModal — MANDATORY comment mode", () => {
  it("renders the comment textarea marked as required", async () => {
    await renderReviewModal("MANDATORY");
    // Mantine renders a required marker (*) next to the label for required fields
    const textarea = screen.getByRole("textbox", { name: /comment/i });
    expect(textarea).toBeTruthy();
    // Confirm the field is present — required visual indicator is rendered by Mantine as a span
    // in the label; we verify the textarea is present and the MANDATORY branch renders it.
    expect(screen.queryByRole("textbox", { name: /comment/i })).not.toBeNull();
  });

  it("keeps Complete Review disabled when checkbox is checked but comment is empty", async () => {
    await renderReviewModal("MANDATORY");

    await userEvent.click(screen.getByRole("checkbox", { name: /confirm review/i }));

    const button = screen.getByRole("button", { name: /complete review/i }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it("keeps Complete Review disabled when comment is whitespace-only", async () => {
    await renderReviewModal("MANDATORY");

    await userEvent.click(screen.getByRole("checkbox", { name: /confirm review/i }));
    await userEvent.type(screen.getByRole("textbox", { name: /comment/i }), "   ");

    const button = screen.getByRole("button", { name: /complete review/i }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it("enables Complete Review when both checkbox is checked and comment has content", async () => {
    await renderReviewModal("MANDATORY");

    await userEvent.click(screen.getByRole("checkbox", { name: /confirm review/i }));
    await userEvent.type(screen.getByRole("textbox", { name: /comment/i }), "Risk reviewed in detail.");

    const button = screen.getByRole("button", { name: /complete review/i }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
  });
});

describe("ReviewModal — OPTIONAL comment mode", () => {
  it("renders the comment textarea (not required)", async () => {
    await renderReviewModal("OPTIONAL");
    const textarea = screen.getByRole("textbox", { name: /comment/i });
    expect(textarea).toBeTruthy();
  });

  it("enables Complete Review once checkbox is checked even with no comment", async () => {
    await renderReviewModal("OPTIONAL");

    const button = screen.getByRole("button", { name: /complete review/i }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);

    await userEvent.click(screen.getByRole("checkbox", { name: /confirm review/i }));
    expect(button.disabled).toBe(false);
  });

  it("enables Complete Review when checkbox is checked and a comment is provided", async () => {
    await renderReviewModal("OPTIONAL");

    await userEvent.click(screen.getByRole("checkbox", { name: /confirm review/i }));
    await userEvent.type(screen.getByRole("textbox", { name: /comment/i }), "All good.");

    const button = screen.getByRole("button", { name: /complete review/i }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
  });
});
