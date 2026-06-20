import { apiClient } from "./client";
import type { UserRecord } from "./users.api";
import type { ApiResponse, ListMeta } from "./types";
import type { ResponseActionMode } from "./responseActions.api";

export type { ListMeta };
export type { ResponseAction, ResponseActionMode } from "./responseActions.api";

export interface LinkedTemplate {
  templateId: string;
  templateName: string;
  templateIsActive: boolean;
  linkedVersionId: string;
  linkedVersionNumber: number;
  latestPublishedVersionId: string | null;
  latestPublishedVersionNumber: number | null;
  isLatest: boolean;
}

export interface RegisterRecord {
  id: string;
  name: string;
  description: string | null;
  riskIdPrefix: string | null;
  riskIdZeroPaddingEnabled: boolean;
  riskIdZeroPaddingWidth: number;
  reviewsEnabled: boolean;
  defaultReviewFrequencyMonths: number;
  reviewAttestationText: string;
  allowViewerExport: boolean;
  customFieldValidationEnabled: boolean;
  scoringFormula: string;
  // Position of the Review status row in the risk detail modal (0-based index).
  // null means "place Review status last" — the default for all existing registers.
  reviewStatusPosition: number | null;
  responseActionMode: ResponseActionMode;
  effectiveRole: "SYSTEM_ADMIN" | "REGISTER_ADMIN" | "REGISTER_VIEWER" | "RISK_OWNER" | "RESPONSE_ACTION_OWNER" | "NONE";
  openRisksCount: number;
  overdueRisksCount: number;
  updatedAt: string;
  linkedTemplate: LinkedTemplate | null;
}

export interface RegisterPermission {
  id: string;
  registerId: string;
  userId: string;
  role: "REGISTER_ADMIN" | "REGISTER_VIEWER";
  user: {
    id: string;
    name: string;
    email: string;
    isActive: boolean;
    isSystemAdmin: boolean;
  };
}

export interface CreateRegisterInput {
  name: string;
  description?: string;
  riskIdPrefix?: string;
  riskIdZeroPaddingEnabled: boolean;
  riskIdZeroPaddingWidth: number;
  initialRegisterAdminUserIds: string[];
}

export type UpdateRegisterInput = Partial<
  Pick<
    RegisterRecord,
    | "name"
    | "description"
    | "riskIdPrefix"
    | "riskIdZeroPaddingEnabled"
    | "riskIdZeroPaddingWidth"
    | "reviewsEnabled"
    | "defaultReviewFrequencyMonths"
    | "allowViewerExport"
    | "customFieldValidationEnabled"
    | "reviewStatusPosition"
  >
>;

export async function listRegisters() {
  const response = await apiClient.get<ApiResponse<RegisterRecord[], ListMeta>>("/registers");
  return response.data;
}

export async function createRegister(input: CreateRegisterInput) {
  const response = await apiClient.post<{ data: RegisterRecord }>("/registers", input);
  return response.data.data;
}

export async function getRegister(registerId: string) {
  const response = await apiClient.get<{ data: RegisterRecord }>(`/registers/${registerId}`);
  return response.data.data;
}

export async function updateRegister(registerId: string, input: UpdateRegisterInput) {
  const response = await apiClient.patch<{ data: RegisterRecord }>(`/registers/${registerId}`, input);
  return response.data.data;
}

export async function listRegisterPermissions(registerId: string) {
  const response = await apiClient.get<{ data: RegisterPermission[] }>(
    `/registers/${registerId}/permissions`
  );
  return response.data.data;
}

export async function listRegisterPermissionCandidates(registerId: string) {
  const response = await apiClient.get<{ data: UserRecord[] }>(
    `/registers/${registerId}/permission-candidates`
  );
  return response.data.data;
}

export async function addRegisterPermission(
  registerId: string,
  input: { userId: string; role: RegisterPermission["role"] }
) {
  const response = await apiClient.post<{ data: RegisterPermission }>(
    `/registers/${registerId}/permissions`,
    input
  );
  return response.data.data;
}

export async function removeRegisterPermission(registerId: string, permissionId: string) {
  const response = await apiClient.delete<{ data: { success: boolean } }>(
    `/registers/${registerId}/permissions/${permissionId}`
  );
  return response.data.data;
}

export async function deleteRegister(registerId: string): Promise<void> {
  await apiClient.delete(`/registers/${registerId}`);
}

export async function unlinkRegisterFromTemplate(registerId: string): Promise<void> {
  await apiClient.delete(`/registers/${registerId}/template-link`);
}
