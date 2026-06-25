import { apiClient } from "./client";
import { getAccessToken } from "../auth/session";
import type { CustomFieldDefinition } from "./customFields.api";
import type { ReviewCommentMode } from "./registers.api";
import type { ImpactValue, LikelihoodValue, RiskLevel } from "./scoring.api";
import type { ApiResponse } from "./types";

export interface ConfigVersionRecord {
  id: string;
  registerId: string;
  versionNumber: number;
  status: "DRAFT" | "PUBLISHED";
  createdByUserId: string;
  createdAt: string;
  publishedAt: string | null;
}

export interface ConfigVersionStatus {
  currentVersion: ConfigVersionRecord | null;
  draftVersion: ConfigVersionRecord | null;
  hasDraft: boolean;
}

export interface ImpactEntry {
  type: "BLOCKER" | "WARNING";
  code: string;
  message: string;
  meta?: Record<string, unknown>;
}

export interface ImpactAnalysisResult {
  affectedRisks: {
    deactivatedLikelihood: number;
    deactivatedImpact: number;
    deactivatedResponseStrategy: number;
    deactivatedCustomField: number;
    total: number;
  };
  warnings: string[];
  blockers: string[];
  impactEntries?: ImpactEntry[];
  canPublish: boolean;
}

interface DraftMatrixCell {
  id: string;
  likelihoodValueId: string;
  impactValueId: string;
  riskLevelId: string;
}

export interface UpdateDraftConfigInput {
  register?: {
    scoringFormula?: string;
    responseActionMode?: "SIMPLE" | "CHILD_RECORDS";
    reviewCommentMode?: ReviewCommentMode;
    reviewAttestationText?: string;
  };
  customFields?: Array<
    Pick<
      CustomFieldDefinition,
      "id" | "fieldName" | "fieldType" | "helpText" | "isRequired" | "validationMode" | "displayOrder" | "isActive" | "formula"
    > & {
      options: Array<{
        id: string;
        label: string;
        displayOrder: number;
        isActive: boolean;
      }>;
    }
  >;
  likelihoodValues?: Array<Pick<LikelihoodValue, "id" | "name" | "numericValue" | "displayOrder" | "isActive">>;
  impactValues?: Array<Pick<ImpactValue, "id" | "name" | "numericValue" | "displayOrder" | "isActive">>;
  riskLevels?: Array<Pick<RiskLevel, "id" | "name" | "description" | "color" | "displayOrder" | "isActive">>;
  matrixCells?: DraftMatrixCell[];
}

export interface ValidateFormulaResult {
  valid: boolean;
  error?: string;
}

export async function validateScoringFormula(
  registerId: string,
  formula: string
): Promise<ValidateFormulaResult> {
  const response = await apiClient.post<ApiResponse<ValidateFormulaResult>>(
    `/registers/${registerId}/config-versions/validate-formula`,
    { formula }
  );
  return response.data.data;
}

export async function getConfigVersionStatus(registerId: string): Promise<ConfigVersionStatus> {
  const response = await apiClient.get<ApiResponse<ConfigVersionStatus>>(
    `/registers/${registerId}/config-versions/status`
  );
  return response.data.data;
}

export async function listConfigVersions(registerId: string): Promise<ConfigVersionRecord[]> {
  const response = await apiClient.get<ApiResponse<ConfigVersionRecord[]>>(
    `/registers/${registerId}/config-versions`
  );
  return response.data.data;
}

export async function createDraft(registerId: string): Promise<ConfigVersionRecord> {
  const response = await apiClient.post<ApiResponse<ConfigVersionRecord>>(
    `/registers/${registerId}/config-versions/draft`
  );
  return response.data.data;
}

export async function discardDraft(registerId: string): Promise<void> {
  await apiClient.delete(`/registers/${registerId}/config-versions/draft`);
}

export async function analyseImpact(registerId: string): Promise<ImpactAnalysisResult> {
  const response = await apiClient.post<ApiResponse<ImpactAnalysisResult>>(
    `/registers/${registerId}/config-versions/draft/impact`
  );
  return response.data.data;
}

export async function publishDraft(registerId: string): Promise<ConfigVersionRecord> {
  const response = await apiClient.post<ApiResponse<ConfigVersionRecord>>(
    `/registers/${registerId}/config-versions/draft/publish`
  );
  return response.data.data;
}

export async function updateDraftConfig(
  registerId: string,
  input: UpdateDraftConfigInput
): Promise<ConfigVersionRecord> {
  const response = await apiClient.patch<ApiResponse<ConfigVersionRecord>>(
    `/registers/${registerId}/config-versions/draft`,
    input
  );
  return response.data.data;
}

export async function exportRegisterConfig(registerId: string): Promise<void> {
  const token = getAccessToken();
  const response = await fetch(`/api/v1/registers/${registerId}/config-versions/export`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw new Error("Export failed");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `config-${registerId}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importRegisterConfig(
  registerId: string,
  config: unknown
): Promise<ConfigVersionRecord> {
  const response = await apiClient.post<ApiResponse<ConfigVersionRecord>>(
    `/registers/${registerId}/config-versions/import`,
    { config }
  );
  return response.data.data;
}
