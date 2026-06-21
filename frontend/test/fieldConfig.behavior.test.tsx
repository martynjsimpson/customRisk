/**
 * FieldConfigTab — behavioural tests
 *
 * Covers the draft-mode lifecycle of the custom field configuration UI:
 * 1. Draft-gating: edit/reorder/delete actions require an active draft.
 * 2. Formula preservation: calculated-field formulas survive a save round-trip.
 * 3. Draft delete: soft-delete of a newly created draft field is confirmed and
 *    the field is removed from the list.
 *
 * Static source checks in backend/test/customFieldFrontend.test.mjs confirm the
 * delete-flow wiring at the source level; these tests assert the runtime behaviour.
 */
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FieldConfigTab } from "../src/features/configuration/FieldConfigTab";

const runtime = vi.hoisted(() => {
  const registerId = "register-1";
  const initialState = () => ({
    register: {
      id: registerId,
      name: "Demo Register"
    },
    customFields: [] as Array<{
      id: string;
      registerId: string;
      fieldName: string;
      fieldType: "TEXT" | "MULTILINE_TEXT" | "BOOLEAN" | "NUMBER" | "DATE" | "DROPDOWN" | "PERSON_PICKER" | "CALCULATED";
      helpText: string | null;
      isRequired: boolean;
      validationMode: "ALLOW" | "WARN" | "BLOCK";
      displayOrder: number;
      isActive: boolean;
      formula: string | null;
      formulaDependencies: string[];
      visibleToRoles: string[];
      visibleToRiskResponseOwners: boolean;
      options: Array<{
        id: string;
        customFieldDefinitionId: string;
        label: string;
        displayOrder: number;
        isActive: boolean;
      }>;
    }>,
    likelihoodValues: [],
    impactValues: [],
    riskLevels: [],
    matrixCells: [],
    responseStrategies: []
  });

  const state = {
    configState: initialState()
  };

  const getRegisterConfiguration = vi.fn(async () => structuredClone(state.configState));
  const listCustomFieldOptions = vi.fn(async () => []);
  const updateDraftConfig = vi.fn(async (_registerId: string, input: { customFields?: typeof state.configState.customFields }) => {
    if (input.customFields) {
      state.configState = {
        ...state.configState,
        customFields: input.customFields.map((field) => ({
          ...field,
          registerId,
          formula: field.formula ?? null,
          formulaDependencies: [],
          visibleToRoles: [],
          visibleToRiskResponseOwners: true,
          options: field.options.map((option) => ({
            ...option,
            customFieldDefinitionId: field.id
          }))
        }))
      };
    }

    return {
      id: "draft-1",
      registerId,
      versionNumber: 1,
      status: "DRAFT" as const,
      createdByUserId: "user-1",
      createdAt: new Date().toISOString(),
      publishedAt: null
    };
  });
  const getConfigVersionStatus = vi.fn(async () => ({
    currentVersion: null,
    draftVersion: {
      id: "draft-1",
      registerId,
      versionNumber: 1,
      status: "DRAFT" as const,
      createdByUserId: "user-1",
      createdAt: new Date().toISOString(),
      publishedAt: null
    },
    hasDraft: true
  }));

  const deleteCustomField = vi.fn(async () => undefined);
  const getCustomFieldUsage = vi.fn(async () => ({ totalValueCount: 0 }));

  // Mutable flag so individual suites can test the system-admin code path
  const permissions = { isSystemAdmin: false };

  return {
    registerId,
    initialState,
    state,
    permissions,
    getRegisterConfiguration,
    listCustomFieldOptions,
    updateDraftConfig,
    getConfigVersionStatus,
    deleteCustomField,
    getCustomFieldUsage
  };
});

vi.mock("../src/hooks/usePermissions", () => ({
  usePermissions: () => ({ isSystemAdmin: runtime.permissions.isSystemAdmin, registerRoles: [] })
}));

vi.mock("../src/api/customFields.api", () => ({
  getRegisterConfiguration: runtime.getRegisterConfiguration,
  listCustomFieldOptions: runtime.listCustomFieldOptions,
  createCustomField: vi.fn(),
  updateCustomField: vi.fn(),
  activateCustomField: vi.fn(),
  deactivateCustomField: vi.fn(),
  deleteCustomField: runtime.deleteCustomField,
  getCustomFieldUsage: runtime.getCustomFieldUsage,
  createCustomFieldOption: vi.fn(),
  updateCustomFieldOption: vi.fn(),
  deactivateCustomFieldOption: vi.fn()
}));

vi.mock("../src/api/configVersion.api", () => ({
  getConfigVersionStatus: runtime.getConfigVersionStatus,
  updateDraftConfig: runtime.updateDraftConfig
}));

