import { Button, Group, Loader, Modal, Pagination, ScrollArea, Stack, Table, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { getRisk, listRiskReviews, type RiskDetail, type RiskFormConfig } from "../../api/risks.api";
import { listRiskAudit } from "../../api/audit.api";
import { ApiErrorAlert } from "../../components/ApiErrorAlert";
import { AuditEventTable } from "../audit/AuditEventTable";
import { CORE_RISK_FIELDS } from "./coreRiskFields";
import { RiskLevelBadge } from "../../components/RiskLevelBadge/RiskLevelBadge";
import { ReviewStatusBadge } from "../../components/ReviewStatusBadge/ReviewStatusBadge";
import { ResponseActionsPanel } from "./ResponseActionsPanel";

function coreDetailValue(risk: RiskDetail, fieldId: (typeof CORE_RISK_FIELDS)[number]["id"]): ReactNode {
  switch (fieldId) {
    case "title":
      return risk.title;
    case "description":
      return risk.description;
    case "state":
      return risk.state;
    case "createdDate":
      return risk.createdDate;
    case "ownerUserId":
      // When ownerPerson is present but unresolved, the owner was saved as an
      // email address with no matching app user. Display the email directly.
      if (risk.ownerPerson && !risk.ownerPerson.isResolved) {
        return risk.ownerPerson.email;
      }
      return risk.owner?.name ?? "—";
    case "likelihoodValueId":
      return risk.likelihood.name;
    case "impactValueId":
      return risk.impact.name;
    case "riskScore":
      return String(risk.riskScore);
    case "riskLevelId":
      return <RiskLevelBadge riskLevel={risk.riskLevel} />;
    case "responseStrategyId":
      return risk.responseStrategy.name;
    case "responseAction":
      return risk.responseAction ?? "";
    case "nextReviewDate":
      return risk.nextReviewDate ?? "";
    case "systemCreatedBy":
      return risk.systemCreatedBy.name;
    case "systemUpdatedAt":
      return new Date(risk.systemUpdatedAt).toLocaleString();
  }
}

function customDetailValue(field: RiskDetail["customFields"][number]): string {
  if (field.selectedOptions && field.selectedOptions.length > 0) return field.selectedOptions.map((o) => o.label).join(", ");
  if (field.textValue !== null) return field.textValue;
  if (field.numberValue !== null) return String(field.numberValue);
  if (field.booleanValue !== null) return field.booleanValue ? "Yes" : "No";
  if (field.dateValue !== null) return field.dateValue;
  if (field.person) return field.person.displayName;
  if (field.personUser) return field.personUser.name;
  if (field.dropdownOption) return field.dropdownOption.label;
  return "";
}

// Core fields that are always shown to Response Action Owners (regardless of
// field config). These are the minimum context fields defined in ADR §2.5.
const ALWAYS_VISIBLE_CORE_FIELD_IDS = new Set(["title", "state"]);
// displayRiskId is shown in the modal title; these are the body fields.

interface RiskDetailModalProps {
  registerId: string;
  riskId: string | null;
  formConfig: RiskFormConfig;
  opened: boolean;
  canReview: boolean;
  canEditRows: boolean;
  canDelete: boolean;
  /** Effective register role of the current user */
  effectiveRole?: "SYSTEM_ADMIN" | "REGISTER_ADMIN" | "REGISTER_VIEWER" | "RISK_OWNER" | "RESPONSE_ACTION_OWNER" | "NONE";
  /** Current user's id — needed to filter response actions for RAO view */
  currentUserId?: string | null;
  onClose: () => void;
  onRequestEdit: (riskId: string) => void;
  onRequestReview: (riskId: string) => void;
  onRequestDelete: (riskId: string) => void;
}

const HISTORY_PAGE_SIZE = 5;
const HISTORY_CAP = 100;

export function RiskDetailModal({
  registerId,
  riskId,
  formConfig,
  opened,
  canReview,
  canEditRows,
  canDelete,
  effectiveRole,
  currentUserId,
  onClose,
  onRequestEdit,
  onRequestReview,
  onRequestDelete
}: RiskDetailModalProps) {
  const isResponseActionOwner = effectiveRole === "RESPONSE_ACTION_OWNER";
  // Derive the response action mode from formConfig (updated by backend per ADR §4.3).
  const responseActionMode = formConfig.register.responseActionMode ?? "SIMPLE";

  const activeCustomFields = formConfig.customFields.filter((field) => field.isActive);
  // reviewStatusPosition is 0-based. null means "append after all other rows".
  const reviewStatusDisplayOrder = formConfig.register.reviewStatusPosition !== null
    ? formConfig.register.reviewStatusPosition
    : Number.MAX_SAFE_INTEGER;
  const [reviewPage, setReviewPage] = useState(1);
  const [auditPage, setAuditPage] = useState(1);

  const selectedRiskQuery = useQuery({
    queryKey: ["risk", registerId, riskId],
    queryFn: () => getRisk(registerId, riskId!),
    enabled: Boolean(opened && riskId)
  });
  const reviewHistoryQuery = useQuery({
    queryKey: ["risk-reviews", registerId, riskId],
    queryFn: () => listRiskReviews(registerId, riskId!),
    enabled: Boolean(opened && riskId) && !isResponseActionOwner
  });
  const riskAuditQuery = useQuery({
    queryKey: ["audit", "risk", registerId, riskId],
    queryFn: () => listRiskAudit(registerId, riskId!),
    enabled: Boolean(opened && riskId) && !isResponseActionOwner
  });

  // Permissions for the response actions panel.
  // Admins and Risk Owners can create and change owner; RAOs cannot.
  const canManageActions =
    effectiveRole === "SYSTEM_ADMIN" ||
    effectiveRole === "REGISTER_ADMIN" ||
    effectiveRole === "RISK_OWNER";
  const canDeleteAction =
    effectiveRole === "SYSTEM_ADMIN" || effectiveRole === "REGISTER_ADMIN";

  return (
    <Modal
      opened={opened && Boolean(riskId)}
      onClose={onClose}
      title={selectedRiskQuery.data ? `${selectedRiskQuery.data.displayRiskId}: ${selectedRiskQuery.data.title}` : "Risk Detail"}
      size="900px"
      scrollAreaComponent={ScrollArea.Autosize}
    >
      <ApiErrorAlert error={selectedRiskQuery.error} fallback="Unable to load risk detail" />
      {selectedRiskQuery.data ? (
        <Stack>
          {/* ── Risk field table ─────────────────────────────────────────── */}
          <Title order={4}>Risk Details</Title>
          <Table.ScrollContainer minWidth={400}>
            <Table>
              <Table.Tbody>
                {[
                  ...CORE_RISK_FIELDS
                    // In child records mode, suppress the legacy responseAction row.
                    // For RAOs, suppress any core field that isn't always visible and
                    // also suppress fields outside the minimal set (title, state shown).
                    .filter((field) => {
                      if (responseActionMode === "CHILD_RECORDS" && field.id === "responseAction") {
                        return false;
                      }
                      if (isResponseActionOwner && !ALWAYS_VISIBLE_CORE_FIELD_IDS.has(field.id)) {
                        return false;
                      }
                      return true;
                    })
                    .map((field) => ({ kind: "core" as const, ...field })),
                  ...activeCustomFields
                    // For RAOs, only show custom fields where visibleToRiskResponseOwners is true.
                    .filter((def) => !isResponseActionOwner || def.visibleToRiskResponseOwners)
                    .map((def) => {
                      const entry = selectedRiskQuery.data!.customFields.find(
                        (field) => field.customFieldDefinition.id === def.id
                      );
                      return {
                        kind: "custom" as const,
                        id: def.id,
                        displayOrder: def.displayOrder,
                        fieldName: def.fieldName,
                        entry:
                          entry ?? {
                            id: def.id,
                            customFieldDefinition: def,
                            textValue: null,
                            numberValue: null,
                            booleanValue: null,
                            dateValue: null,
                            person: null,
                            personUser: null,
                            dropdownOption: null,
                            selectedOptions: []
                          }
                      };
                    }),
                  // Review status row — only included when reviews are enabled and user
                  // is not a Response Action Owner.
                  ...(formConfig.register.reviewsEnabled && !isResponseActionOwner
                    ? [{
                        kind: "review-status" as const,
                        id: "__review_status__",
                        displayOrder: reviewStatusDisplayOrder,
                        fieldName: "Review status"
                      }]
                    : [])
                ]
                  .sort((a, b) => a.displayOrder - b.displayOrder)
                  .map((field) => {
                    if (field.kind === "review-status") {
                      return (
                        <Table.Tr key={field.id}>
                          <Table.Th>{field.fieldName}</Table.Th>
                          <Table.Td><ReviewStatusBadge status={selectedRiskQuery.data!.reviewStatus} /></Table.Td>
                        </Table.Tr>
                      );
                    }
                    if (field.kind === "core") {
                      return (
                        <Table.Tr key={field.id}>
                          <Table.Th>{field.fieldName}</Table.Th>
                          <Table.Td>{coreDetailValue(selectedRiskQuery.data!, field.id)}</Table.Td>
                        </Table.Tr>
                      );
                    }
                    return (
                      <Table.Tr key={field.id}>
                        <Table.Th>{field.fieldName}</Table.Th>
                        <Table.Td>{customDetailValue(field.entry)}</Table.Td>
                      </Table.Tr>
                    );
                  })}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>

          {/* ── Response Actions panel (child records mode) ──────────────── */}
          {responseActionMode === "CHILD_RECORDS" ? (
            <ResponseActionsPanel
              registerId={registerId}
              riskId={selectedRiskQuery.data.id}
              canCreate={canManageActions}
              canChangeOwner={canManageActions}
              canDelete={canDeleteAction}
              filterToUserId={isResponseActionOwner ? currentUserId : null}
            />
          ) : null}

          {/* ── Risk-level action buttons (not shown to RAOs) ─────────────── */}
          {!isResponseActionOwner ? (
            <>
              <Title order={4}>Risk Actions</Title>
              <Group justify="flex-start" gap="xs">
                {canReview ? (
                  <Button variant="light" size="xs" onClick={() => onRequestReview(selectedRiskQuery.data!.id)}>
                    Review
                  </Button>
                ) : null}
                {canEditRows ? (
                  <Button variant="light" size="xs" onClick={() => onRequestEdit(selectedRiskQuery.data!.id)}>
                    Edit
                  </Button>
                ) : null}
                {canDelete ? (
                  <Button variant="light" color="red" size="xs" onClick={() => onRequestDelete(selectedRiskQuery.data!.id)}>
                    Delete
                  </Button>
                ) : null}
              </Group>
            </>
          ) : null}

          {/* ── Review + audit history (not shown to RAOs) ───────────────── */}
          {!isResponseActionOwner ? (
            <>
              <Title order={4}>Review history</Title>
              <ApiErrorAlert error={reviewHistoryQuery.error} fallback="Unable to load review history" />
              {reviewHistoryQuery.data && reviewHistoryQuery.data.length === HISTORY_CAP ? (
                <Text size="xs" c="dimmed">Only the most recent {HISTORY_CAP} reviews are shown.</Text>
              ) : null}
              <Table.ScrollContainer minWidth={720}>
                <Table>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Reviewed</Table.Th>
                      <Table.Th>Reviewer</Table.Th>
                      <Table.Th>Comment</Table.Th>
                      <Table.Th>Next review</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {(reviewHistoryQuery.data ?? []).slice((reviewPage - 1) * HISTORY_PAGE_SIZE, reviewPage * HISTORY_PAGE_SIZE).map((review) => (
                      <Table.Tr key={review.id}>
                        <Table.Td>{new Date(review.reviewedAt).toLocaleString()}</Table.Td>
                        <Table.Td>{review.reviewedBy.name}</Table.Td>
                        <Table.Td>{review.comment ?? ""}</Table.Td>
                        <Table.Td>{review.calculatedNextReviewDate}</Table.Td>
                      </Table.Tr>
                    ))}
                    {reviewHistoryQuery.data?.length === 0 ? (
                      <Table.Tr>
                        <Table.Td colSpan={4}><Text c="dimmed">No reviews recorded.</Text></Table.Td>
                      </Table.Tr>
                    ) : null}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
              {(reviewHistoryQuery.data?.length ?? 0) > HISTORY_PAGE_SIZE ? (
                <Pagination
                  value={reviewPage}
                  total={Math.ceil((reviewHistoryQuery.data?.length ?? 0) / HISTORY_PAGE_SIZE)}
                  onChange={setReviewPage}
                  size="sm"
                />
              ) : null}
              <Title order={4}>Audit history</Title>
              <ApiErrorAlert error={riskAuditQuery.error} fallback="Unable to load risk audit history" />
              {riskAuditQuery.data && riskAuditQuery.data.data.length === HISTORY_CAP ? (
                <Text size="xs" c="dimmed">Only the most recent {HISTORY_CAP} audit records are shown.</Text>
              ) : null}
              <AuditEventTable
                events={(riskAuditQuery.data?.data ?? []).slice((auditPage - 1) * HISTORY_PAGE_SIZE, auditPage * HISTORY_PAGE_SIZE)}
                showIpAddress={false}
              />
              {(riskAuditQuery.data?.data.length ?? 0) > HISTORY_PAGE_SIZE ? (
                <Pagination
                  value={auditPage}
                  total={Math.ceil((riskAuditQuery.data?.data.length ?? 0) / HISTORY_PAGE_SIZE)}
                  onChange={setAuditPage}
                  size="sm"
                />
              ) : null}
            </>
          ) : null}
        </Stack>
      ) : selectedRiskQuery.isLoading ? (
        <Loader />
      ) : null}
    </Modal>
  );
}
