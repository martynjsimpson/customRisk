import { apiClient } from "./client";
import type { ApiResponse } from "./types";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ResponseActionStatus =
  | "PLANNED"
  | "IN_PROGRESS"
  | "IMPLEMENTED"
  | "DEFERRED"
  | "CANCELLED";

export type ResponseActionMode = "SIMPLE" | "CHILD_RECORDS";

export interface ResponseActionOwner {
  personId:    string | null;
  userId:      string | null;
  email:       string | null;
  displayName: string | null;
}

export interface ResponseAction {
  id:        string;
  response:  string;
  status:    ResponseActionStatus;
  owner:     ResponseActionOwner;
  isDeleted: boolean;
  createdAt: string;
  createdBy: { id: string; name: string; email: string };
  updatedAt: string;
  updatedBy: { id: string; name: string; email: string };
}

export interface SaveResponseActionInput {
  response:      string;
  status?:       ResponseActionStatus;
  ownerEmail?:   string;
}

// Human-readable labels for status values, used in select options.
export const RESPONSE_ACTION_STATUS_LABELS: Record<ResponseActionStatus, string> = {
  PLANNED:     "Planned",
  IN_PROGRESS: "In Progress",
  IMPLEMENTED: "Implemented",
  DEFERRED:    "Deferred",
  CANCELLED:   "Cancelled",
};

export const RESPONSE_ACTION_STATUSES: ResponseActionStatus[] = [
  "PLANNED",
  "IN_PROGRESS",
  "IMPLEMENTED",
  "DEFERRED",
  "CANCELLED",
];

// ─── API functions ────────────────────────────────────────────────────────────

export async function listResponseActions(registerId: string, riskId: string) {
  const response = await apiClient.get<ApiResponse<ResponseAction[], { total: number }>>(
    `/registers/${registerId}/risks/${riskId}/actions`
  );
  return response.data.data;
}

export async function createResponseAction(
  registerId: string,
  riskId: string,
  input: SaveResponseActionInput
) {
  const response = await apiClient.post<{ data: ResponseAction }>(
    `/registers/${registerId}/risks/${riskId}/actions`,
    input
  );
  return response.data.data;
}

export async function updateResponseAction(
  registerId: string,
  riskId: string,
  actionId: string,
  input: Partial<SaveResponseActionInput>
) {
  const response = await apiClient.patch<{ data: ResponseAction }>(
    `/registers/${registerId}/risks/${riskId}/actions/${actionId}`,
    input
  );
  return response.data.data;
}

export async function deleteResponseAction(
  registerId: string,
  riskId: string,
  actionId: string
) {
  await apiClient.delete(`/registers/${registerId}/risks/${riskId}/actions/${actionId}`);
}

export async function switchResponseActionMode(registerId: string) {
  const response = await apiClient.patch<{ data: { responseActionMode: ResponseActionMode } }>(
    `/registers/${registerId}`,
    { responseActionMode: "CHILD_RECORDS" }
  );
  return response.data.data;
}
