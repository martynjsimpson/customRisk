import { apiClient } from "./client";
import type { RegisterRecord } from "./registers.api";

export type CustomFieldType =
  | "TEXT"
  | "MULTILINE_TEXT"
  | "BOOLEAN"
  | "NUMBER"
  | "DATE"
  | "DROPDOWN"
  | "PERSON_PICKER";

export interface CustomFieldOption {
  id: string;
  customFieldDefinitionId: string;
  label: string;
  displayOrder: number;
  isActive: boolean;
}

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
}

export interface LikelihoodValue {
  id: string;
  registerId: string;
  name: string;
  numericValue: string;
  displayOrder: number;
  isActive: boolean;
}

export interface ImpactValue {
  id: string;
  registerId: string;
  name: string;
  numericValue: string;
  displayOrder: number;
  isActive: boolean;
}

export interface RiskLevel {
  id: string;
  registerId: string;
  name: string;
  description: string | null;
  color: string | null;
  displayOrder: number;
  isActive: boolean;
}

export interface MatrixCell {
  id: string;
  registerId: string;
  likelihoodValueId: string;
  impactValueId: string;
  riskLevelId: string;
  likelihoodValue: { id: string; name: string; numericValue: string; displayOrder: number; isActive: boolean };
  impactValue: { id: string; name: string; numericValue: string; displayOrder: number; isActive: boolean };
  riskLevel: { id: string; name: string; color: string | null; displayOrder: number; isActive: boolean };
}

export interface MatrixData {
  likelihoodValues: LikelihoodValue[];
  impactValues: ImpactValue[];
  riskLevels: RiskLevel[];
  cells: MatrixCell[];
}

export interface RegisterConfigurationBundle {
  register: RegisterRecord;
  customFields: CustomFieldDefinition[];
  likelihoodValues: LikelihoodValue[];
  impactValues: ImpactValue[];
  riskLevels: RiskLevel[];
  matrixCells: MatrixCell[];
  responseStrategies: unknown[];
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
}

export type UpdateCustomFieldInput = Partial<Omit<SaveCustomFieldInput, "fieldType" | "options">>;

export interface SaveCustomFieldOptionInput {
  label: string;
  displayOrder: number;
  isActive: boolean;
}

export type UpdateCustomFieldOptionInput = Partial<SaveCustomFieldOptionInput>;

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

// --- Likelihood ---

export interface CreateLikelihoodValueInput {
  name: string;
  numericValue: number;
  displayOrder: number;
  isActive: boolean;
}

export type UpdateLikelihoodValueInput = Partial<CreateLikelihoodValueInput>;

export async function createLikelihoodValue(registerId: string, input: CreateLikelihoodValueInput) {
  const response = await apiClient.post<{ data: LikelihoodValue }>(
    `/registers/${registerId}/likelihood-values`,
    input
  );
  return response.data.data;
}

export async function updateLikelihoodValue(
  registerId: string,
  likelihoodId: string,
  input: UpdateLikelihoodValueInput
) {
  const response = await apiClient.patch<{ data: LikelihoodValue }>(
    `/registers/${registerId}/likelihood-values/${likelihoodId}`,
    input
  );
  return response.data.data;
}

export async function deactivateLikelihoodValue(registerId: string, likelihoodId: string) {
  const response = await apiClient.post<{ data: LikelihoodValue }>(
    `/registers/${registerId}/likelihood-values/${likelihoodId}/deactivate`
  );
  return response.data.data;
}

// --- Impact ---

export interface CreateImpactValueInput {
  name: string;
  numericValue: number;
  displayOrder: number;
  isActive: boolean;
}

export type UpdateImpactValueInput = Partial<CreateImpactValueInput>;

export async function createImpactValue(registerId: string, input: CreateImpactValueInput) {
  const response = await apiClient.post<{ data: ImpactValue }>(
    `/registers/${registerId}/impact-values`,
    input
  );
  return response.data.data;
}

export async function updateImpactValue(
  registerId: string,
  impactId: string,
  input: UpdateImpactValueInput
) {
  const response = await apiClient.patch<{ data: ImpactValue }>(
    `/registers/${registerId}/impact-values/${impactId}`,
    input
  );
  return response.data.data;
}

export async function deactivateImpactValue(registerId: string, impactId: string) {
  const response = await apiClient.post<{ data: ImpactValue }>(
    `/registers/${registerId}/impact-values/${impactId}/deactivate`
  );
  return response.data.data;
}

// --- Risk Level ---

export interface CreateRiskLevelInput {
  name: string;
  description?: string | null;
  color?: string | null;
  displayOrder: number;
  isActive: boolean;
}

export type UpdateRiskLevelInput = Partial<CreateRiskLevelInput>;

export async function createRiskLevel(registerId: string, input: CreateRiskLevelInput) {
  const response = await apiClient.post<{ data: RiskLevel }>(
    `/registers/${registerId}/risk-levels`,
    input
  );
  return response.data.data;
}

export async function updateRiskLevel(
  registerId: string,
  riskLevelId: string,
  input: UpdateRiskLevelInput
) {
  const response = await apiClient.patch<{ data: RiskLevel }>(
    `/registers/${registerId}/risk-levels/${riskLevelId}`,
    input
  );
  return response.data.data;
}

export async function deactivateRiskLevel(registerId: string, riskLevelId: string) {
  const response = await apiClient.post<{ data: RiskLevel }>(
    `/registers/${registerId}/risk-levels/${riskLevelId}/deactivate`
  );
  return response.data.data;
}

// --- Matrix ---

export interface UpdateMatrixInput {
  cells: Array<{ likelihoodValueId: string; impactValueId: string; riskLevelId: string }>;
  recalculateExistingRisks: boolean;
}

export async function getMatrix(registerId: string) {
  const response = await apiClient.get<{ data: MatrixData }>(
    `/registers/${registerId}/matrix`
  );
  return response.data.data;
}

export async function updateMatrix(registerId: string, input: UpdateMatrixInput) {
  const response = await apiClient.put<{ data: { cells: unknown[]; risksRecalculated: number } }>(
    `/registers/${registerId}/matrix`,
    input
  );
  return response.data.data;
}
