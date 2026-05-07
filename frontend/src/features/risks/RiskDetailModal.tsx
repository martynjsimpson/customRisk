import { Button, Group, Loader, Modal, Stack, Table, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

import { getRisk, listRiskReviews, type RiskDetail, type RiskFormConfig } from "../../api/risks.api";
import { listRiskAudit } from "../../api/audit.api";
import type { RegisterRecord } from "../../api/registers.api";
import { ApiErrorAlert } from "../../components/ApiErrorAlert";
import { AuditEventTable } from "../audit/AuditEventTable";
import { CORE_RISK_FIELDS } from "./coreRiskFields";
import { ReviewStatusBadge } from "../../components/ReviewStatusBadge/ReviewStatusBadge";
import { RiskLevelBadge } from "../../components/RiskLevelBadge/RiskLevelBadge";

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
      return risk.owner.name;
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
  if (field.textValue !== null) return field.textValue;
  if (field.numberValue !== null) return String(field.numberValue);
  if (field.booleanValue !== null) return field.booleanValue ? "Yes" : "No";
  if (field.dateValue !== null) return field.dateValue;
  if (field.person) return field.person.displayName;
  if (field.personUser) return field.personUser.name;
  if (field.dropdownOption) return field.dropdownOption.label;
  return "";
}

interface RiskDetailModalProps {
  register: RegisterRecord;
  registerId: string;
  riskId: string | null;
  formConfig: RiskFormConfig;
  opened: boolean;
  canReview: boolean;
  canEditRows: boolean;
  canDelete: boolean;
  onClose: () => void;
  onRequestEdit: (riskId: string) => void;
  onRequestReview: (riskId: string) => void;
  onRequestDelete: (riskId: string) => void;
}

export function RiskDetailModal({
  register,
  registerId,
  riskId,
  formConfig,
  opened,
  canReview,
  canEditRows,
  canDelete,
  onClose,
  onRequestEdit,
  onRequestReview,
  onRequestDelete
}: RiskDetailModalProps) {
  const activeCustomFields = formConfig.customFields.filter((field) => field.isActive);

  const selectedRiskQuery = useQuery({
    queryKey: ["risk", registerId, riskId],
    queryFn: () => getRisk(registerId, riskId!),
    enabled: Boolean(opened && riskId)
  });
  const reviewHistoryQuery = useQuery({
    queryKey: ["risk-reviews", registerId, riskId],
    queryFn: () => listRiskReviews(registerId, riskId!),
    enabled: Boolean(opened && riskId)
  });
  const riskAuditQuery = useQuery({
    queryKey: ["audit", "risk", registerId, riskId],
    queryFn: () => listRiskAudit(registerId, riskId!),
    enabled: Boolean(opened && riskId)
  });

  return (
    <Modal opened={opened && Boolean(riskId)} onClose={onClose} title="Risk Detail" size="lg">
      <ApiErrorAlert error={selectedRiskQuery.error} fallback="Unable to load risk detail" />
      {selectedRiskQuery.data ? (
        <Stack>
          <Group justify="space-between">
            <Title order={3}>{selectedRiskQuery.data.displayRiskId}</Title>
            <ReviewStatusBadge status={selectedRiskQuery.data.reviewStatus} />
          </Group>
          <Table>
            <Table.Tbody>
              {[
                ...CORE_RISK_FIELDS.map((field) => ({ kind: "core" as const, ...field })),
                ...activeCustomFields.map((def) => {
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
                        dropdownOption: null
                      }
                  };
                })
              ]
                .sort((a, b) => a.displayOrder - b.displayOrder)
                .map((field) =>
                  field.kind === "core" ? (
                    <Table.Tr key={field.id}>
                      <Table.Th>{field.fieldName}</Table.Th>
                      <Table.Td>{coreDetailValue(selectedRiskQuery.data!, field.id)}</Table.Td>
                    </Table.Tr>
                  ) : (
                    <Table.Tr key={field.id}>
                      <Table.Th>{field.fieldName}</Table.Th>
                      <Table.Td>{customDetailValue(field.entry)}</Table.Td>
                    </Table.Tr>
                  )
                )}
            </Table.Tbody>
          </Table>
          <Title order={4}>Actions</Title>
          <Group justify="flex-start" gap="xs">
            {canReview ? (
              <Button variant="subtle" size="xs" onClick={() => onRequestReview(selectedRiskQuery.data!.id)}>
                Review
              </Button>
            ) : null}
            {canEditRows ? (
              <Button variant="subtle" size="xs" onClick={() => onRequestEdit(selectedRiskQuery.data!.id)}>
                Edit
              </Button>
            ) : null}
            {canDelete ? (
              <Button variant="subtle" color="red" size="xs" onClick={() => onRequestDelete(selectedRiskQuery.data!.id)}>
                Delete
              </Button>
            ) : null}
          </Group>
          <Title order={4}>Review history</Title>
          <ApiErrorAlert error={reviewHistoryQuery.error} fallback="Unable to load review history" />
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
              {(reviewHistoryQuery.data ?? []).map((review) => (
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
          <Title order={4}>Audit history</Title>
          <ApiErrorAlert error={riskAuditQuery.error} fallback="Unable to load risk audit history" />
          <AuditEventTable events={riskAuditQuery.data?.data ?? []} />
        </Stack>
      ) : selectedRiskQuery.isLoading ? (
        <Loader />
      ) : null}
    </Modal>
  );
}
