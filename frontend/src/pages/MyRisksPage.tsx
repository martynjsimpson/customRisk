import { Anchor, Badge, Button, Group, Loader, Stack, Table, Text, Title } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Link } from "react-router-dom";

import { getMyRisks, type DashboardRisk } from "../api/dashboard.api";
import { ApiErrorAlert } from "../components/ApiErrorAlert";
import { usePermissions } from "../hooks/usePermissions";
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
      return <Table.Td>{risk.owner.name}</Table.Td>;
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

export function MyRisksPage() {
  const { isSystemAdmin } = usePermissions();
  const risksQuery = useQuery({ queryKey: ["dashboard", "my-risks"], queryFn: getMyRisks });

  const risks = risksQuery.data ?? [];

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

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={1}>My Risks</Title>
        <ColumnPicker
          groups={columnPickerGroups}
          visibleColumns={visibleColumns}
          onChange={setColumns}
        />
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
                      component={Link}
                      to={`/registers/${risk.register.id}?riskId=${risk.id}`}
                      fw={600}
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
                    <Button
                      component={Link}
                      to={`/registers/${risk.register.id}?riskId=${risk.id}&action=review`}
                      variant="subtle"
                      size="xs"
                    >
                      Review
                    </Button>
                    <Button
                      component={Link}
                      to={`/registers/${risk.register.id}?riskId=${risk.id}&action=edit`}
                      variant="subtle"
                      size="xs"
                    >
                      Edit
                    </Button>
                    {isSystemAdmin ? (
                      <Button
                        component={Link}
                        to={`/registers/${risk.register.id}?riskId=${risk.id}&action=delete`}
                        variant="subtle"
                        color="red"
                        size="xs"
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
                  <Text c="dimmed">No risks are assigned to you.</Text>
                </Table.Td>
              </Table.Tr>
            ) : null}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Stack>
  );
}
