import { apiClient } from "./client";
import type { CurrentUser } from "../auth/session";
import type { ApiResponse, ListMeta } from "./types";

export interface UserRecord extends CurrentUser {
  createdAt: string;
  updatedAt: string;
  failedLoginAttempts: number;
  lockedUntil: string | null;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  isSystemAdmin: boolean;
  isActive: boolean;
}

export type UpdateUserInput = Partial<CreateUserInput>;

export async function listUsers() {
  const response = await apiClient.get<ApiResponse<UserRecord[], ListMeta>>("/users");
  return response.data;
}

export async function createUser(input: CreateUserInput) {
  const response = await apiClient.post<{ data: UserRecord }>("/users", input);
  return response.data.data;
}

export async function updateUser(userId: string, input: UpdateUserInput) {
  const response = await apiClient.patch<{ data: UserRecord }>(`/users/${userId}`, input);
  return response.data.data;
}

export async function activateUser(userId: string) {
  const response = await apiClient.post<{ data: UserRecord }>(`/users/${userId}/activate`);
  return response.data.data;
}

export async function deactivateUser(userId: string) {
  const response = await apiClient.post<{ data: UserRecord }>(`/users/${userId}/deactivate`);
  return response.data.data;
}
