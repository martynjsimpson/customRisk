import { Anchor, Badge, Button, Group, Loader, Select, Stack, Table, Text, TextInput, Title } from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { exportMyRisks, getMyRisks, type DashboardRisk, type MyRisksQuery } from "../api/dashboard.api";
import { getRegister } from "../api/registers.api";
import { getRiskFormConfig } from "../api/risks.api";
import { ApiErrorAlert } from "../components/ApiErrorAlert";
import { usePermissions } from "../hooks/usePermissions";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { RiskLevelBadge } from "../components/RiskLevelBadge/RiskLevelBadge";
import { ReviewStatusBadge } from "../components/ReviewStatusBadge/ReviewStatusBadge";
import { ColumnPicker } from "../features/risks/ColumnPicker";
import type { ColumnGroup } from "../features/risks/ColumnPicker";
import {
  MY_RISKS_CORE_COLUMNS,
  customMyRisksColumnKey,
  getMyRisksColumnDisplayOrder,
  parseCustomMyRisksColumnKey,
  renderCustomFieldValue,
  sortColumnsByDisplayOrder,
} from "../features/risks/riskTableColumns";
import { useMyRisksTableColumns } from "../features/risks/useRiskTableColumns";
import { RiskDetailModal } from "../features/risks/RiskDetailModal";
import { RiskFormModal } from "../features/risks/RiskFormModal";
import { ReviewModal } from "../features/risks/ReviewModal";
import { DeleteRiskModal } from "../features/risks/DeleteRiskModal";

interface AvailableCustomField {
  columnKey: string;
  registerId: string;
  registerName: string;
  fieldId: string;
  fieldName: string;
  displayOrder: number;
  // Stable sort key: register name for grouping, then field display order within the register
  registerSortKey: string;
}

function buildAvailableCustomFields(risks: DashboardRisk[]): AvailableCustomField[] {
  const seen = new Set<string>();
  const fields: AvailableCustomField[] = [];

  for (const risk of risks) {
    for (const cfv of risk.customFieldValues) {
      if (!cfv.isActive) continue;
      const key = customMyRisksColumnKey(risk.register.id, cfv.customFieldDefinitionId);
      if (!seen.has(key)) {
        seen.add(key);
        fields.push({
          columnKey: key,
          registerId: risk.register.id,
          registerName: risk.register.name,
          fieldId: cfv.customFieldDefinitionId,
          fieldName: cfv.fieldName,
          displayOrder: cfv.displayOrder,
          registerSortKey: risk.register.name,
        });
      }
    }
  }

  // Sort by register name, then by field display order within each register
  fields.sort((a, b) =>
    a.registerName.localeCompare(b.registerName) || a.displayOrder - b.displayOrder
  );

  return fields;
}

function buildColumnPickerGroups(availableCustomFields: AvailableCustomField[]): ColumnGroup[] {
  const groups: ColumnGroup[] = [{ label: "Core Fields", columns: MY_RISKS_CORE_COLUMNS }];

  // Group custom fields by register name
  const byRegister = new Map<string, { registerName: string; fields: AvailableCustomField[] }>();
  for (const field of availableCustomFields) {
    if (!byRegister.has(field.registerId)) {
      byRegister.set(field.registerId, { registerName: field.registerName, fields: [] });
    }
    byRegister.get(field.registerId)!.fields.push(field);
  }

  for (const { registerName, fields } of byRegister.values()) {
    groups.push({
      label: registerName,
      columns: fields.map((f) => ({ key: f.columnKey, label: f.fieldName })),
    });
  }

  return groups;
}

function filterValidMyRisksColumns(
  columns: string[],
  availableColumnKeys: Set<string>
): string[] {
  return columns.filter((key) => {
    const parsed = parseCustomMyRisksColumnKey(key);
    if (parsed === null) return true; // core column
    return availableColumnKeys.has(key);
  });
}

