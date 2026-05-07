import { apiClient } from "./client";
import type { CurrentPermissions, CurrentUser, EnabledFeatures } from "../auth/session";
import type { ApiResponse } from "./types";

export interface LoginRequest {
  email: string;
  password: string;
}

export async function login(input: LoginRequest) {
  const response = await apiClient.post<ApiResponse<{ accessToken: string; user: CurrentUser }>>(
    "/auth/login",
    input
  );
  return response.data.data;
}

export async function refreshSession() {
  const response = await apiClient.post<ApiResponse<{ accessToken: string }>>("/auth/refresh");
  return response.data.data;
}

export async function logout() {
  const response = await apiClient.post<ApiResponse<{ success: boolean }>>("/auth/logout");
  return response.data.data;
}

export async function getCurrentUser() {
  const response = await apiClient.get<
    ApiResponse<{ user: CurrentUser; permissions: CurrentPermissions; enabledFeatures: EnabledFeatures }>
  >("/auth/me");
  return response.data.data;
}
