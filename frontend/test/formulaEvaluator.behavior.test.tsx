/**
 * Behavioral tests for:
 *   - formulaEvaluator.ts — pure evaluator logic (UI-022, UI-023)
 *   - CustomFieldModal — debounced formula validation disables Save (UI-022)
 */

import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { evaluateFormula, FormulaEvaluationError } from "../src/utils/formulaEvaluator";

// ---------------------------------------------------------------------------
// formulaEvaluator — pure logic unit tests
// ---------------------------------------------------------------------------

describe("evaluateFormula — arithmetic", () => {
  const emptyCtx = { fieldValues: {} };

  it("evaluates a simple numeric literal", () => {
    expect(evaluateFormula("42", emptyCtx)).toBe(42);
  });

  it("evaluates addition", () => {
    expect(evaluateFormula("1 + 2", emptyCtx)).toBe(3);
  });

  it("evaluates subtraction", () => {
    expect(evaluateFormula("10 - 3", emptyCtx)).toBe(7);
  });

  it("evaluates multiplication", () => {
    expect(evaluateFormula("4 * 5", emptyCtx)).toBe(20);
  });

  it("evaluates division", () => {
    expect(evaluateFormula("10 / 4", emptyCtx)).toBe(2.5);
  });

  it("respects operator precedence (* before +)", () => {
    expect(evaluateFormula("2 + 3 * 4", emptyCtx)).toBe(14);
  });

  it("respects parentheses", () => {
    expect(evaluateFormula("(2 + 3) * 4", emptyCtx)).toBe(20);
  });

  it("handles unary negation", () => {
    expect(evaluateFormula("-5 + 10", emptyCtx)).toBe(5);
  });

  it("throws FormulaEvaluationError on division by zero", () => {
    expect(() => evaluateFormula("1 / 0", emptyCtx)).toThrow(FormulaEvaluationError);
    expect(() => evaluateFormula("1 / 0", emptyCtx)).toThrow("Division by zero");
  });

  it("throws FormulaEvaluationError on unexpected character", () => {
    expect(() => evaluateFormula("1 $ 2", emptyCtx)).toThrow(FormulaEvaluationError);
  });

  it("throws FormulaEvaluationError on trailing token", () => {
    expect(() => evaluateFormula("1 + 2 3", emptyCtx)).toThrow(FormulaEvaluationError);
  });
});

describe("evaluateFormula — built-in references", () => {
  const ctx = { fieldValues: {}, score: 12, likelihood: 3, impact: 4 };

  it("resolves {score}", () => {
    expect(evaluateFormula("{score}", ctx)).toBe(12);
  });

  it("resolves {likelihood}", () => {
    expect(evaluateFormula("{likelihood}", ctx)).toBe(3);
  });

  it("resolves {impact}", () => {
    expect(evaluateFormula("{impact}", ctx)).toBe(4);
  });

  it("combines built-ins arithmetically", () => {
    expect(evaluateFormula("{likelihood} * {impact}", ctx)).toBe(12);
  });

  it("treats null/undefined built-ins as 0", () => {
    expect(evaluateFormula("{score}", { fieldValues: {}, score: null })).toBe(0);
  });
});

describe("evaluateFormula — field references", () => {
  const fieldId = "00000000-0000-0000-0000-000000000001";
  const ctx = { fieldValues: { [fieldId]: 7 } };

  it("resolves a field UUID reference", () => {
    expect(evaluateFormula(`{field:${fieldId}}`, ctx)).toBe(7);
  });

  it("treats null field value as 0", () => {
    expect(evaluateFormula(`{field:${fieldId}}`, { fieldValues: { [fieldId]: null } })).toBe(0);
  });

  it("throws FormulaEvaluationError for an unknown field ID", () => {
    const unknownId = "ffffffff-ffff-ffff-ffff-ffffffffffff";
    expect(() => evaluateFormula(`{field:${unknownId}}`, ctx)).toThrow(FormulaEvaluationError);
  });
});

