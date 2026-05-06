import { apiClient } from "./client";

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
