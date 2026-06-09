import {
  Alert,
  Button,
  Checkbox,
  Group,
  Loader,
  Modal,
  MultiSelect,
  NumberInput,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import {
  createRisk,
  getRisk,
  type CustomFieldDefinition,
  type FieldWarning,
  type RiskFormConfig,
  type RiskState,
  type SaveRiskInput,
  updateRisk,
  RISK_STATES
} from "../../api/risks.api";
import type { RegisterRecord } from "../../api/registers.api";
import { ApiErrorAlert, getApiErrorCode, getApiErrorWarnings } from "../../components/ApiErrorAlert";
import { PersonPicker } from "../../components/PersonPicker";
import { CORE_RISK_FIELDS, type CoreRiskFieldId } from "./coreRiskFields";

interface RiskFormModalProps {
  register: RegisterRecord;
  formConfig: RiskFormConfig;
  canManage: boolean;
  opened: boolean;
  editingRiskId: string | null;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
}

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
  const localDate = new Date();
  localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
  return localDate.toISOString().slice(0, 10);
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

function customFieldPayload(definition: CustomFieldDefinition, value: unknown) {
  if (definition.fieldType === "CALCULATED") {
    return null; // calculated fields are never submitted by the user
  }

  if (definition.fieldType === "MULTI_SELECT") {
    if (Array.isArray(value)) {
      return { customFieldDefinitionId: definition.id, multiSelectOptionIds: value as string[] };
    }
    return { customFieldDefinitionId: definition.id };
  }

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
      return { customFieldDefinitionId: definition.id, personEmail: String(value) };
    case "DROPDOWN":
      return { customFieldDefinitionId: definition.id, dropdownOptionId: String(value) };
  }
}

function renderCoreField({
  fieldId,
  form,
  canManage,
  ownerOptions,
  formConfig
}: {
  fieldId: CoreRiskFieldId;
  form: any;
  canManage: boolean;
  ownerOptions: Array<{ value: string; label: string }>;
  formConfig: RiskFormConfig;
}) {
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
          data={formConfig.likelihoodValues.map((item) => ({ value: item.id, label: item.name }))}
          required
          {...form.getInputProps("likelihoodValueId")}
        />
      );
    case "impactValueId":
      return (
        <Select
          key={fieldId}
          label="Impact"
          data={formConfig.impactValues.map((item) => ({ value: item.id, label: item.name }))}
          required
          {...form.getInputProps("impactValueId")}
        />
      );
    case "riskScore":
      return null;
    case "riskLevelId":
      return null;
    case "nextReviewDate":
      return null;
    case "systemCreatedBy":
      return null;
    case "systemUpdatedAt":
      return null;
    case "responseStrategyId":
      return (
        <Select
          key={fieldId}
          label="Response strategy"
          data={formConfig.responseStrategies.map((item) => ({ value: item.id, label: item.name }))}
          required
          {...form.getInputProps("responseStrategyId")}
        />
      );
    case "responseAction":
      return <Textarea key={fieldId} label="Response action" minRows={2} {...form.getInputProps("responseAction")} />;
  }
}

