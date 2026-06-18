import { apiClient } from "./client";

export type ApiKeyStatus = "active" | "expired" | "revoked";

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  status: ApiKeyStatus;
  createdAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
}

export interface AdminApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  status: ApiKeyStatus;
  createdAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  user: { id: string; name: string; email: string };
  createdBy: { id: string; name: string; email: string } | null;
}

export interface ApiKeyCreated {
  id: string;
  name: string;
  keyPrefix: string;
  status: ApiKeyStatus;
  rawKey: string;
  createdAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
}

export interface CreateMyApiKeyInput {
  name: string;
  expiresAt?: string;
}

// --- User-scoped endpoints (authenticated user's own keys) ---

export async function listMyApiKeys(): Promise<ApiKey[]> {
  const response = await apiClient.get<{ data: ApiKey[] }>("/users/me/api-keys");
  return response.data.data;
}

export async function createMyApiKey(input: CreateMyApiKeyInput): Promise<ApiKeyCreated> {
  const response = await apiClient.post<{ data: ApiKeyCreated }>("/users/me/api-keys", input);
  return response.data.data;
}

export async function revokeMyApiKey(id: string): Promise<ApiKey> {
  const response = await apiClient.delete<{ data: ApiKey }>(`/users/me/api-keys/${id}`);
  return response.data.data;
}

// --- Admin-scoped endpoints (all users, read + revoke only) ---

export async function adminListApiKeys(): Promise<AdminApiKey[]> {
  const response = await apiClient.get<{ data: AdminApiKey[] }>("/admin/api-keys");
  return response.data.data;
}

export async function adminRevokeApiKey(id: string): Promise<AdminApiKey> {
  const response = await apiClient.delete<{ data: AdminApiKey }>(`/admin/api-keys/${id}`);
  return response.data.data;
}
