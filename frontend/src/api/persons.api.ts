import { apiClient } from "./client";

export interface PersonDisplay {
  id: string;
  email: string;
  displayName: string;
  isResolved: boolean;
  isActive: boolean;
}

export async function searchPersons(query: string, limit = 10): Promise<PersonDisplay[]> {
  if (!query.trim()) return [];
  const response = await apiClient.get<{ data: PersonDisplay[] }>("/persons/search", {
    params: { q: query, limit }
  });
  return response.data.data;
}