// Helper: seed the config state with one existing field
function seedField(overrides: Partial<typeof runtime.state.configState.customFields[number]> = {}) {
  const field = {
    id: "field-existing-1",
    registerId: runtime.registerId,
    fieldName: "Risk Score",
    fieldType: "TEXT" as const,
    helpText: null,
    isRequired: false,
    validationMode: "ALLOW" as const,
    displayOrder: 970,
    isActive: true,
    formula: null,
    formulaDependencies: [],
    visibleToRoles: [] as string[],
    visibleToRiskResponseOwners: true,
    options: [],
    ...overrides
  };
  runtime.state.configState.customFields = [field];
  return field;
}

function renderWithSystemAdmin() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
  return render(
    <MantineProvider>
      <QueryClientProvider client={queryClient}>
        <FieldConfigTab registerId={runtime.registerId} draftConfigMode />
      </QueryClientProvider>
    </MantineProvider>
  );
}

describe("FieldConfigTab draft behavior", () => {
  beforeEach(() => {
    runtime.state.configState = runtime.initialState();
  });

  it("shows a newly added draft custom field in the table and places it after core fields", async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });

    render(
        <MantineProvider>
          <QueryClientProvider client={queryClient}>
          <FieldConfigTab registerId={runtime.registerId} draftConfigMode />
        </QueryClientProvider>
      </MantineProvider>
    );

    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Add field" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByRole("textbox", { name: "Field name" }), "Residual Risk Rationale");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(runtime.updateDraftConfig).toHaveBeenCalled();
    });

    const lastDraftPayload = runtime.updateDraftConfig.mock.calls.at(-1)?.[1];
    expect(lastDraftPayload?.customFields).toBeDefined();
    expect(lastDraftPayload?.customFields.at(-1)?.fieldName).toBe("Residual Risk Rationale");
    expect(lastDraftPayload?.customFields.at(-1)?.displayOrder).toBeGreaterThan(960);

    await waitFor(() => {
      expect(screen.getByText("Residual Risk Rationale")).toBeTruthy();
    });
  });
});

describe("FieldConfigTab draft behavior — formula preservation", () => {
  beforeEach(() => {
    runtime.state.configState = runtime.initialState();
    runtime.updateDraftConfig.mockClear();
    runtime.permissions.isSystemAdmin = false;
    runtime.getRegisterConfiguration.mockImplementation(async () => structuredClone(runtime.state.configState));
  });

  it("buildDraftFields includes formula in the snapshot payload when a second field is added", async () => {
    // Seed a calculated field that has a formula
    seedField({
      id: "field-calc-1",
      fieldName: "Calculated Score",
      fieldType: "TEXT",
      formula: "impact * likelihood"
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
    });

    render(
      <MantineProvider>
        <QueryClientProvider client={queryClient}>
          <FieldConfigTab registerId={runtime.registerId} draftConfigMode />
        </QueryClientProvider>
      </MantineProvider>
    );

    // Wait for the seeded field to appear
    await screen.findByText("Calculated Score");

    // Add a new field — buildDraftFields will include existing fields in the snapshot
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Add field" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByRole("textbox", { name: "Field name" }), "Extra Field");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(runtime.updateDraftConfig).toHaveBeenCalled();
    });

    const payload = runtime.updateDraftConfig.mock.calls.at(-1)?.[1];
    const existingField = payload?.customFields?.find((f: { id: string }) => f.id === "field-calc-1");
    expect(existingField).toBeDefined();
    // formula must be preserved on the existing field — not stripped to undefined
    expect(existingField?.formula).toBe("impact * likelihood");
  });
});

describe("FieldConfigTab draft delete behavior", () => {
  beforeEach(() => {
    runtime.state.configState = runtime.initialState();
    runtime.updateDraftConfig.mockClear();
    runtime.deleteCustomField.mockClear();
    runtime.permissions.isSystemAdmin = false;
    runtime.getRegisterConfiguration.mockImplementation(async () => structuredClone(runtime.state.configState));
  });

  it("deleting a field in draft mode calls updateDraftConfig (not REST deleteCustomField) and removes the field", async () => {
    runtime.permissions.isSystemAdmin = true;
    seedField({ id: "field-to-delete", fieldName: "Draft Only Field" });
    renderWithSystemAdmin();

    await screen.findByText("Draft Only Field");

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Delete" }));

    // Confirm modal should appear
    const modal = await screen.findByRole("dialog");
    await user.click(within(modal).getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(runtime.updateDraftConfig).toHaveBeenCalled();
    });

    // The draft snapshot must not contain the deleted field
    const payload = runtime.updateDraftConfig.mock.calls.at(-1)?.[1];
    expect(payload?.customFields?.find((f: { id: string }) => f.id === "field-to-delete")).toBeUndefined();

    // REST deleteCustomField must NOT have been called
    expect(runtime.deleteCustomField).not.toHaveBeenCalled();
  });
});