function MyRiskCell({ risk, columnKey }: { risk: DashboardRisk; columnKey: string }) {
  switch (columnKey) {
    case "register":
      return <Table.Td>{risk.register.name}</Table.Td>;
    case "title":
      return <Table.Td>{risk.title}</Table.Td>;
    case "state":
      return <Table.Td><Badge>{risk.state}</Badge></Table.Td>;
    case "owner":
      return <Table.Td>{risk.owner?.name ?? "—"}</Table.Td>;
    case "score":
      return <Table.Td>{risk.riskScore}</Table.Td>;
    case "level":
      return <Table.Td><RiskLevelBadge riskLevel={risk.riskLevel} /></Table.Td>;
    case "nextReview":
      return <Table.Td>{risk.nextReviewDate ?? ""}</Table.Td>;
    case "reviewStatus":
      return <Table.Td><ReviewStatusBadge status={risk.reviewStatus} /></Table.Td>;
    default: {
      if (columnKey.startsWith("custom:")) {
        const parsed = parseCustomMyRisksColumnKey(columnKey);
        if (parsed && risk.register.id === parsed.registerId) {
          const cfv = risk.customFieldValues.find(
            (v) => v.customFieldDefinitionId === parsed.fieldId
          );
          return <Table.Td>{renderCustomFieldValue(cfv)}</Table.Td>;
        }
        // Risk belongs to a different register — field does not apply
        return <Table.Td><Text c="dimmed">—</Text></Table.Td>;
      }
      return null;
    }
  }
}

const RISK_STATE_OPTIONS = [
  { value: "DRAFT", label: "Draft" },
  { value: "OPEN", label: "Open" },
  { value: "CLOSED", label: "Closed" },
] as const;

