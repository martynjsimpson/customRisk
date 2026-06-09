import { apiClient } from "./client";
import type { RegisterRecord } from "./registers.api";
import type { ImpactValue, LikelihoodValue, MatrixCell, RiskLevel } from "./scoring.api";

export type CustomFieldType =
  | "TEXT"
  | "MULTILINE_TEXT"
  | "BOOLEAN"
  | "NUMBER"
  | "DATE"
  | "DROPDOWN"
  | "PERSON_PICKER"
  | "MULTI_SELECT"
  | "CALCULATED";

export interface CustomFieldOption {
  id: string;
  customFieldDefinitionId: string;
  label: string;
  displayOrder: number;
  isActive: boolean;
}

export type RegisterRole = "REGISTER_ADMIN" | "REGISTER_VIEWER" | "RISK_OWNER";

export interface CustomFieldDefinition {
  id: string;
  registerId: string;
  fieldName: string;
  fieldType: CustomFieldType;
  helpText: string | null;
  isRequired: boolean;
  displayOrder: number;
  isActive: boolean;
  options: CustomFieldOption[];
  formula: string | null;
  formulaDependencies: string[];
  visibleToRoles: RegisterRole[];
}

export interface SaveCustomFieldInput {
  fieldName: string;
  fieldType: CustomFieldType;
  helpText?: string | null;
  isRequired: boolean;
  displayOrder: number;
  isActive: boolean;
  options?: Array<{
    label: string;
    displayOrder: number;
    isActive?: boolean;
  }>;
  formula?: string;
  visibleToRoles?: RegisterRole[];
}

export type UpdateCustomFieldInput = Partial<Omit<SaveCustomFieldInput, "fieldType" | "options">>;

export interface SaveCustomFieldOptionInput {
  label: string;
  displayOrder: number;
  isActive: boolean;
}

export type UpdateCustomFieldOptionInput = Partial<SaveCustomFieldOptionInput>;

export interface RegisterConfigurationBundle {
  register: RegisterRecord;
  customFields: CustomFieldDefinition[];
  likelihoodValues: LikelihoodValue[];
  impactValues: ImpactValue[];
  riskLevels: RiskLevel[];
  matrixCells: MatrixCell[];
  responseStrategies: unknown[];
}

export async function getRegisterConfiguration(registerId: string) {
  const response = await apiClient.get<{ data: RegisterConfigurationBundle }>(
    `/registers/${registerId}/config`
  );
  return response.data.data;
}

export async function listCustomFields(registerId: string) {
  const response = await apiClient.get<{ data: CustomFieldDefinition[] }>(
    `/registers/${registerId}/custom-fields`
  );
  return response.data.data;
}

export async function createCustomField(registerId: string, input: SaveCustomFieldInput) {
  const response = await apiClient.post<{ data: CustomFieldDefinition }>(
    `/registers/${registerId}/custom-fields`,
    input
  );
  return response.data.data;
}

export async function updateCustomField(
  registerId: string,
  fieldId: string,
  input: UpdateCustomFieldInput
) {
  const response = await apiClient.patch<{ data: CustomFieldDefinition }>(
    `/registers/${registerId}/custom-fields/${fieldId}`,
    input
  );
  return response.data.data;
}

export async function activateCustomField(registerId: string, fieldId: string) {
  const response = await apiClient.post<{ data: CustomFieldDefinition }>(
    `/registers/${registerId}/custom-fields/${fieldId}/activate`
  );
  return response.data.data;
}

export async function deactivateCustomField(registerId: string, fieldId: string) {
  const response = await apiClient.post<{ data: CustomFieldDefinition }>(
    `/registers/${registerId}/custom-fields/${fieldId}/deactivate`
  );
  return response.data.data;
}

export async function listCustomFieldOptions(registerId: string, fieldId: string) {
  const response = await apiClient.get<{ data: CustomFieldOption[] }>(
    `/registers/${registerId}/custom-fields/${fieldId}/options`
  );
  return response.data.data;
}

export async function createCustomFieldOption(
  registerId: string,
  fieldId: string,
  input: SaveCustomFieldOptionInput
) {
  const response = await apiClient.post<{ data: CustomFieldOption }>(
    `/registers/${registerId}/custom-fields/${fieldId}/options`,
    input
  );
  return response.data.data;
}

export async function updateCustomFieldOption(
  registerId: string,
  fieldId: string,
  optionId: string,
  input: UpdateCustomFieldOptionInput
) {
  const response = await apiClient.patch<{ data: CustomFieldOption }>(
    `/registers/${registerId}/custom-fields/${fieldId}/options/${optionId}`,
    input
  );
  return response.data.data;
}

export async function deactivateCustomFieldOption(
  registerId: string,
  fieldId: string,
  optionId: string
) {
  const response = await apiClient.post<{ data: CustomFieldOption }>(
    `/registers/${registerId}/custom-fields/${fieldId}/options/${optionId}/deactivate`
  );
  return response.data.data;
}
