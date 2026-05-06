import { Anchor, Badge, Button, Checkbox, Group, Loader, Pagination, Select, Stack, Table, Text, Title } from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import {
  exportRisks,
  getRiskFormConfig,
  listRisks,
  type RiskListQuery
} from "../../api/risks.api";
import type { RegisterRecord } from "../../api/registers.api";
import { ApiErrorAlert } from "../../components/ApiErrorAlert";
import { ReviewStatusBadge } from "../../components/ReviewStatusBadge/ReviewStatusBadge";
import { RiskLevelBadge } from "../../components/RiskLevelBadge/RiskLevelBadge";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { usePermissions } from "../../hooks/usePermissions";
import { RiskDetailModal } from "./RiskDetailModal";
import { RiskFilters } from "./RiskFilters";
import { RiskFormModal } from "./RiskFormModal";
import { DeleteRiskModal } from "./DeleteRiskModal";
import { ReviewModal } from "./ReviewModal";

interface RiskRegisterPanelProps {
  register: RegisterRecord;
}

export function RiskRegisterPanel({ register }: RiskRegisterPanelProps) {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isSystemAdmin } = usePermissions();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<RiskListQuery>({
    page: 1,
    pageSize: 25,
    includeClosed: false,
    sortBy: "riskId",
    sortDir: "asc"
  });
  const [formOpened, setFormOpened] = useState(false);
  const [editingRiskId, setEditingRiskId] = useState<string | null>(null);
  const [detailRiskId, setDetailRiskId] = useState<string | null>(null);
  const [reviewRiskId, setReviewRiskId] = useState<string | null>(null);
  const [deleteRiskId, setDeleteRiskId] = useState<string | null>(null);
  const { user } = useCurrentUser();

  const canManage = isSystemAdmin || register.effectiveRole === "REGISTER_ADMIN";
  const canEditOwnedRows = Boolean(user);
  const canExport =
    canManage || (register.effectiveRole === "REGISTER_VIEWER" && register.allowViewerExport);

  const formConfigQuery = useQuery({
    queryKey: ["risk-form-config", register.id],
    queryFn: () => getRiskFormConfig(register.id)
  });
  const riskQuery = useQuery({
    queryKey: ["risks", register.id, filters, page],
    queryFn: () => listRisks(register.id, { ...filters, page }),
    placeholderData: (previous) => previous
  });
  const selectedRisk = useMemo(
    () => (riskQuery.data?.data ?? []).find((risk) => risk.id === detailRiskId),
    [detailRiskId, riskQuery.data?.data]
  );
  const canEditSelectedRisk = Boolean(canManage || (user && selectedRisk?.owner.id === user.id));

  const invalidateRisks = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["risks", register.id] }),
      queryClient.invalidateQueries({ queryKey: ["risk", register.id] }),
      queryClient.invalidateQueries({ queryKey: ["risk-reviews", register.id] }),
      queryClient.invalidateQueries({ queryKey: ["audit", "risk", register.id] }),
      queryClient.invalidateQueries({ queryKey: ["audit", "register", register.id] }),
      queryClient.invalidateQueries({ queryKey: ["register", register.id] }),
      queryClient.invalidateQueries({ queryKey: ["registers"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
    ]);
  };

  const exportMutation = useMutation({
    mutationFn: () => exportRisks(register.id, filters),
    onSuccess: ({ blob, filename }) => {
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
    }
  });

  const ownerOptions = useMemo(
    () =>
      (formConfigQuery.data?.users ?? []).map((user) => ({
        value: user.id,
        label: `${user.name} (${user.email})`
      })),
    [formConfigQuery.data?.users]
  );

  useEffect(() => {
    const riskId = searchParams.get("riskId");
    const action = searchParams.get("action");

    if (!riskId) {
      return;
    }

    const requestedRisk = (riskQuery.data?.data ?? []).find((risk) => risk.id === riskId);
    const canEditRequestedRisk = Boolean(canManage || (user && requestedRisk?.owner.id === user.id));

    if (action === "review" && canEditRequestedRisk && register.reviewsEnabled) {
      setReviewRiskId(riskId);
      setSearchParams({}, { replace: true });
    } else if (action === "edit" && canEditRequestedRisk) {
      setEditingRiskId(riskId);
      setFormOpened(true);
      setSearchParams({}, { replace: true });
    } else if (action === "delete" && isSystemAdmin) {
      setDeleteRiskId(riskId);
      setSearchParams({}, { replace: true });
    } else if (!action) {
      setDetailRiskId(riskId);
      setSearchParams({}, { replace: true });
    }
  }, [canManage, isSystemAdmin, register.reviewsEnabled, riskQuery.data?.data, searchParams, setSearchParams, user]);

  const openCreate = () => {
    setDetailRiskId(null);
    setReviewRiskId(null);
    setDeleteRiskId(null);
    setEditingRiskId(null);
    setFormOpened(true);
  };

  const openEdit = (riskId: string) => {
    setDetailRiskId(null);
    setEditingRiskId(riskId);
    setFormOpened(true);
  };

  const openDetail = (riskId: string) => {
    setDetailRiskId(riskId);
  };

  const openReview = (riskId: string) => {
    setDetailRiskId(null);
    setReviewRiskId(riskId);
  };

  const openDelete = (riskId: string) => {
    setDetailRiskId(null);
    setDeleteRiskId(riskId);
  };

  if (formConfigQuery.isLoading) {
    return <Loader />;
  }

  if (formConfigQuery.error) {
    return <ApiErrorAlert error={formConfigQuery.error} fallback="Unable to load risk form configuration" />;
  }

  const formConfig = formConfigQuery.data!;

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Risks</Title>
        <Group>
          {canExport ? (
            <Button variant="light" onClick={() => exportMutation.mutate()} loading={exportMutation.isPending}>
              Export CSV
            </Button>
          ) : null}
          {canManage ? <Button onClick={openCreate}>Add risk</Button> : null}
        </Group>
      </Group>
      <ApiErrorAlert error={exportMutation.error} fallback="Unable to export risks" />

      <RiskFilters
        filters={filters}
        formConfig={formConfig}
        ownerOptions={ownerOptions}
        onChange={(patch) => {
          setPage(1);
          setFilters((current) => ({ ...current, ...patch }));
        }}
      />

      <ApiErrorAlert error={riskQuery.error} fallback="Unable to load risks" />
      {riskQuery.isLoading ? <Loader /> : null}
      <Table.ScrollContainer minWidth={1080}>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Risk ID</Table.Th>
              <Table.Th>Title</Table.Th>
              <Table.Th>State</Table.Th>
              <Table.Th>Owner</Table.Th>
              <Table.Th>Likelihood</Table.Th>
              <Table.Th>Impact</Table.Th>
              <Table.Th>Score</Table.Th>
              <Table.Th>Level</Table.Th>
              <Table.Th>Response</Table.Th>
              <Table.Th>Next review</Table.Th>
              <Table.Th>Review</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {(riskQuery.data?.data ?? []).map((risk) => (
              <Table.Tr key={risk.id}>
                <Table.Td>
                  <Anchor component={Link} to={`?riskId=${risk.id}`} fw={600} onClick={() => openDetail(risk.id)}>
                    {risk.displayRiskId}
                  </Anchor>
                </Table.Td>
                <Table.Td>{risk.title}</Table.Td>
                <Table.Td><Badge>{risk.state}</Badge></Table.Td>
                <Table.Td>{risk.owner.name}</Table.Td>
                <Table.Td>{risk.likelihood.name}</Table.Td>
                <Table.Td>{risk.impact.name}</Table.Td>
                <Table.Td>{risk.riskScore}</Table.Td>
                <Table.Td><RiskLevelBadge riskLevel={risk.riskLevel} /></Table.Td>
                <Table.Td>{risk.responseStrategy.name}</Table.Td>
                <Table.Td>{risk.nextReviewDate ?? ""}</Table.Td>
                <Table.Td><ReviewStatusBadge status={risk.reviewStatus} /></Table.Td>
                <Table.Td>
                  <Group justify="flex-end" gap="xs" wrap="nowrap">
                    {(canManage || (canEditOwnedRows && risk.owner.id === user?.id)) && register.reviewsEnabled ? (
                      <Button variant="subtle" size="xs" onClick={() => openReview(risk.id)}>Review</Button>
                    ) : null}
                    {canManage || (canEditOwnedRows && risk.owner.id === user?.id) ? (
                      <Button variant="subtle" size="xs" onClick={() => openEdit(risk.id)}>Edit</Button>
                    ) : null}
                    {isSystemAdmin ? (
                      <Button variant="subtle" color="red" size="xs" onClick={() => openDelete(risk.id)}>
                        Delete
                      </Button>
                    ) : null}
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
            {riskQuery.data?.data.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={12}><Text c="dimmed">No risks match the current filters.</Text></Table.Td>
              </Table.Tr>
            ) : null}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      <Pagination
        value={page}
        total={Math.max(1, Math.ceil((riskQuery.data?.meta.total ?? 0) / (riskQuery.data?.meta.pageSize ?? 25)))}
        onChange={setPage}
      />

      <RiskFormModal
        register={register}
        formConfig={formConfig}
        canManage={canManage}
        opened={formOpened}
        editingRiskId={editingRiskId}
        onClose={() => {
          setFormOpened(false);
          setEditingRiskId(null);
        }}
        onSuccess={invalidateRisks}
      />

      <RiskDetailModal
        register={register}
        registerId={register.id}
        riskId={detailRiskId}
        formConfig={formConfig}
        opened={Boolean(detailRiskId)}
        canReview={canEditSelectedRisk && register.reviewsEnabled}
        canEditRows={canEditSelectedRisk}
        canDelete={isSystemAdmin}
        onClose={() => setDetailRiskId(null)}
        onRequestEdit={openEdit}
        onRequestReview={openReview}
        onRequestDelete={openDelete}
      />

      <ReviewModal
        register={register}
        registerId={register.id}
        riskId={reviewRiskId}
        opened={Boolean(reviewRiskId)}
        onClose={() => setReviewRiskId(null)}
        onSuccess={invalidateRisks}
      />

      <DeleteRiskModal
        registerId={register.id}
        riskId={deleteRiskId}
        opened={Boolean(deleteRiskId)}
        onClose={() => setDeleteRiskId(null)}
        onSuccess={invalidateRisks}
      />
    </Stack>
  );
}
