import { apiClient } from "./client";
import type { ApiResponse, ListMeta } from "./types";
import type { CustomFieldType } from "./customFields.api";
import type { PersonDisplay } from "./persons.api";
export type { PersonDisplay } from "./persons.api";

export type RiskState = "DRAFT" | "OPEN" | "CLOSED";
export const RISK_STATES: RiskState[] = ["DRAFT", "OPEN", "CLOSED"];

export type ReviewStatus = "NOT_REQUIRED" | "NOT_REVIEWED" | "NOT_DUE" | "DUE_SOON" | "OVERDUE";
export type ValidationStatus = "BLOCK" | "WARN" | "OK";

export interface RiskListQuery {
  page?: number;
  pageSize?: number;
  state?: RiskState;
  riskLevelId?: string;
  ownerUserId?: string;
  reviewStatus?: ReviewStatus;
  overdue?: boolean;
  dueForReview?: boolean;
  includeClosed?: boolean;
  validationIssues?: boolean;
  search?: string;
  sortBy?: "riskId" | "title" | "state" | "owner" | "riskScore" | "riskLevel" | "nextReviewDate" | "systemUpdatedAt";
  sortDir?: "asc" | "desc";
}

export interface ValidationSummary {
  blockCount: number;
  warnCount: number;
  total: number;
}

export interface RiskPerson {
  id: string;
  name: string;
  email: string;
  isActive?: boolean;
}

export interface RiskOption {
  id: string;
  name: string;
  color?: string | null;
  numericValue?: string;
  displayOrder?: number;
}

export interface RiskListCustomFieldValue {
  customFieldDefinitionId: string;
  fieldName: string;
  fieldType: CustomFieldType;
  displayOrder: number;
  isActive: boolean;
  textValue: string | null;
  numberValue: number | null;
  booleanValue: boolean | null;
  dateValue: string | null;
  personUser: { id: string; name: string; email: string } | null;
  person: { displayName: string } | null;
  dropdownOption: { id: string; label: string } | null;
  selectedOptions?: Array<{ id: string; label: string }>;
}

export interface RiskListItem {
  id: string;
  displayRiskId: string;
  title: string;
  state: RiskState;
  owner: RiskPerson | null;
  likelihood: RiskOption;
  impact: RiskOption;
  riskScore: number;
  riskLevel: RiskOption;
  responseStrategy: RiskOption;
  nextReviewDate: string | null;
  reviewStatus: ReviewStatus;
  isOverdue: boolean;
  validationStatus: ValidationStatus;
  systemUpdatedAt: string;
  customFieldValues: RiskListCustomFieldValue[];
}

export type ValidationMode = "ALLOW" | "WARN" | "BLOCK";

export interface FieldWarning {
  fieldId: string;
  fieldName: string;
  message: string;
}

export interface CustomFieldDefinition {
  id: string;
  fieldName: string;
  fieldType: CustomFieldType;
  helpText: string | null;
  isRequired: boolean;
  validationMode: ValidationMode;
  displayOrder: number;
  isActive: boolean;
  options?: Array<{ id: string; label: string; displayOrder?: number; isActive?: boolean }>;
}

export interface RiskCustomFieldValueInput {
  customFieldDefinitionId: string;
  textValue?: string;
  numberValue?: number;
  booleanValue?: boolean;
  dateValue?: string;
  personUserId?: string;
  personEmail?: string;
  dropdownOptionId?: string;
  multiSelectOptionIds?: string[];
}

export interface RiskFormConfig {
  states: RiskState[];
  register: {
    id: string;
    defaultNewRiskState: RiskState;
    reviewsEnabled: boolean;
    customFieldValidationEnabled: boolean;
    // Position of the Review status row in the risk detail modal (0-based index).
    // null means "place Review status last".
    reviewStatusPosition: number | null;
  };
  users: RiskPerson[];
  customFields: CustomFieldDefinition[];
  likelihoodValues: RiskOption[];
  impactValues: RiskOption[];
  riskLevels: RiskOption[];
  responseStrategies: RiskOption[];
}

