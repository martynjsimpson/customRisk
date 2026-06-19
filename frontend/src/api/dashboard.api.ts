import { apiClient } from "./client";
import type { AuditEvent } from "./audit.api";
import type { RiskListItem, RiskOption, RiskPerson, ReviewStatus } from "./risks.api";

export interface DashboardRisk extends Omit<RiskListItem, "likelihood" | "impact" | "responseStrategy"> {
  register: {
    id: string;
    name: string;
  };
  owner: RiskPerson;
  riskLevel: RiskOption;
  reviewStatus: ReviewStatus;
}

export interface AdminRegisterSummary {
  register: {
    id: string;
    name: string;
  };
  openRisks: number;
  overdueReviews: number;
  unassignedRisks: number;
  risksByLevel: Array<{
    id: string;
    name: string;
    color: string | null;
    count: number;
  }>;
}

export interface SystemSummary {
  totalRegisters: number;
  totalUsers: number;
  openRisks: number;
  overdueReviews: number;
}

export interface MyWorkDashboard {
  myOpenRisks: DashboardRisk[];
  myDueSoonRisks: DashboardRisk[];
  myOverdueRisks: DashboardRisk[];
  adminRegisterSummaries: AdminRegisterSummary[];
  systemSummary: SystemSummary | null;
  recentAuditActivity: AuditEvent[];
}

export async function getMyWork() {
  const response = await apiClient.get<{ data: MyWorkDashboard }>("/dashboard/my-work");
  return response.data.data;
}

export interface MyRisksQuery {
  search?: string;
  state?: "DRAFT" | "OPEN" | "CLOSED";
  riskLevel?: string;
  registerId?: string;
}

export async function getMyRisks(query: MyRisksQuery = {}) {
  const params: Record<string, string> = {};
  if (query.search) params.search = query.search;
  if (query.state) params.state = query.state;
  if (query.riskLevel) params.riskLevel = query.riskLevel;
  if (query.registerId) params.registerId = query.registerId;
  const response = await apiClient.get<{ data: DashboardRisk[] }>("/dashboard/my-risks", { params });
  return response.data.data;
}

export async function getAdminSummary() {
  const response = await apiClient.get<{
    data: Pick<MyWorkDashboard, "adminRegisterSummaries" | "systemSummary" | "recentAuditActivity">;
  }>("/dashboard/admin-summary");
  return response.data.data;
}
