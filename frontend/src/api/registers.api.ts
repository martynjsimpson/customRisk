import { apiClient } from "./client";
import type { UserRecord } from "./users.api";
import type { ApiResponse, ListMeta } from "./types";

export type { ListMeta };

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
  effectiveRole: "SYSTEM_ADMIN" | "REGISTER_ADMIN" | "REGISTER_VIEWER" | "RISK_OWNER" | "NONE";
  openRisksCount: number;
  overdueRisksCount: number;
  updatedAt: string;
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
