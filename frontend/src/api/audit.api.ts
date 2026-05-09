import { apiClient } from "./client";
import type { ApiResponse, ListMeta } from "./types";

export interface AuditQuery {
  page?: number;
  pageSize?: number;
  dateFrom?: string;
  dateTo?: string;
  actorUserId?: string;
  action?: string;
  objectType?: string;
  registerId?: string;
  riskId?: string;
  displayRiskId?: string;
  ipAddress?: string;
}

export interface AuditEvent {
  id: string;
  occurredAt: string;
  actor: { id: string; name: string | null; email: string | null } | null;
  action: string;
  objectType: string;
  objectId: string;
  objectDisplayName: string | null;
  scopeType: string;
  registerId: string | null;
  registerDisplayName: string | null;
  riskId: string | null;
  displayRiskId: string | null;
  summary: string;
  metadataJson: unknown;
  fieldChanges: Array<{
    id: string;
    fieldName: string;
    fieldLabel: string | null;
    previousValue: unknown;
    newValue: unknown;
    valueType: string | null;
  }>;
  hasSnapshot: boolean;
}

export interface AuditSnapshot {
  id: string;
  auditEventId: string;
  riskInternalId: string;
  registerId: string;
  displayRiskId: string;
  snapshotJson: unknown;
  deletionReason: string | null;
  createdAt: string;
}

function cleanQuery(query: AuditQuery) {
  return Object.fromEntries(
    Object.entries(query).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

export async function listSystemAudit(query: AuditQuery = {}) {
  const response = await apiClient.get<ApiResponse<AuditEvent[], ListMeta>>("/audit/system", {
    params: cleanQuery(query)
  });
  return response.data;
}

export async function listRegisterAudit(registerId: string, query: AuditQuery = {}) {
  const response = await apiClient.get<ApiResponse<AuditEvent[], ListMeta>>(
    `/registers/${registerId}/audit`,
    { params: cleanQuery(query) }
  );
  return response.data;
}

export async function listRiskAudit(registerId: string, riskId: string, query: AuditQuery = {}) {
  const response = await apiClient.get<ApiResponse<AuditEvent[], ListMeta>>(
    `/registers/${registerId}/risks/${riskId}/audit`,
    { params: cleanQuery(query) }
  );
  return response.data;
}

export async function getAuditEvent(auditEventId: string) {
  const response = await apiClient.get<{ data: AuditEvent }>(`/audit/events/${auditEventId}`);
  return response.data.data;
}

export async function getAuditSnapshot(auditEventId: string) {
  const response = await apiClient.get<{ data: AuditSnapshot }>(
    `/audit/events/${auditEventId}/snapshot`
  );
  return response.data.data;
}