describe("evaluateFormula — functions", () => {
  const emptyCtx = { fieldValues: {} };

  it("round() rounds to nearest integer", () => {
    expect(evaluateFormula("round(2.7)", emptyCtx)).toBe(3);
    expect(evaluateFormula("round(2.3)", emptyCtx)).toBe(2);
  });

  it("ceil() rounds up", () => {
    expect(evaluateFormula("ceil(1.1)", emptyCtx)).toBe(2);
  });

  it("floor() rounds down", () => {
    expect(evaluateFormula("floor(1.9)", emptyCtx)).toBe(1);
  });

  it("abs() returns absolute value", () => {
    expect(evaluateFormula("abs(-5)", emptyCtx)).toBe(5);
  });

  it("min() returns the smaller of two values", () => {
    expect(evaluateFormula("min(3, 7)", emptyCtx)).toBe(3);
  });

  it("max() returns the larger of two values", () => {
    expect(evaluateFormula("max(3, 7)", emptyCtx)).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// UI-022: CustomFieldModal — debounced formula validation blocks Save
// ---------------------------------------------------------------------------

// Mantine's Textarea `autosize` prop uses a hidden clone element and calls addEventListener
// on it. In jsdom the ResizeObserver polyfill doesn't prevent direct DOM manipulation from
// erroring. We patch the specific method that fails so the component mounts cleanly.
vi.mock("@mantine/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@mantine/core")>();
  return {
    ...actual,
    Textarea: (props: React.ComponentProps<typeof actual.Textarea>) =>
      // Render a plain textarea without autosize so jsdom doesn't error
      actual.Textarea({ ...props, autosize: false })
  };
});

import { CustomFieldModal } from "../src/features/configuration/CustomFieldModal";

// A minimal CALCULATED field for use as editingField — pre-seeds the form so we
// don't need to interact with the Mantine Select to reach the formula textarea.
const CALC_FIELD = {
  id: "field-1",
  registerId: "reg-1",
  fieldName: "Derived Score",
  fieldType: "CALCULATED" as const,
  helpText: null,
  isRequired: false,
  validationMode: "ALLOW" as const,
  displayOrder: 1,
  isActive: true,
  formula: "",
  formulaDependencies: [],
  options: [],
  visibleToRoles: [] as [],
  visibleToRiskResponseOwners: true
};

function renderModal(props: Partial<React.ComponentProps<typeof CustomFieldModal>> = {}) {
  return render(
    <MantineProvider>
      <CustomFieldModal
        opened={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        editingField={CALC_FIELD}
        createError={null}
        updateError={null}
        isSaving={false}
        {...props}
      />
    </MantineProvider>
  );
}

// Helper: wait for real debounce (700ms > 600ms configured debounce)
function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

describe("UI-022: CustomFieldModal formula validation", () => {
  it("Save button is enabled initially when formula is empty", async () => {
    renderModal();
    const saveBtn = screen.getByRole("button", { name: /^save$/i });
    expect((saveBtn as HTMLButtonElement).disabled).toBe(false);
  });

  it("Save button is disabled after an invalid formula is entered (post-debounce)", async () => {
    const user = userEvent.setup();
    renderModal();

    const formulaTextarea = screen.getByRole("textbox", { name: /formula/i });
    await user.clear(formulaTextarea);
    await user.type(formulaTextarea, "1 $ 2");

    // Wait for the 600ms debounce to fire
    await wait(700);

    await waitFor(() => {
      const saveBtn = screen.getByRole("button", { name: /^save$/i });
      expect((saveBtn as HTMLButtonElement).disabled).toBe(true);
    });
  }, 10000);

  it("shows error text after an invalid formula is entered", async () => {
    const user = userEvent.setup();
    renderModal();

    const formulaTextarea = screen.getByRole("textbox", { name: /formula/i });
    await user.clear(formulaTextarea);
    await user.type(formulaTextarea, "1 $ 2");

    await wait(700);

    await waitFor(() => {
      expect(screen.getByText(/unexpected character/i)).toBeTruthy();
    });
  }, 10000);

  it("Save button re-enables after formula is corrected", async () => {
    const user = userEvent.setup();
    renderModal();

    const formulaTextarea = screen.getByRole("textbox", { name: /formula/i });

    // Enter invalid formula
    await user.clear(formulaTextarea);
    await user.type(formulaTextarea, "1 $ 2");
    await wait(700);

    await waitFor(() => expect((screen.getByRole("button", { name: /^save$/i }) as HTMLButtonElement).disabled).toBe(true));

    // Clear and enter a valid formula (use paste to avoid userEvent brace-escape issues)
    await user.clear(formulaTextarea);
    await user.click(formulaTextarea);
    // Paste is reliable across userEvent versions for content with braces
    await user.paste("10 * 2");
    await wait(700);

    await waitFor(() => {
      expect((screen.getByRole("button", { name: /^save$/i }) as HTMLButtonElement).disabled).toBe(false);
    });
  }, 15000);
});