export function MyRisksPage() {
  const { isSystemAdmin } = usePermissions();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get("search") ?? undefined;
  const state = (searchParams.get("state") as MyRisksQuery["state"]) ?? undefined;
  const riskLevel = searchParams.get("riskLevel") ?? undefined;
  const registerId = searchParams.get("registerId") ?? undefined;

  const filters: MyRisksQuery = useMemo(() => ({
    search,
    state,
    riskLevel,
    registerId,
  }), [search, state, riskLevel, registerId]);

  const risksQuery = useQuery({
    queryKey: ["dashboard", "my-risks", filters],
    queryFn: () => getMyRisks(filters),
  });

  const risks = useMemo(() => risksQuery.data ?? [], [risksQuery.data]);

  const riskLevelOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: Array<{ value: string; label: string }> = [];
    for (const risk of risks) {
      if (risk.riskLevel && !seen.has(risk.riskLevel.name)) {
        seen.add(risk.riskLevel.name);
        options.push({ value: risk.riskLevel.name, label: risk.riskLevel.name });
      }
    }
    return options;
  }, [risks]);

  const registerOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: Array<{ value: string; label: string }> = [];
    for (const risk of risks) {
      if (!seen.has(risk.register.id)) {
        seen.add(risk.register.id);
        options.push({ value: risk.register.id, label: risk.register.name });
      }
    }
    return options;
  }, [risks]);

  const setFilter = (patch: Partial<MyRisksQuery>) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined || value === null || value === "") {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      }
      return next;
    }, { replace: true });
  };

  const resetFilters = () => {
    setSearchParams({}, { replace: true });
  };

  const hasActiveFilters = Boolean(
    filters.search || filters.state || filters.riskLevel || filters.registerId
  );

  // Modal state — track the selected risk and which modal is open
  const [detailRiskId, setDetailRiskId] = useState<string | null>(null);
  const [editingRiskId, setEditingRiskId] = useState<string | null>(null);
  const [formOpened, setFormOpened] = useState(false);
  const [reviewRiskId, setReviewRiskId] = useState<string | null>(null);
  const [deleteRiskId, setDeleteRiskId] = useState<string | null>(null);

  // The register ID for the currently active modal — drives formConfig/register fetches
  const activeRegisterId = useMemo(() => {
    const activeRiskId = detailRiskId ?? editingRiskId ?? reviewRiskId ?? deleteRiskId;
    if (!activeRiskId) return null;
    return risks.find((r) => r.id === activeRiskId)?.register.id ?? null;
  }, [detailRiskId, editingRiskId, reviewRiskId, deleteRiskId, risks]);

  const formConfigQuery = useQuery({
    queryKey: ["risk-form-config", activeRegisterId],
    queryFn: () => getRiskFormConfig(activeRegisterId!),
    enabled: Boolean(activeRegisterId)
  });

  const registerQuery = useQuery({
    queryKey: ["register", activeRegisterId],
    queryFn: () => getRegister(activeRegisterId!),
    enabled: Boolean(activeRegisterId)
  });

  const selectedRisk = useMemo(
    () => risks.find((r) => r.id === (detailRiskId ?? editingRiskId)),
    [risks, detailRiskId, editingRiskId]
  );
  const canEditSelectedRisk = Boolean(
    isSystemAdmin || (user && selectedRisk?.owner?.id === user.id)
  );

  const availableCustomFields = useMemo(() => buildAvailableCustomFields(risks), [risks]);
  const availableCustomFieldKeys = useMemo(
    () => new Set(availableCustomFields.map((f) => f.columnKey)),
    [availableCustomFields]
  );
  const columnPickerGroups = useMemo(
    () => buildColumnPickerGroups(availableCustomFields),
    [availableCustomFields]
  );

  const { visibleColumns: rawVisibleColumns, setColumns } = useMyRisksTableColumns();

  // Build display order entries for the sort utility (base offset 1000 so custom fields
  // always follow core fields regardless of individual displayOrder values)
  const customFieldOrderEntries = useMemo(
    () =>
      availableCustomFields.map((f, index) => ({
        columnKey: f.columnKey,
        displayOrder: 1000 + index,
        registerSortKey: f.registerSortKey,
      })),
    [availableCustomFields]
  );

  const visibleColumns = useMemo(() => {
    const valid = filterValidMyRisksColumns(rawVisibleColumns, availableCustomFieldKeys);
    return sortColumnsByDisplayOrder(
      valid,
      (key) => getMyRisksColumnDisplayOrder(key, MY_RISKS_CORE_COLUMNS, customFieldOrderEntries)
    );
  }, [rawVisibleColumns, availableCustomFieldKeys, customFieldOrderEntries]);

  const showRiskId = visibleColumns.includes("riskId");
  const dataColumns = visibleColumns.filter((k) => k !== "riskId");

  const columnHeader = (key: string): string => {
    const core = MY_RISKS_CORE_COLUMNS.find((c) => c.key === key);
    if (core) return core.label;
    const custom = availableCustomFields.find((f) => f.columnKey === key);
    return custom ? custom.fieldName : key;
  };

  const totalCols = visibleColumns.length + 1; // +1 for actions column

  const invalidateAfterSave = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["risks", activeRegisterId] }),
      queryClient.invalidateQueries({ queryKey: ["risk", activeRegisterId] }),
      queryClient.invalidateQueries({ queryKey: ["risk-reviews", activeRegisterId] }),
    ]);
  };

  const exportMutation = useMutation({
    mutationFn: () => exportMyRisks(filters),
    onSuccess: ({ blob, filename }) => {
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
    }
  });

  const openDetail = (riskId: string) => {
    setDetailRiskId(riskId);
    setEditingRiskId(null);
    setFormOpened(false);
    setReviewRiskId(null);
    setDeleteRiskId(null);
  };

  const openEdit = (riskId: string) => {
    setDetailRiskId(null);
    setEditingRiskId(riskId);
    setFormOpened(true);
    setReviewRiskId(null);
    setDeleteRiskId(null);
  };

  const openReview = (riskId: string) => {
    setDetailRiskId(null);
    setEditingRiskId(null);
    setFormOpened(false);
    setReviewRiskId(riskId);
    setDeleteRiskId(null);
  };

  const openDelete = (riskId: string) => {
    setDetailRiskId(null);
    setEditingRiskId(null);
    setFormOpened(false);
    setReviewRiskId(null);
    setDeleteRiskId(riskId);
  };

  // Find the register for the review risk (needed by ReviewModal)
  const reviewRisk = useMemo(
    () => risks.find((r) => r.id === reviewRiskId),
    [risks, reviewRiskId]
  );

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={1}>My Risks</Title>
        <Group>
          <ColumnPicker
            groups={columnPickerGroups}
            visibleColumns={visibleColumns}
            onChange={setColumns}
          />
          <Button variant="light" onClick={() => exportMutation.mutate()} loading={exportMutation.isPending}>
            Export CSV
          </Button>
        </Group>
      </Group>
      <ApiErrorAlert error={exportMutation.error} fallback="Unable to export risks" />
      <Group align="end">
        <TextInput
          label="Search"
          value={filters.search ?? ""}
          onChange={(event) => setFilter({ search: event.currentTarget.value || undefined })}
        />
        <Select
          label="State"
          clearable
          data={RISK_STATE_OPTIONS}
          value={filters.state ?? null}
          onChange={(value) => setFilter({ state: (value as MyRisksQuery["state"]) ?? undefined })}
        />
        <Select
          label="Risk level"
          clearable
          data={riskLevelOptions}
          value={filters.riskLevel ?? null}
          onChange={(value) => setFilter({ riskLevel: value ?? undefined })}
        />
        <Select
          label="Register"
          clearable
          data={registerOptions}
          value={filters.registerId ?? null}
          onChange={(value) => setFilter({ registerId: value ?? undefined })}
        />
        {hasActiveFilters ? (
          <Button variant="subtle" onClick={resetFilters}>
            Reset
          </Button>
        ) : null}
      </Group>
      <ApiErrorAlert error={risksQuery.error} fallback="Unable to load assigned risks" />
      {risksQuery.isLoading ? <Loader /> : null}
      <Table.ScrollContainer minWidth={600}>
        <Table>
          <Table.Thead>
            <Table.Tr>
              {showRiskId ? <Table.Th>Risk</Table.Th> : null}
              {dataColumns.map((key) => (
                <Table.Th key={key}>{columnHeader(key)}</Table.Th>
              ))}
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {risks.map((risk) => (
              <Table.Tr key={risk.id}>
                {showRiskId ? (
                  <Table.Td>
                    <Anchor
                      component="button"
                      fw={600}
                      onClick={() => openDetail(risk.id)}
                    >
                      {risk.displayRiskId}
                    </Anchor>
                    <Text size="sm">{risk.title}</Text>
                  </Table.Td>
                ) : null}
                {dataColumns.map((key) => (
                  <MyRiskCell key={key} risk={risk} columnKey={key} />
                ))}
                <Table.Td>
                  <Group justify="flex-end" gap="xs" wrap="nowrap">
                    {risk.reviewStatus !== "NOT_REQUIRED" ? (
                      <Button
                        variant="subtle"
                        size="xs"
                        onClick={() => openReview(risk.id)}
                      >
                        Review
                      </Button>
                    ) : null}
                    <Button
                      variant="subtle"
                      size="xs"
                      onClick={() => openEdit(risk.id)}
                    >
                      Edit
                    </Button>
                    {isSystemAdmin ? (
                      <Button
                        variant="subtle"
                        color="red"
                        size="xs"
                        onClick={() => openDelete(risk.id)}
                      >
                        Delete
                      </Button>
                    ) : null}
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
            {risks.length === 0 && !risksQuery.isLoading ? (
              <Table.Tr>
                <Table.Td colSpan={totalCols}>
                  <Text c="dimmed">{hasActiveFilters ? "No risks match the current filters." : "No risks are assigned to you."}</Text>
                </Table.Td>
              </Table.Tr>
            ) : null}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>

      {detailRiskId && activeRegisterId && formConfigQuery.data ? (
        <RiskDetailModal
          registerId={activeRegisterId}
          riskId={detailRiskId}
          formConfig={formConfigQuery.data}
          opened={Boolean(detailRiskId)}
          canReview={canEditSelectedRisk}
          canEditRows={canEditSelectedRisk}
          canDelete={isSystemAdmin}
          onClose={() => setDetailRiskId(null)}
          onRequestEdit={openEdit}
          onRequestReview={openReview}
          onRequestDelete={openDelete}
        />
      ) : null}

      {formConfigQuery.data && registerQuery.data ? (
        <RiskFormModal
          register={registerQuery.data}
          formConfig={formConfigQuery.data}
          canManage={isSystemAdmin || registerQuery.data.effectiveRole === "REGISTER_ADMIN"}
          opened={formOpened}
          editingRiskId={editingRiskId}
          onClose={() => {
            setFormOpened(false);
            setEditingRiskId(null);
          }}
          onSuccess={invalidateAfterSave}
        />
      ) : null}

      {reviewRisk && registerQuery.data ? (
        <ReviewModal
          register={registerQuery.data}
          registerId={reviewRisk.register.id}
          riskId={reviewRiskId}
          opened={Boolean(reviewRiskId)}
          onClose={() => setReviewRiskId(null)}
          onSuccess={invalidateAfterSave}
        />
      ) : null}

      {activeRegisterId ? (
        <DeleteRiskModal
          registerId={activeRegisterId}
          riskId={deleteRiskId}
          opened={Boolean(deleteRiskId)}
          onClose={() => setDeleteRiskId(null)}
          onSuccess={invalidateAfterSave}
        />
      ) : null}
    </Stack>
  );
}
