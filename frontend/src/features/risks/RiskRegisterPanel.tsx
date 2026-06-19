import { Alert, Anchor, Badge, Button, Group, Loader, Pagination, Stack, Table, Text, Title, Tooltip } from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { useFeatureFlags } from "../../hooks/useFeatureFlags";
import { SavedViewsPanel } from "./SavedViewsPanel";

import {
  exportRisks,
  getValidationSummary,
  getRisk,
  getRiskFormConfig,
  listRisks,
  type RiskListItem,
  type RiskListQuery,
  type ValidationStatus
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
import { ColumnPicker } from "./ColumnPicker";
import type { ColumnGroup, PickerColumn } from "./ColumnPicker";
import {
  REGISTER_TABLE_CORE_COLUMNS,
  customRegisterColumnKey,
  getRegisterColumnDisplayOrder,
  renderCustomFieldValue,
  sortColumnsByDisplayOrder,
} from "./riskTableColumns";
import { useRegisterTableColumns, filterValidRegisterColumns } from "./useRiskTableColumns";

interface RiskRegisterPanelProps {
  register: RegisterRecord;
}

function RiskTableCell({ risk, columnKey }: { risk: RiskListItem; columnKey: string }) {
  switch (columnKey) {
    case "riskId":
      return null; // handled in the row directly (needs anchor)
    case "title":
      return <Table.Td>{risk.title}</Table.Td>;
    case "state": {
      const stateColor = risk.state === "OPEN" ? "blue" : risk.state === "DRAFT" ? "gray" : "dark";
      return <Table.Td><Badge color={stateColor}>{risk.state}</Badge></Table.Td>;
    }
    case "owner":
      return <Table.Td>{risk.owner?.name ?? "—"}</Table.Td>;
    case "likelihood":
      return <Table.Td>{risk.likelihood.name}</Table.Td>;
    case "impact":
      return <Table.Td>{risk.impact.name}</Table.Td>;
    case "score":
      return <Table.Td>{risk.riskScore}</Table.Td>;
    case "level":
      return <Table.Td><RiskLevelBadge riskLevel={risk.riskLevel} /></Table.Td>;
    case "response":
      return <Table.Td>{risk.responseStrategy.name}</Table.Td>;
    case "nextReview":
      return <Table.Td>{risk.nextReviewDate ?? ""}</Table.Td>;
    case "reviewStatus":
      return <Table.Td><ReviewStatusBadge status={risk.reviewStatus} /></Table.Td>;
    default: {
      // custom field column: "custom:<fieldId>"
      if (columnKey.startsWith("custom:")) {
        const fieldId = columnKey.slice(7);
        const cfv = risk.customFieldValues.find((v) => v.customFieldDefinitionId === fieldId);
        return <Table.Td>{renderCustomFieldValue(cfv)}</Table.Td>;
      }
      return null;
    }
  }
}

function ValidationStatusDot({ status }: { status: ValidationStatus }) {
  if (status === "OK") return null;
  const color = status === "BLOCK" ? "var(--mantine-color-red-6)" : "var(--mantine-color-yellow-5)";
  const label = status === "BLOCK" ? "Required fields missing" : "Recommended fields empty";
  return (
    <Tooltip label={label} position="right">
      <span
        style={{
          display: "inline-block",
          width: 8,
          height: 8,
          borderRadius: "50%",
          backgroundColor: color,
          flexShrink: 0
        }}
      />
    </Tooltip>
  );
}

export function RiskRegisterPanel({ register }: RiskRegisterPanelProps) {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isSystemAdmin } = usePermissions();
  const flags = useFeatureFlags();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<RiskListQuery>({
    page: 1,
    pageSize: 25,
    includeClosed: false,
    sortBy: "riskId",
    sortDir: "asc",
    validationIssues: undefined
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
  const validationSummaryQuery = useQuery({
    queryKey: ["risks-validation-summary", register.id],
    queryFn: () => getValidationSummary(register.id),
    enabled: register.customFieldValidationEnabled
  });
  const selectedRisk = useMemo(
    () => (riskQuery.data?.data ?? []).find((risk) => risk.id === detailRiskId),
    [detailRiskId, riskQuery.data?.data]
  );
  const canEditSelectedRisk = Boolean(canManage || (user && selectedRisk?.owner?.id === user.id));

  const activeCustomFields = useMemo(
    () => (formConfigQuery.data?.customFields ?? []).filter((f) => f.isActive),
    [formConfigQuery.data]
  );

  const activeCustomFieldIds = useMemo(
    () => new Set(activeCustomFields.map((f) => f.id)),
    [activeCustomFields]
  );

  const { visibleColumns: rawVisibleColumns, setColumns } = useRegisterTableColumns(register.id);

  const visibleColumns = useMemo(() => {
    const valid = filterValidRegisterColumns(rawVisibleColumns, activeCustomFieldIds);
    return sortColumnsByDisplayOrder(
      valid,
      (key) => getRegisterColumnDisplayOrder(key, REGISTER_TABLE_CORE_COLUMNS, activeCustomFields)
    );
  }, [rawVisibleColumns, activeCustomFieldIds, activeCustomFields]);

  const columnPickerGroups = useMemo<ColumnGroup[]>(() => {
    const corePickerColumns: PickerColumn[] = REGISTER_TABLE_CORE_COLUMNS.map((c) => ({
      key: c.key,
      label: c.label,
    }));
    const groups: ColumnGroup[] = [{ columns: corePickerColumns }];
    if (activeCustomFields.length > 0) {
      groups.push({
        label: "Custom Fields",
        columns: activeCustomFields.map((f) => ({
          key: customRegisterColumnKey(f.id),
          label: f.fieldName,
        })),
      });
    }
    return groups;
  }, [activeCustomFields]);

  const columnHeader = (key: string): string => {
    const core = REGISTER_TABLE_CORE_COLUMNS.find((c) => c.key === key);
    if (core) return core.label;
    if (key.startsWith("custom:")) {
      const fieldId = key.slice(7);
      return activeCustomFields.find((f) => f.id === fieldId)?.fieldName ?? key;
    }
    return key;
  };

  const invalidateRisks = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["risks", register.id] }),
      queryClient.invalidateQueries({ queryKey: ["risks-validation-summary", register.id] }),
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

    const requestedRiskId = riskId;

    if (!action) {
      setDetailRiskId(requestedRiskId);
      setSearchParams({}, { replace: true });
      return;
    }

    let cancelled = false;

    async function handleRequestedAction() {
      const requestedRiskFromList = (riskQuery.data?.data ?? []).find((risk) => risk.id === requestedRiskId);
      const requestedRisk = requestedRiskFromList ?? await queryClient.fetchQuery({
        queryKey: ["risk", register.id, requestedRiskId],
        queryFn: () => getRisk(register.id, requestedRiskId)
      });

      if (cancelled || !requestedRisk) {
        return;
      }

      const canEditRequestedRisk = Boolean(canManage || (user && requestedRisk.owner?.id === user.id));

      if (action === "review" && canEditRequestedRisk && register.reviewsEnabled) {
        setReviewRiskId(requestedRiskId);
      } else if (action === "edit" && canEditRequestedRisk) {
        setEditingRiskId(requestedRiskId);
        setFormOpened(true);
      } else if (action === "delete" && isSystemAdmin) {
        setDeleteRiskId(requestedRiskId);
      }

      setSearchParams({}, { replace: true });
    }

    void handleRequestedAction();

    return () => {
      cancelled = true;
    };
  }, [canManage, isSystemAdmin, queryClient, register.id, register.reviewsEnabled, riskQuery.data?.data, searchParams, setSearchParams, user]);

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

  // Columns other than riskId and the actions column
  const dataColumns = visibleColumns.filter((k) => k !== "riskId");
  const showRiskId = visibleColumns.includes("riskId");

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Risks</Title>
        <Group>
          <ColumnPicker
            groups={columnPickerGroups}
            visibleColumns={visibleColumns}
            onChange={setColumns}
          />
          {flags.savedViews ? (
            <SavedViewsPanel
              registerId={register.id}
              currentFilters={filters}
              currentColumns={visibleColumns}
              onApply={(view) => {
                if (view.filters && typeof view.filters === "object") {
                  setFilters((current) => ({ ...current, ...(view.filters as Partial<typeof filters>) }));
                  setPage(1);
                }
                if (Array.isArray(view.columns)) {
                  setColumns(view.columns as string[]);
                }
              }}
            />
          ) : null}
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

      {(() => {
        const summary = validationSummaryQuery.data;
        if (!summary || (summary.blockCount === 0 && summary.warnCount === 0)) return null;
        const isFiltered = filters.validationIssues === true;
        const parts: string[] = [];
        if (summary.blockCount > 0) parts.push(`${summary.blockCount} risks with missing required fields`);
        if (summary.warnCount > 0) parts.push(`${summary.warnCount} risks with empty recommended fields`);
        return (
          <Alert
            color={summary.blockCount > 0 ? "red" : "yellow"}
            title="Validation issues"
          >
            <Group justify="space-between" align="center">
              <Text size="sm">{parts.join(", ")} (out of {summary.total} open risks)</Text>
              <Button
                size="xs"
                variant={isFiltered ? "filled" : "light"}
                color={summary.blockCount > 0 ? "red" : "yellow"}
                onClick={() =>
                  setFilters((current) => ({
                    ...current,
                    validationIssues: isFiltered ? undefined : true
                  }))
                }
              >
                {isFiltered ? "Show all" : "Show issues only"}
              </Button>
            </Group>
          </Alert>
        );
      })()}
      <ApiErrorAlert error={riskQuery.error} fallback="Unable to load risks" />
      {riskQuery.isLoading ? <Loader /> : null}
      <Table.ScrollContainer minWidth={600}>
        <Table>
          <Table.Thead>
            <Table.Tr>
              {showRiskId ? <Table.Th>Risk ID</Table.Th> : null}
              {dataColumns.map((key) => (
                <Table.Th key={key}>{columnHeader(key)}</Table.Th>
              ))}
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {(riskQuery.data?.data ?? []).map((risk) => (
              <Table.Tr key={risk.id}>
                {showRiskId ? (
                  <Table.Td>
                    <Group gap={6} align="center" wrap="nowrap">
                      <ValidationStatusDot status={risk.validationStatus} />
                      <Anchor component={Link} to={`?riskId=${risk.id}`} fw={600} onClick={() => openDetail(risk.id)}>
                        {risk.displayRiskId}
                      </Anchor>
                    </Group>
                  </Table.Td>
                ) : null}
                {dataColumns.map((key) => (
                  <RiskTableCell key={key} risk={risk} columnKey={key} />
                ))}
                <Table.Td>
                  <Group justify="flex-end" gap="xs" wrap="nowrap">
                    {(canManage || (canEditOwnedRows && risk.owner?.id === user?.id)) && register.reviewsEnabled ? (
                      <Button variant="subtle" size="xs" onClick={() => openReview(risk.id)}>Review</Button>
                    ) : null}
                    {canManage || (canEditOwnedRows && risk.owner?.id === user?.id) ? (
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
                <Table.Td colSpan={visibleColumns.length + 1}>
                  <Text c="dimmed">No risks match the current filters.</Text>
                </Table.Td>
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
