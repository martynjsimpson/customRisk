import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Group,
  Loader,
  Modal,
  NumberInput,
  Pagination,
  Select,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
  Title
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import {
  createRisk,
  deleteRisk,
  exportRisks,
  getRisk,
  getRiskFormConfig,
  listRisks,
  RISK_STATES,
  updateRisk,
  type CustomFieldDefinition,
  type RiskDetail,
  type RiskListQuery,
  type RiskState,
  type SaveRiskInput
} from "../../api/risks.api";
import type { RegisterRecord } from "../../api/registers.api";
import { ApiErrorAlert } from "../../components/ApiErrorAlert";
import { usePermissions } from "../../hooks/usePermissions";
import { CORE_RISK_FIELDS, type CoreRiskFieldId } from "./coreRiskFields";

interface RiskRegisterPanelProps {
  register: RegisterRecord;
}

const REVIEW_STATUS_OPTIONS = [
  { value: "NOT_REQUIRED", label: "Not required" },
  { value: "NOT_REVIEWED", label: "Not reviewed" },
  { value: "NOT_DUE",      label: "Not due" },
  { value: "DUE_SOON",     label: "Due soon" },
  { value: "OVERDUE",      label: "Overdue" },
] as const;

type RiskFormValues = {
  title: string;
  description: string;
  state: RiskState;
  ownerUserId: string;
  createdDate: string;
  likelihoodValueId: string;
  impactValueId: string;
  responseStrategyId: string;
  responseAction: string;
};

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function emptyValues(defaultState: RiskState): RiskFormValues {
  return {
    title: "",
    description: "",
    state: defaultState,
    ownerUserId: "",
    createdDate: todayString(),
    likelihoodValueId: "",
    impactValueId: "",
    responseStrategyId: "",
    responseAction: ""
  };
}

function statusBadge(status: string) {
  const color =
    status === "OVERDUE"
      ? "red"
      : status === "DUE_SOON"
        ? "yellow"
        : status === "NOT_REVIEWED"
          ? "gray"
          : "green";
  return <Badge color={color} variant="light">{status.replace(/_/g, " ")}</Badge>;
}

function customFieldPayload(definition: CustomFieldDefinition, value: unknown) {
  if (value === undefined || value === null || value === "") {
    return { customFieldDefinitionId: definition.id };
  }

  switch (definition.fieldType) {
    case "TEXT":
    case "MULTILINE_TEXT":
      return { customFieldDefinitionId: definition.id, textValue: String(value) };
    case "NUMBER":
      return { customFieldDefinitionId: definition.id, numberValue: Number(value) };
    case "BOOLEAN":
      return { customFieldDefinitionId: definition.id, booleanValue: Boolean(value) };
    case "DATE":
      return { customFieldDefinitionId: definition.id, dateValue: String(value) };
    case "PERSON_PICKER":
      return { customFieldDefinitionId: definition.id, personUserId: String(value) };
    case "DROPDOWN":
      return { customFieldDefinitionId: definition.id, dropdownOptionId: String(value) };
  }
}

function coreDetailValue(risk: RiskDetail, fieldId: CoreRiskFieldId): string {
  switch (fieldId) {
    case "title":              return risk.title;
    case "description":        return risk.description;
    case "state":              return risk.state;
    case "createdDate":        return risk.createdDate;
    case "ownerUserId":        return risk.owner.name;
    case "likelihoodValueId":  return risk.likelihood.name;
    case "impactValueId":      return risk.impact.name;
    case "riskScore":          return String(risk.riskScore);
    case "responseStrategyId": return risk.responseStrategy.name;
    case "responseAction":     return risk.responseAction ?? "";
  }
}

function customDetailValue(field: RiskDetail["customFields"][number]): string {
  if (field.textValue !== null)    return field.textValue;
  if (field.numberValue !== null)  return String(field.numberValue);
  if (field.booleanValue !== null) return field.booleanValue ? "Yes" : "No";
  if (field.dateValue !== null)    return field.dateValue;
  if (field.personUser)            return field.personUser.name;
  if (field.dropdownOption)        return field.dropdownOption.label;
  return "";
}

