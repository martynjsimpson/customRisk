import { apiClient } from "./client";
import type { CurrentUser } from "../auth/session";
import type { ApiResponse } from "./types";

export async function updateMyProfile(name: string) {
  const response = await apiClient.patch<ApiResponse<CurrentUser>>("/users/me", { name });
  return response.data.data;
}

export async function changeMyPassword(currentPassword: string, newPassword: string) {
  const response = await apiClient.post<ApiResponse<{ success: boolean }>>(
    "/users/me/change-password",
    { currentPassword, newPassword }
  );
  return response.data.data;
}