function CustomFieldInput({
  field,
  value,
  onChange,
  hasWarning
}: {
  field: CustomFieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
  hasWarning?: boolean;
}) {
  const label = field.fieldName;
  const warnProps = hasWarning ? { styles: { input: { borderColor: "var(--mantine-color-yellow-5)" } } } : {};

  if (field.fieldType === "MULTILINE_TEXT") {
    return <Textarea label={label} required={field.validationMode === "BLOCK"} value={String(value ?? "")} onChange={(event) => onChange(event.currentTarget.value)} {...warnProps} />;
  }
  if (field.fieldType === "NUMBER") {
    return <NumberInput label={label} required={field.validationMode === "BLOCK"} value={typeof value === "number" ? value : undefined} onChange={onChange} />;
  }
  if (field.fieldType === "BOOLEAN") {
    return <Checkbox label={label} checked={Boolean(value)} onChange={(event) => onChange(event.currentTarget.checked)} />;
  }
  if (field.fieldType === "DATE") {
    return <TextInput label={label} required={field.validationMode === "BLOCK"} type="date" value={String(value ?? "")} onChange={(event) => onChange(event.currentTarget.value)} {...warnProps} />;
  }
  if (field.fieldType === "PERSON_PICKER") {
    return (
      <PersonPicker
        label={label}
        required={field.validationMode === "BLOCK"}
        value={String(value ?? "")}
        onChange={onChange}
      />
    );
  }
  if (field.fieldType === "DROPDOWN") {
    return (
      <Select
        label={label}
        required={field.validationMode === "BLOCK"}
        data={(field.options ?? []).map((option) => ({ value: option.id, label: option.label }))}
        value={String(value ?? "") || null}
        onChange={onChange}
        {...warnProps}
      />
    );
  }

  if (field.fieldType === "MULTI_SELECT") {
    const selectedIds = Array.isArray(value) ? (value as string[]) : [];
    return (
      <MultiSelect
        label={label}
        required={field.validationMode === "BLOCK"}
        data={(field.options ?? []).map((option) => ({ value: option.id, label: option.label }))}
        value={selectedIds}
        onChange={(newValue) => onChange(newValue)}
        {...warnProps}
      />
    );
  }

  if (field.fieldType === "CALCULATED") {
    return (
      <TextInput
        label={label}
        description="Calculated automatically"
        value={String(value ?? "")}
        readOnly
        styles={{ input: { backgroundColor: "var(--mantine-color-gray-1)", cursor: "default" } }}
      />
    );
  }

  return <TextInput label={label} required={field.validationMode === "BLOCK"} value={String(value ?? "")} onChange={(event) => onChange(event.currentTarget.value)} {...warnProps} />;
}