export function RiskRegisterPanel({ register }: RiskRegisterPanelProps) {
  const queryClient = useQueryClient();
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
  const [deleteRiskId, setDeleteRiskId] = useState<string | null>(null);
  const [deletionReason, setDeletionReason] = useState("");
  const [customValues, setCustomValues] = useState<Record<string, unknown>>({});
  const canManage = isSystemAdmin || register.effectiveRole === "REGISTER_ADMIN";
  const canEditRows = canManage || register.effectiveRole === "RISK_OWNER";
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
  const selectedRiskQuery = useQuery({
    queryKey: ["risk", register.id, detailRiskId ?? editingRiskId],
    queryFn: () => getRisk(register.id, (detailRiskId ?? editingRiskId)!),
    enabled: Boolean(detailRiskId || editingRiskId)
  });

  const defaultState = formConfigQuery.data?.register.defaultNewRiskState ?? "DRAFT";
  const activeCustomFields = useMemo(
    () => (formConfigQuery.data?.customFields ?? []).filter((field) => field.isActive),
    [formConfigQuery.data?.customFields]
  );
  const orderedRiskFormFields = useMemo(
    () =>
      [
        ...CORE_RISK_FIELDS.map((field) => ({ kind: "core" as const, ...field })),
        ...activeCustomFields.map((field) => ({
          kind: "custom" as const,
          id: field.id,
          displayOrder: field.displayOrder,
          field
        }))
      ].sort((left, right) => left.displayOrder - right.displayOrder),
    [activeCustomFields]
  );
  const form = useForm<RiskFormValues>({ initialValues: emptyValues(defaultState) });

  useEffect(() => {
    if (!formOpened || !editingRiskId || !selectedRiskQuery.data) {
      return;
    }

    const risk = selectedRiskQuery.data;
    form.setValues({
      title: risk.title,
      description: risk.description,
      state: risk.state,
      ownerUserId: risk.owner.id,
      createdDate: risk.createdDate,
      likelihoodValueId: risk.likelihood.id,
      impactValueId: risk.impact.id,
      responseStrategyId: risk.responseStrategy.id,
      responseAction: risk.responseAction ?? ""
    });
    setCustomValues(
      Object.fromEntries(
        risk.customFields.map((field) => [
          field.customFieldDefinition.id,
          field.textValue ??
            field.numberValue ??
            field.booleanValue ??
            field.dateValue ??
            field.personUser?.id ??
            field.dropdownOption?.id ??
            ""
        ])
      )
    );
  }, [selectedRiskQuery.data, editingRiskId, formOpened]);

  const invalidateRisks = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["risks", register.id] }),
      queryClient.invalidateQueries({ queryKey: ["risk", register.id] }),
      queryClient.invalidateQueries({ queryKey: ["register", register.id] }),
      queryClient.invalidateQueries({ queryKey: ["registers"] })
    ]);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const customFields = activeCustomFields.map((definition) =>
        customFieldPayload(definition, customValues[definition.id])
      );
      const payload: SaveRiskInput = {
        ...form.values,
        createdDate: canManage ? form.values.createdDate : undefined,
        responseAction: form.values.responseAction || null,
        customFields
      };
      return editingRiskId
        ? updateRisk(register.id, editingRiskId, payload)
        : createRisk(register.id, payload);
    },
    onSuccess: async () => {
      setFormOpened(false);
      setEditingRiskId(null);
      await invalidateRisks();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteRisk(register.id, deleteRiskId!, { deletionReason: deletionReason || undefined }),
    onSuccess: async () => {
      setDeleteRiskId(null);
      setDeletionReason("");
      await invalidateRisks();
    }
  });

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

  const renderCoreField = (fieldId: CoreRiskFieldId) => {
    switch (fieldId) {
      case "title":
        return <TextInput key={fieldId} label="Title" required {...form.getInputProps("title")} />;
      case "description":
        return <Textarea key={fieldId} label="Description" required minRows={3} {...form.getInputProps("description")} />;
      case "state":
        return <Select key={fieldId} label="State" data={RISK_STATES} required {...form.getInputProps("state")} />;
      case "createdDate":
        return (
          <TextInput
            key={fieldId}
            label="Created date"
            type="date"
            required
            disabled={!canManage}
            {...form.getInputProps("createdDate")}
          />
        );
      case "ownerUserId":
        return <Select key={fieldId} label="Owner" data={ownerOptions} searchable required {...form.getInputProps("ownerUserId")} />;
      case "likelihoodValueId":
        return (
          <Select
            key={fieldId}
            label="Likelihood"
            data={(formConfigQuery.data?.likelihoodValues ?? []).map((item) => ({ value: item.id, label: item.name }))}
            required
            {...form.getInputProps("likelihoodValueId")}
          />
        );
      case "impactValueId":
        return (
          <Select
            key={fieldId}
            label="Impact"
            data={(formConfigQuery.data?.impactValues ?? []).map((item) => ({ value: item.id, label: item.name }))}
            required
            {...form.getInputProps("impactValueId")}
          />
        );
      case "riskScore":
        return editingRiskId && selectedRiskQuery.data ? (
          <TextInput key={fieldId} label="Risk score (calculated)" value={String(selectedRiskQuery.data.riskScore)} readOnly />
        ) : null;
      case "responseStrategyId":
        return (
          <Select
            key={fieldId}
            label="Response strategy"
            data={(formConfigQuery.data?.responseStrategies ?? []).map((item) => ({ value: item.id, label: item.name }))}
            required
            {...form.getInputProps("responseStrategyId")}
          />
        );
      case "responseAction":
        return <Textarea key={fieldId} label="Response action" minRows={2} {...form.getInputProps("responseAction")} />;
    }
  };

  const openCreate = () => {
    setEditingRiskId(null);
    form.setValues(emptyValues(defaultState));
    setCustomValues({});
    setFormOpened(true);
  };

  const openEdit = (riskId: string) => {
    setEditingRiskId(riskId);
    setFormOpened(true);
  };

  if (formConfigQuery.isLoading) {
    return <Loader />;
  }

  if (formConfigQuery.error) {
    return <ApiErrorAlert error={formConfigQuery.error} fallback="Unable to load risk form configuration" />;
  }

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

      <Group align="end">
        <TextInput
          label="Search"
          value={filters.search ?? ""}
          onChange={(event) => {
            setPage(1);
            setFilters((current) => ({ ...current, search: event.currentTarget.value || undefined }));
          }}
        />
        <Select
          label="State"
          clearable
          data={RISK_STATES}
          value={filters.state ?? null}
          onChange={(value) => {
            setPage(1);
            setFilters((current) => ({ ...current, state: (value as RiskState | null) ?? undefined }));
          }}
        />
        <Select
          label="Risk level"
          clearable
          data={(formConfigQuery.data?.riskLevels ?? []).map((level) => ({
            value: level.id,
            label: level.name
          }))}
          value={filters.riskLevelId ?? null}
          onChange={(value) => {
            setPage(1);
            setFilters((current) => ({ ...current, riskLevelId: value ?? undefined }));
          }}
        />
        <Select
          label="Owner"
          clearable
          searchable
          data={ownerOptions}
          value={filters.ownerUserId ?? null}
          onChange={(value) => {
            setPage(1);
            setFilters((current) => ({ ...current, ownerUserId: value ?? undefined }));
          }}
        />
        <Select
          label="Review"
          clearable
          data={REVIEW_STATUS_OPTIONS}
          value={filters.reviewStatus ?? null}
          onChange={(value) => {
            setPage(1);
            setFilters((current) => ({ ...current, reviewStatus: (value as RiskListQuery["reviewStatus"]) ?? undefined }));
          }}
        />
        <Checkbox
          label="Include closed"
          checked={filters.includeClosed ?? false}
          onChange={(event) => {
            setPage(1);
            setFilters((current) => ({ ...current, includeClosed: event.currentTarget.checked }));
          }}
        />
      </Group>

      <ApiErrorAlert error={riskQuery.error} fallback="Unable to load risks" />
      <Table striped highlightOnHover>
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
              <Table.Td>{risk.displayRiskId}</Table.Td>
              <Table.Td>{risk.title}</Table.Td>
              <Table.Td><Badge variant="light">{risk.state}</Badge></Table.Td>
              <Table.Td>{risk.owner.name}</Table.Td>
              <Table.Td>{risk.likelihood.name}</Table.Td>
              <Table.Td>{risk.impact.name}</Table.Td>
              <Table.Td>{risk.riskScore}</Table.Td>
              <Table.Td>{risk.riskLevel.name}</Table.Td>
              <Table.Td>{risk.responseStrategy.name}</Table.Td>
              <Table.Td>{risk.nextReviewDate ?? ""}</Table.Td>
              <Table.Td>{statusBadge(risk.reviewStatus)}</Table.Td>
              <Table.Td>
                <Group justify="flex-end" gap="xs">
                  <Button variant="subtle" size="xs" onClick={() => setDetailRiskId(risk.id)}>Open</Button>
                  {canEditRows ? <Button variant="subtle" size="xs" onClick={() => openEdit(risk.id)}>Edit</Button> : null}
                  {isSystemAdmin ? (
                    <Button variant="subtle" color="red" size="xs" onClick={() => setDeleteRiskId(risk.id)}>
                      Delete
                    </Button>
                  ) : null}
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
          {riskQuery.data?.data.length === 0 ? (
            <Table.Tr>
              <Table.Td colSpan={12}><Text c="dimmed">No risks found</Text></Table.Td>
            </Table.Tr>
          ) : null}
        </Table.Tbody>
      </Table>
      <Pagination
        value={page}
        total={Math.max(1, Math.ceil((riskQuery.data?.meta.total ?? 0) / (riskQuery.data?.meta.pageSize ?? 25)))}
        onChange={setPage}
      />

      <Modal opened={formOpened} onClose={() => setFormOpened(false)} title={editingRiskId ? "Edit risk" : "Add risk"} size="lg">
        <form onSubmit={form.onSubmit(() => saveMutation.mutate())}>
          <Stack>
            <ApiErrorAlert error={saveMutation.error} fallback="Unable to save risk" />
            {orderedRiskFormFields.map((field) =>
              field.kind === "core" ? (
                renderCoreField(field.id)
              ) : (
                <CustomFieldInput
                  key={field.id}
                  field={field.field}
                  users={ownerOptions}
                  value={customValues[field.id]}
                  onChange={(value) => setCustomValues((current) => ({ ...current, [field.id]: value }))}
                />
              )
            )}
            <Group justify="flex-end">
              <Button variant="subtle" onClick={() => setFormOpened(false)}>Cancel</Button>
              <Button type="submit" loading={saveMutation.isPending}>Save</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal opened={Boolean(detailRiskId)} onClose={() => setDetailRiskId(null)} title="Risk detail" size="lg">
        <ApiErrorAlert error={selectedRiskQuery.error} fallback="Unable to load risk detail" />
        {selectedRiskQuery.data ? (
          <Stack>
            <Group justify="space-between">
              <Title order={3}>{selectedRiskQuery.data.displayRiskId}</Title>
              {statusBadge(selectedRiskQuery.data.reviewStatus)}
            </Group>
            <Table>
              <Table.Tbody>
                {[
                  ...CORE_RISK_FIELDS.map(f => ({ kind: "core" as const, ...f })),
                  ...selectedRiskQuery.data.customFields.map(f => ({
                    kind: "custom" as const,
                    id: f.id,
                    displayOrder: f.customFieldDefinition.displayOrder,
                    fieldName: f.customFieldDefinition.fieldName,
                    entry: f
                  }))
                ]
                  .sort((a, b) => a.displayOrder - b.displayOrder)
                  .map(field =>
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
                <Table.Tr><Table.Th>Level</Table.Th><Table.Td>{selectedRiskQuery.data.riskLevel.name}</Table.Td></Table.Tr>
                <Table.Tr><Table.Th>Next review</Table.Th><Table.Td>{selectedRiskQuery.data.nextReviewDate ?? ""}</Table.Td></Table.Tr>
                <Table.Tr><Table.Th>Created by</Table.Th><Table.Td>{selectedRiskQuery.data.systemCreatedBy.name}</Table.Td></Table.Tr>
                <Table.Tr><Table.Th>Updated</Table.Th><Table.Td>{new Date(selectedRiskQuery.data.systemUpdatedAt).toLocaleString()}</Table.Td></Table.Tr>
              </Table.Tbody>
            </Table>
          </Stack>
        ) : selectedRiskQuery.isLoading ? (
          <Loader />
        ) : null}
      </Modal>

      <Modal opened={Boolean(deleteRiskId)} onClose={() => setDeleteRiskId(null)} title="Delete risk">
        <Stack>
          <Alert color="red">This permanently deletes the risk after writing an audit snapshot.</Alert>
          <ApiErrorAlert error={deleteMutation.error} fallback="Unable to delete risk" />
          <Textarea
            label="Deletion reason"
            value={deletionReason}
            onChange={(event) => setDeletionReason(event.currentTarget.value)}
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setDeleteRiskId(null)}>Cancel</Button>
            <Button color="red" loading={deleteMutation.isPending} onClick={() => deleteMutation.mutate()}>
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

function CustomFieldInput({
  field,
  users,
  value,
  onChange
}: {
  field: CustomFieldDefinition;
  users: Array<{ value: string; label: string }>;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const label = field.isRequired ? `${field.fieldName} *` : field.fieldName;

  if (field.fieldType === "MULTILINE_TEXT") {
    return <Textarea label={label} value={String(value ?? "")} onChange={(event) => onChange(event.currentTarget.value)} />;
  }
  if (field.fieldType === "NUMBER") {
    return <NumberInput label={label} value={typeof value === "number" ? value : undefined} onChange={onChange} />;
  }
  if (field.fieldType === "BOOLEAN") {
    return <Checkbox label={label} checked={Boolean(value)} onChange={(event) => onChange(event.currentTarget.checked)} />;
  }
  if (field.fieldType === "DATE") {
    return <TextInput label={label} type="date" value={String(value ?? "")} onChange={(event) => onChange(event.currentTarget.value)} />;
  }
  if (field.fieldType === "PERSON_PICKER") {
    return <Select label={label} searchable data={users} value={String(value ?? "") || null} onChange={onChange} />;
  }
  if (field.fieldType === "DROPDOWN") {
    return (
      <Select
        label={label}
        data={(field.options ?? []).map((option) => ({ value: option.id, label: option.label }))}
        value={String(value ?? "") || null}
        onChange={onChange}
      />
    );
  }

  return <TextInput label={label} value={String(value ?? "")} onChange={(event) => onChange(event.currentTarget.value)} />;
}
