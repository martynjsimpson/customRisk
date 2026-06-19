import { apiClient } from "./client";

export interface SavedView {
  id: string;
  userId: string;
  registerId: string;
  name: string;
  filters: object | null;
  sort: object | null;
  columns: string[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSavedViewInput {
  name: string;
  filters?: object;
  sort?: object;
  columns?: string[];
}

export interface UpdateSavedViewInput {
  name?: string;
  filters?: object;
  sort?: object;
  columns?: string[];
}

export async function listSavedViews(registerId: string): Promise<SavedView[]> {
  const response = await apiClient.get<{ data: SavedView[] }>(`/registers/${registerId}/saved-views`);
  return Array.isArray(response.data.data) ? response.data.data : [];
}

export async function createSavedView(
  registerId: string,
  input: CreateSavedViewInput
): Promise<SavedView> {
  const response = await apiClient.post<SavedView>(
    `/registers/${registerId}/saved-views`,
    input
  );
  return response.data;
}

export async function updateSavedView(
  registerId: string,
  id: string,
  input: UpdateSavedViewInput
): Promise<SavedView> {
  const response = await apiClient.patch<SavedView>(
    `/registers/${registerId}/saved-views/${id}`,
    input
  );
  return response.data;
}

export async function deleteSavedView(registerId: string, id: string): Promise<void> {
  await apiClient.delete(`/registers/${registerId}/saved-views/${id}`);
}
