import {
  Button,
  Checkbox,
  Group,
  Loader,
  Modal,
  NumberInput,
  Select,
  Stack,
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
  type RiskFormConfig,
  type RiskState,
  type SaveRiskInput,
  updateRisk,
  RISK_STATES
} from "../../api/risks.api";
import type { RegisterRecord } from "../../api/registers.api";
import { ApiErrorAlert } from "../../components/ApiErrorAlert";
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
  onChange
}: {
  field: CustomFieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const label = field.fieldName;

  if (field.fieldType === "MULTILINE_TEXT") {
    return <Textarea label={label} required={field.isRequired} value={String(value ?? "")} onChange={(event) => onChange(event.currentTarget.value)} />;
  }
  if (field.fieldType === "NUMBER") {
    return <NumberInput label={label} required={field.isRequired} value={typeof value === "number" ? value : undefined} onChange={onChange} />;
  }
  if (field.fieldType === "BOOLEAN") {
    return <Checkbox label={label} checked={Boolean(value)} onChange={(event) => onChange(event.currentTarget.checked)} />;
  }
  if (field.fieldType === "DATE") {
    return <TextInput label={label} required={field.isRequired} type="date" value={String(value ?? "")} onChange={(event) => onChange(event.currentTarget.value)} />;
  }
  if (field.fieldType === "PERSON_PICKER") {
    return (
      <PersonPicker
        label={label}
        required={field.isRequired}
        value={String(value ?? "")}
        onChange={onChange}
      />
    );
  }
  if (field.fieldType === "DROPDOWN") {
    return (
      <Select
        label={label}
        required={field.isRequired}
        data={(field.options ?? []).map((option) => ({ value: option.id, label: option.label }))}
        value={String(value ?? "") || null}
        onChange={onChange}
      />
    );
  }

  return <TextInput label={label} required={field.isRequired} value={String(value ?? "")} onChange={(event) => onChange(event.currentTarget.value)} />;
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

  const form = useForm<RiskFormValues>({ initialValues: emptyValues(defaultState) });

  const selectedRiskQuery = useQuery({
    queryKey: ["risk", register.id, editingRiskId],
    queryFn: () => getRisk(register.id, editingRiskId!),
    enabled: Boolean(opened && editingRiskId)
  });

  useEffect(() => {
    if (!opened) {
      return;
    }

    if (editingRiskId && selectedRiskQuery.data) {
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
              field.person?.email ??
              field.personUser?.email ??
              field.dropdownOption?.id ??
              ""
          ])
        )
      );
      return;
    }

    if (!editingRiskId) {
      form.setValues(emptyValues(defaultState));
      setCustomValues({});
    }
  }, [defaultState, editingRiskId, opened, selectedRiskQuery.data]);

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
      onClose();
      setCustomValues({});
      await onSuccess();
    }
  });

  return (
    <Modal opened={opened} onClose={onClose} title={editingRiskId ? "Edit risk" : "Add risk"} size="lg">
      <form onSubmit={form.onSubmit(() => saveMutation.mutate())}>
        <Stack>
          <ApiErrorAlert error={saveMutation.error} fallback="Unable to save risk" />
          {orderedRiskFormFields.map((field) =>
            field.kind === "core" ? (
              renderCoreField({ fieldId: field.id, form, canManage, ownerOptions, formConfig })
            ) : (
              <CustomFieldInput
                key={field.id}
                field={field.field}
                value={customValues[field.id]}
                onChange={(value) => setCustomValues((current) => ({ ...current, [field.id]: value }))}
              />
            )
          )}
          <Group justify="flex-end">
            <Button variant="subtle" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={saveMutation.isPending}>Save</Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
