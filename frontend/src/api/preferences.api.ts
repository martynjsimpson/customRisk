import { apiClient } from "./client";
import type { UserPreferences } from "../auth/session";
import type { ApiResponse } from "./types";

export async function getMyPreferences() {
  const response = await apiClient.get<ApiResponse<UserPreferences>>("/users/me/preferences");
  return response.data.data;
}

export async function updateMyPreferences(prefs: Partial<UserPreferences>) {
  const response = await apiClient.patch<ApiResponse<UserPreferences>>(
    "/users/me/preferences",
    prefs
  );
  return response.data.data;
}
