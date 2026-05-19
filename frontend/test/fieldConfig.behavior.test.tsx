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
      fieldType: "TEXT" | "MULTILINE_TEXT" | "BOOLEAN" | "NUMBER" | "DATE" | "DROPDOWN" | "PERSON_PICKER";
      helpText: string | null;
      isRequired: boolean;
      displayOrder: number;
      isActive: boolean;
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

  return {
    registerId,
    initialState,
    state,
    getRegisterConfiguration,
    listCustomFieldOptions,
    updateDraftConfig,
    getConfigVersionStatus
  };
});

vi.mock("../src/api/customFields.api", () => ({
  getRegisterConfiguration: runtime.getRegisterConfiguration,
  listCustomFieldOptions: runtime.listCustomFieldOptions,
  createCustomField: vi.fn(),
  updateCustomField: vi.fn(),
  activateCustomField: vi.fn(),
  deactivateCustomField: vi.fn(),
  createCustomFieldOption: vi.fn(),
  updateCustomFieldOption: vi.fn(),
  deactivateCustomFieldOption: vi.fn()
}));

vi.mock("../src/api/configVersion.api", () => ({
  getConfigVersionStatus: runtime.getConfigVersionStatus,
  updateDraftConfig: runtime.updateDraftConfig
}));

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

    await screen.findByText("Field Configuration");

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
