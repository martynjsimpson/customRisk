import { apiClient } from "./client";
import type { ApiResponse } from "./types";

export interface TemplateRecord {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateVersionRecord {
  id: string;
  templateId: string;
  versionNumber: number;
  status: "DRAFT" | "PUBLISHED";
  createdAt: string;
  publishedAt: string | null;
}

export interface TemplateVersionWithSnapshot extends TemplateVersionRecord {
  snapshotJson: unknown;
}

export interface TemplateWithVersions extends TemplateRecord {
  versions: TemplateVersionRecord[];
  latestPublishedVersion: TemplateVersionRecord | null;
}

export interface TemplateDetail extends TemplateRecord {
  versions: TemplateVersionWithSnapshot[];
}

export async function listTemplates(includeInactive?: boolean): Promise<TemplateWithVersions[]> {
  const response = await apiClient.get<ApiResponse<TemplateWithVersions[]>>("/templates", {
    params: includeInactive ? { includeInactive: "true" } : undefined
  });
  return response.data.data;
}

export async function getTemplate(templateId: string): Promise<TemplateDetail> {
  const response = await apiClient.get<ApiResponse<TemplateDetail>>(
    `/templates/${templateId}`
  );
  return response.data.data;
}

export async function createTemplate(data: {
  name: string;
  description?: string;
  snapshotJson: unknown;
}): Promise<TemplateWithVersions> {
  const response = await apiClient.post<ApiResponse<TemplateWithVersions>>("/templates", data);
  return response.data.data;
}

export async function createTemplateFromRegister(
  registerId: string,
  data: { name: string; description?: string }
): Promise<TemplateWithVersions> {
  const response = await apiClient.post<ApiResponse<TemplateWithVersions>>(
    `/registers/${registerId}/templates/from-register`,
    data
  );
  return response.data.data;
}

export async function deactivateTemplate(templateId: string): Promise<void> {
  await apiClient.post(`/templates/${templateId}/deactivate`);
}

export async function publishTemplateVersion(
  templateId: string,
  data: { snapshotJson: unknown }
): Promise<TemplateVersionRecord> {
  const response = await apiClient.post<ApiResponse<TemplateVersionRecord>>(
    `/templates/${templateId}/versions`,
    data
  );
  return response.data.data;
}

export async function createRegisterFromTemplate(data: {
  templateVersionId: string;
  name: string;
}): Promise<{ id: string; name: string }> {
  const response = await apiClient.post<ApiResponse<{ id: string; name: string }>>(
    "/registers/from-template",
    data
  );
  return response.data.data;
}

export interface TemplateDifferences {
  registerSettings: string[];
  customFieldsAdded: string[];
  customFieldsRemoved: string[];
  customFieldsChanged: string[];
  likelihoodValuesAdded: string[];
  likelihoodValuesRemoved: string[];
  impactValuesAdded: string[];
  impactValuesRemoved: string[];
  riskLevelsAdded: string[];
  riskLevelsRemoved: string[];
  responseStrategiesAdded: string[];
  responseStrategiesRemoved: string[];
}

export interface CompareRegisterToTemplateResult {
  templateVersion: { id: string; versionNumber: number; publishedAt: string | null };
  differences: TemplateDifferences;
  hasDifferences: boolean;
}

export async function compareRegisterToTemplate(
  registerId: string,
  templateVersionId: string
): Promise<CompareRegisterToTemplateResult> {
  const response = await apiClient.get<ApiResponse<CompareRegisterToTemplateResult>>(
    `/registers/${registerId}/templates/compare/${templateVersionId}`
  );
  return response.data.data;
}

export async function applyTemplateUpdateToDraft(
  registerId: string,
  templateVersionId: string
): Promise<{ id: string }> {
  const response = await apiClient.post<ApiResponse<{ id: string }>>(
    `/registers/${registerId}/templates/apply/${templateVersionId}`
  );
  return response.data.data;
}