export interface RiskDetail extends RiskListItem {
  registerId: string;
  riskSequence: number;
  description: string;
  ownerPerson: PersonDisplay | null;
  createdDate: string;
  responseStrategy: RiskOption;
  responseAction: string | null;
  customFields: Array<{
    id: string;
    customFieldDefinition: CustomFieldDefinition;
    textValue: string | null;
    numberValue: number | null;
    booleanValue: boolean | null;
    dateValue: string | null;
    person: PersonDisplay | null;
    personUser: RiskPerson | null;
    dropdownOption: { id: string; label: string } | null;
    selectedOptions?: Array<{ id: string; label: string }>;
  }>;
  lastReviewedAt: string | null;
  lastReviewedBy: RiskPerson | null;
  systemCreatedAt: string;
  systemCreatedBy: RiskPerson;
  systemUpdatedBy: RiskPerson;
}

export interface RiskReview {
  id: string;
  reviewedBy: RiskPerson;
  reviewedAt: string;
  comment: string | null;
  attestationText: string;
  calculatedNextReviewDate: string;
}

export interface SaveRiskInput {
  title: string;
  description: string;
  state?: RiskState;
  ownerUserId?: string;
  ownerEmail?: string;
  createdDate?: string;
  likelihoodValueId: string;
  impactValueId: string;
  responseStrategyId: string;
  responseAction?: string | null;
  acknowledgedWarnings?: boolean;
  customFields?: RiskCustomFieldValueInput[];
}

function cleanQuery(query: RiskListQuery) {
  return Object.fromEntries(
    Object.entries(query).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

export async function listRisks(registerId: string, query: RiskListQuery) {
  const response = await apiClient.get<ApiResponse<RiskListItem[], ListMeta>>(
    `/registers/${registerId}/risks`,
    { params: cleanQuery(query) }
  );
  return response.data;
}

export async function getRisk(registerId: string, riskId: string) {
  const response = await apiClient.get<{ data: RiskDetail }>(`/registers/${registerId}/risks/${riskId}`);
  return response.data.data;
}

export async function createRisk(registerId: string, input: SaveRiskInput) {
  const response = await apiClient.post<{ data: RiskDetail }>(`/registers/${registerId}/risks`, input);
  return response.data.data;
}

export async function updateRisk(registerId: string, riskId: string, input: Partial<SaveRiskInput>) {
  const response = await apiClient.patch<{ data: RiskDetail }>(
    `/registers/${registerId}/risks/${riskId}`,
    input
  );
  return response.data.data;
}

export async function deleteRisk(registerId: string, riskId: string, input: { deletionReason?: string }) {
  const response = await apiClient.delete<{ data: { id: string; deleted: boolean } }>(
    `/registers/${registerId}/risks/${riskId}`,
    { data: { confirmation: "DELETE", ...input } }
  );
  return response.data.data;
}

export async function getRiskFormConfig(registerId: string) {
  const response = await apiClient.get<{ data: RiskFormConfig }>(
    `/registers/${registerId}/risk-form-config`
  );
  return response.data.data;
}

export async function getValidationSummary(registerId: string) {
  const response = await apiClient.get<{ data: ValidationSummary }>(
    `/registers/${registerId}/risks/validation-summary`
  );
  return response.data.data;
}

export async function exportRisks(registerId: string, query: RiskListQuery) {
  const response = await apiClient.get(`/registers/${registerId}/risks/export`, {
    params: cleanQuery(query),
    responseType: "blob"
  });
  const disposition = response.headers["content-disposition"] as string | undefined;
  const filename = disposition?.match(/filename="([^"]+)"/)?.[1] ?? "risk-register.csv";
  return { blob: response.data as Blob, filename };
}

export async function listRiskReviews(registerId: string, riskId: string) {
  const response = await apiClient.get<{ data: RiskReview[] }>(
    `/registers/${registerId}/risks/${riskId}/reviews`
  );
  return response.data.data;
}

export async function completeRiskReview(
  registerId: string,
  riskId: string,
  input: { confirmed: true; comment?: string }
) {
  const response = await apiClient.post<{ data: RiskReview }>(
    `/registers/${registerId}/risks/${riskId}/reviews`,
    input
  );
  return response.data.data;
}
