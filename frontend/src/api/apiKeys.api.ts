import { apiClient } from "./client";

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export interface ApiKeyCreated {
  id: string;
  name: string;
  keyPrefix: string;
  rawKey: string;
  createdAt: string;
  expiresAt: string | null;
}

export interface CreateApiKeyInput {
  name: string;
  expiresAt?: string;
}

export async function listApiKeys(): Promise<ApiKey[]> {
  const response = await apiClient.get<{ data: ApiKey[] }>("/admin/api-keys");
  return response.data.data;
}

export async function createApiKey(input: CreateApiKeyInput): Promise<ApiKeyCreated> {
  const response = await apiClient.post<{ data: ApiKeyCreated }>("/admin/api-keys", input);
  return response.data.data;
}

export async function revokeApiKey(id: string): Promise<void> {
  await apiClient.delete(`/admin/api-keys/${id}`);
}