export function RiskFormModal({
  register,
  formConfig,
  canManage,
  opened,
  editingRiskId,
  onClose,
  onSuccess
}: RiskFormModalProps) {
  const [customValues, setCustomValues] = useState<Record<string, unknown>>({});
  const [pendingWarnings, setPendingWarnings] = useState<FieldWarning[]>([]);
  const defaultState = formConfig.register.defaultNewRiskState ?? "DRAFT";

  const activeCustomFields = useMemo(
    () => formConfig.customFields.filter((field) => field.isActive),
    [formConfig.customFields]
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
  const ownerOptions = useMemo(
    () =>
      formConfig.users.map((user) => ({
        value: user.id,
        label: `${user.name} (${user.email})`
      })),
    [formConfig.users]
  );

  const warningFieldIds = useMemo(
    () => new Set(pendingWarnings.map((w) => w.fieldId)),
    [pendingWarnings]
  );

  const form = useForm<RiskFormValues>({ initialValues: emptyValues(defaultState) });
  const { setValues: setFormValues } = form;

  const selectedRiskQuery = useQuery({
    queryKey: ["risk", register.id, editingRiskId],
    queryFn: () => getRisk(register.id, editingRiskId!),
    enabled: Boolean(opened && editingRiskId)
  });

  useEffect(() => {
    if (!opened) {
      return;
    }

    if (editingRiskId) {
      setFormValues(emptyValues(defaultState));
      setCustomValues({});
      return;
    }

    setFormValues(emptyValues(defaultState));
    setCustomValues({});
  }, [defaultState, editingRiskId, opened, setFormValues]);

  useEffect(() => {
    if (!opened) {
      return;
    }

    if (editingRiskId && selectedRiskQuery.data) {
      const risk = selectedRiskQuery.data;
      setFormValues({
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
            field.selectedOptions
              ? field.selectedOptions.map((o) => o.id)
              : field.textValue ??
                field.numberValue ??
                field.booleanValue ??
                field.dateValue ??
                field.person?.email ??
                field.personUser?.email ??
                field.dropdownOption?.id ??
                ""
          ])
        )
      );
      return;
    }

  }, [editingRiskId, opened, selectedRiskQuery.data, setFormValues]);

  const isEditingRiskLoading = Boolean(editingRiskId && selectedRiskQuery.isLoading && !selectedRiskQuery.data);

  function buildPayload(acknowledgedWarnings?: boolean): SaveRiskInput {
    const customFields = activeCustomFields
      .map((definition) => customFieldPayload(definition, customValues[definition.id]))
      .filter((payload): payload is NonNullable<typeof payload> => payload !== null);
    return {
      ...form.values,
      createdDate: canManage ? form.values.createdDate : undefined,
      responseAction: form.values.responseAction || null,
      ...(acknowledgedWarnings ? { acknowledgedWarnings: true } : {}),
      customFields
    };
  }

  const saveMutation = useMutation({
    mutationFn: (acknowledgedWarnings?: boolean) => {
      const payload = buildPayload(acknowledgedWarnings);
      return editingRiskId
        ? updateRisk(register.id, editingRiskId, payload)
        : createRisk(register.id, payload);
    },
    onSuccess: async () => {
      setPendingWarnings([]);
      onClose();
      setCustomValues({});
      await onSuccess();
    },
    onError: (error) => {
      if (getApiErrorCode(error) === "VALIDATION_WARNING") {
        setPendingWarnings(getApiErrorWarnings(error) ?? []);
      }
    }
  });

  function handleClose() {
    setPendingWarnings([]);
    saveMutation.reset();
    onClose();
  }

  function handleDismissWarnings() {
    setPendingWarnings([]);
  }

  return (
    <>
      <Modal opened={opened} onClose={handleClose} title={editingRiskId ? "Edit risk" : "Add risk"} size="lg">
        <Stack>
          <ApiErrorAlert error={getApiErrorCode(saveMutation.error) !== "VALIDATION_WARNING" ? saveMutation.error : null} fallback="Unable to save risk" />
          <ApiErrorAlert error={selectedRiskQuery.error} fallback="Unable to load risk" />
          {isEditingRiskLoading ? <Loader /> : null}
          {!isEditingRiskLoading && (!editingRiskId || selectedRiskQuery.data) ? (
            <form onSubmit={form.onSubmit(() => saveMutation.mutate(undefined))}>
              <Stack>
                {orderedRiskFormFields.map((field) =>
                  field.kind === "core" ? (
                    renderCoreField({ fieldId: field.id, form, canManage, ownerOptions, formConfig })
                  ) : (
                    <CustomFieldInput
                      key={field.id}
                      field={field.field}
                      value={customValues[field.id]}
                      onChange={(value) => setCustomValues((current) => ({ ...current, [field.id]: value }))}
                      hasWarning={warningFieldIds.has(field.id)}
                    />
                  )
                )}
                <Group justify="flex-end">
                  <Button type="button" variant="subtle" onClick={handleClose}>Cancel</Button>
                  <Button type="submit" loading={saveMutation.isPending}>Save</Button>
                </Group>
              </Stack>
            </form>
          ) : null}
        </Stack>
      </Modal>

      <Modal
        opened={opened && pendingWarnings.length > 0}
        onClose={handleDismissWarnings}
        title="Save with warnings?"
        size="md"
      >
        <Stack>
          <Alert color="yellow">
            <Stack gap={4}>
              <Text>The following fields are recommended but empty:</Text>
              {pendingWarnings.map((warning) => (
                <Text key={warning.fieldId} size="sm">• {warning.message}</Text>
              ))}
            </Stack>
          </Alert>
          <Group justify="flex-end">
            <Button variant="subtle" onClick={handleDismissWarnings}>Go back</Button>
            <Button
              color="yellow"
              loading={saveMutation.isPending}
              onClick={() => saveMutation.mutate(true)}
            >
              Save anyway
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
