import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Combobox,
  Group,
  Loader,
  Modal,
  MultiSelect,
  NumberInput,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  useCombobox
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { evaluateFormula, FormulaEvaluationError } from "../../utils/formulaEvaluator";

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
import { useFeatureFlags } from "../../hooks/useFeatureFlags";

interface RiskFormModalProps {
  register: RegisterRecord;
  formConfig: RiskFormConfig;
  canManage: boolean;
  opened: boolean;
  editingRiskId: string | null;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
}

// ownerValue stores either a user ID (when a known user is selected) or an email
// string prefixed with "email:" (when free-text email-only mode is used).
// The prefix avoids collision with UUIDs and is stripped before sending to the API.
type RiskFormValues = {
  title: string;
  description: string;
  state: RiskState;
  ownerValue: string;
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
    ownerValue: "",
    createdDate: todayString(),
    likelihoodValueId: "",
    impactValueId: "",
    responseStrategyId: "",
    responseAction: ""
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_PREFIX = "email:";

function encodeOwnerEmail(email: string): string {
  return `${EMAIL_PREFIX}${email}`;
}

function isEncodedEmail(value: string): boolean {
  return value.startsWith(EMAIL_PREFIX);
}

function decodeOwnerEmail(value: string): string {
  return value.slice(EMAIL_PREFIX.length);
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

// Combobox for the Risk Owner field.
// Shows known users as dropdown options (searchable by name/email).
// When the typed value is a valid email not matching any user, offers it as a
// free-text "email-only" option. The value stored in the form is either:
//   - a user UUID (when a known user is selected), or
//   - "email:<address>" (when email-only mode is used).
function OwnerCombobox({
  users,
  value,
  onChange,
  error
}: {
  users: Array<{ id: string; name: string; email: string }>;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  // Derive the display string from the stored form value
  function displayFromValue(v: string): string {
    if (!v) return "";
    if (isEncodedEmail(v)) return decodeOwnerEmail(v);
    const matched = users.find((u) => u.id === v);
    return matched ? `${matched.name} (${matched.email})` : "";
  }

  const [inputValue, setInputValue] = useState(() => displayFromValue(value));
  const combobox = useCombobox({ onDropdownClose: () => combobox.resetSelectedOption() });

  // Sync when parent resets the form (e.g. modal open/close)
  useEffect(() => {
    setInputValue(displayFromValue(value));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const lowerInput = inputValue.trim().toLowerCase();

  const matchedUsers = useMemo(() => {
    if (!lowerInput) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(lowerInput) ||
        u.email.toLowerCase().includes(lowerInput)
    );
  }, [users, lowerInput]);

  const showFreeEmail =
    EMAIL_RE.test(inputValue.trim()) &&
    !users.some((u) => u.email.toLowerCase() === inputValue.trim().toLowerCase());

  const options = matchedUsers.map((user) => (
    <Combobox.Option key={user.id} value={user.id}>
      <Text size="sm">
        {user.name}
        <Text component="span" size="xs" c="dimmed"> ({user.email})</Text>
      </Text>
    </Combobox.Option>
  ));

  if (showFreeEmail) {
    options.push(
      <Combobox.Option key="__email__" value={encodeOwnerEmail(inputValue.trim())}>
        <Group gap="xs">
          <Text size="sm">{inputValue.trim()}</Text>
          <Badge size="xs" color="blue">Email only</Badge>
        </Group>
      </Combobox.Option>
    );
  }

  return (
    <Combobox
      store={combobox}
      onOptionSubmit={(val) => {
        onChange(val);
        setInputValue(displayFromValue(val));
        combobox.closeDropdown();
      }}
    >
      <Combobox.Target>
        <TextInput
          label="Owner *"
          value={inputValue}
          placeholder="Search by name or enter email"
          error={error}
          onChange={(event) => {
            const next = event.currentTarget.value;
            setInputValue(next);
            // Clear the stored form value whenever the user edits the text,
            // so we don't hold a stale userId/email while they're typing.
            onChange("");
            combobox.openDropdown();
          }}
          onFocus={() => {
            if (options.length > 0) combobox.openDropdown();
          }}
          onBlur={() => {
            combobox.closeDropdown();
            // Accept a free-text email on blur if nothing was selected from the dropdown
            const trimmed = inputValue.trim();
            if (trimmed && EMAIL_RE.test(trimmed) && !value) {
              const encoded = encodeOwnerEmail(trimmed);
              onChange(encoded);
            }
          }}
        />
      </Combobox.Target>
      {options.length > 0 && (
        <Combobox.Dropdown>
          <Combobox.Options>{options}</Combobox.Options>
        </Combobox.Dropdown>
      )}
    </Combobox>
  );
}

function renderCoreField({
  fieldId,
  form,
  canManage,
  users,
  formConfig,
  childActionsEnabled
}: {
  fieldId: CoreRiskFieldId;
  form: any;
  canManage: boolean;
  users: Array<{ id: string; name: string; email: string }>;
  formConfig: RiskFormConfig;
  childActionsEnabled: boolean;
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
      return (
        <OwnerCombobox
          key={fieldId}
          users={users}
          value={form.values.ownerValue}
          onChange={(val) => form.setFieldValue("ownerValue", val)}
          error={form.errors.ownerValue as string | undefined}
        />
      );
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
      // In child records mode the response action is managed as child records,
      // not as a free-text field on the risk form. Only suppress the text area
      // when the childActions feature flag is enabled — if the flag is off, always
      // show the text area regardless of the register's stored responseActionMode.
      if (childActionsEnabled && formConfig.register.responseActionMode === "CHILD_RECORDS") {
        return null;
      }
      return <Textarea key={fieldId} label="Response action" minRows={2} {...form.getInputProps("responseAction")} />;
  }
}

/**
 * Builds the label element for a custom field, appending the appropriate
 * asterisk based on the field's validation mode when validation is enabled:
 *   BLOCK → red asterisk (Mantine required marker)
 *   WARN  → yellow asterisk (advisory)
 *   ALLOW → no asterisk
 * When validation is not enabled the legacy isRequired boolean is used for the
 * red asterisk.
 */
function FieldLabel({
  field,
  validationEnabled
}: {
  field: CustomFieldDefinition;
  validationEnabled: boolean;
}) {
  const showWarn = validationEnabled && field.validationMode === "WARN";
  if (showWarn) {
    return (
      <span>
        {field.fieldName}{" "}
        <span style={{ color: "var(--mantine-color-yellow-6)" }} aria-hidden="true">*</span>
      </span>
    );
  }
  // For BLOCK and non-validation-enabled required fields the Mantine `required`
  // prop renders the red asterisk automatically — just return the plain string.
  return <>{field.fieldName}</>;
}

function CustomFieldInput({
  field,
  value,
  onChange,
  hasWarning,
  validationEnabled,
  calculatedPreview
}: {
  field: CustomFieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
  hasWarning?: boolean;
  validationEnabled: boolean;
  calculatedPreview?: string | null;
}) {
  const labelElement = <FieldLabel field={field} validationEnabled={validationEnabled} />;
  const warnProps = hasWarning ? { styles: { input: { borderColor: "var(--mantine-color-yellow-5)" } } } : {};
  const isMarkedRequired = validationEnabled ? field.validationMode === "BLOCK" : field.isRequired;

  if (field.fieldType === "MULTILINE_TEXT") {
    return <Textarea label={labelElement} required={isMarkedRequired} value={String(value ?? "")} onChange={(event) => onChange(event.currentTarget.value)} {...warnProps} />;
  }
  if (field.fieldType === "NUMBER") {
    return <NumberInput label={labelElement} required={isMarkedRequired} value={typeof value === "number" ? value : undefined} onChange={onChange} />;
  }
  if (field.fieldType === "BOOLEAN") {
    return <Checkbox label={labelElement} checked={Boolean(value)} onChange={(event) => onChange(event.currentTarget.checked)} />;
  }
  if (field.fieldType === "DATE") {
    return <TextInput label={labelElement} required={isMarkedRequired} type="date" value={String(value ?? "")} onChange={(event) => onChange(event.currentTarget.value)} {...warnProps} />;
  }
  if (field.fieldType === "PERSON_PICKER") {
    // PersonPicker requires label: string; handle WARN asterisk via a wrapper.
    const showWarnAsterisk = validationEnabled && field.validationMode === "WARN";
    if (showWarnAsterisk) {
      return (
        <div>
          <Text size="sm" fw={500} mb={4}>
            {field.fieldName}{" "}
            <span style={{ color: "var(--mantine-color-yellow-6)" }} aria-hidden="true">*</span>
          </Text>
          <PersonPicker
            label={field.fieldName}
            required={false}
            value={String(value ?? "")}
            onChange={onChange}
          />
        </div>
      );
    }
    return (
      <PersonPicker
        label={field.fieldName}
        required={isMarkedRequired}
        value={String(value ?? "")}
        onChange={onChange}
      />
    );
  }
  if (field.fieldType === "DROPDOWN") {
    return (
      <Select
        label={labelElement}
        required={isMarkedRequired}
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
        label={labelElement}
        required={isMarkedRequired}
        data={(field.options ?? []).map((option) => ({ value: option.id, label: option.label }))}
        value={selectedIds}
        onChange={(newValue) => onChange(newValue)}
        {...warnProps}
      />
    );
  }

  if (field.fieldType === "CALCULATED") {
    // Show the live preview when available (not yet saved), otherwise fall
    // back to the server-persisted value.
    const isPreview = calculatedPreview !== null && calculatedPreview !== undefined;
    const displayValue = isPreview ? calculatedPreview : String(value ?? "");
    return (
      <TextInput
        label={labelElement}
        description={isPreview ? "Preview — saved on submit" : "Calculated automatically"}
        value={displayValue}
        readOnly
        styles={{
          input: {
            backgroundColor: "var(--mantine-color-default-hover)",
            cursor: "default",
            fontStyle: isPreview ? "italic" : undefined,
            color: isPreview ? "var(--mantine-color-dimmed)" : undefined
          }
        }}
      />
    );
  }

  return <TextInput label={labelElement} required={isMarkedRequired} value={String(value ?? "")} onChange={(event) => onChange(event.currentTarget.value)} {...warnProps} />;
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
  const flags = useFeatureFlags();
  const [customValues, setCustomValues] = useState<Record<string, unknown>>({});
  const [pendingWarnings, setPendingWarnings] = useState<FieldWarning[]>([]);
  const defaultState = formConfig.register.defaultNewRiskState ?? "DRAFT";
  const validationEnabled = formConfig.register.customFieldValidationEnabled;

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
  const warningFieldIds = useMemo(
    () => new Set(pendingWarnings.map((w) => w.fieldId)),
    [pendingWarnings]
  );

  const form = useForm<RiskFormValues>({
    initialValues: emptyValues(defaultState),
    validate: {
      ownerValue: (value) => {
        if (!value) return "Owner is required";
        if (isEncodedEmail(value)) {
          const email = decodeOwnerEmail(value);
          if (!EMAIL_RE.test(email)) return "Enter a valid email address";
        }
        return null;
      }
    }
  });
  const { setValues: setFormValues } = form;

  // Compute live previews for CALCULATED fields based on current form values (UI-023).
  // Keys are custom field definition IDs; values are the formatted preview strings
  // (or null when the formula cannot be evaluated with current inputs).
  const calculatedPreviews = useMemo<Record<string, string | null>>(() => {
    const calculatedFields = activeCustomFields.filter((f) => f.fieldType === "CALCULATED");
    if (calculatedFields.length === 0) return {};

    // Build the fieldValues context from current NUMBER custom field values.
    const fieldValues: Record<string, number | null> = {};
    for (const f of activeCustomFields) {
      if (f.fieldType === "NUMBER") {
        const v = customValues[f.id];
        fieldValues[f.id.toLowerCase()] = typeof v === "number" ? v : null;
      }
    }

    // Resolve likelihood / impact numeric values from the form selection.
    const likelihoodOption = formConfig.likelihoodValues.find(
      (lv) => lv.id === form.values.likelihoodValueId
    );
    const impactOption = formConfig.impactValues.find(
      (iv) => iv.id === form.values.impactValueId
    );
    const likelihoodNum = likelihoodOption?.numericValue != null ? parseFloat(String(likelihoodOption.numericValue)) : null;
    const impactNum = impactOption?.numericValue != null ? parseFloat(String(impactOption.numericValue)) : null;

    const previews: Record<string, string | null> = {};
    for (const f of calculatedFields) {
      if (!f.formula) { previews[f.id] = null; continue; }
      try {
        const result = evaluateFormula(f.formula, {
          fieldValues,
          score: null,
          likelihood: likelihoodNum,
          impact: impactNum
        });
        // Mirror backend serialisation: store as string, trim trailing zeros
        previews[f.id] = String(parseFloat(result.toFixed(10)));
      } catch {
        previews[f.id] = null;
      }
    }
    return previews;
  }, [activeCustomFields, customValues, form.values.likelihoodValueId, form.values.impactValueId, formConfig.likelihoodValues, formConfig.impactValues]);

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
      // Determine the ownerValue: use user ID if the owner is a resolved user,
      // otherwise encode their email for email-only mode.
      const ownerIsResolved = risk.ownerPerson ? risk.ownerPerson.isResolved : Boolean(risk.owner);
      const ownerValue = ownerIsResolved
        ? (risk.owner?.id ?? "")
        : encodeOwnerEmail(risk.ownerPerson?.email ?? risk.owner?.email ?? "");
      setFormValues({
        title: risk.title,
        description: risk.description,
        state: risk.state,
        ownerValue,
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

    const { ownerValue, ...restValues } = form.values;
    const ownerFields: Pick<SaveRiskInput, "ownerUserId" | "ownerEmail"> = isEncodedEmail(ownerValue)
      ? { ownerEmail: decodeOwnerEmail(ownerValue) }
      : { ownerUserId: ownerValue };

    return {
      ...restValues,
      ...ownerFields,
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
      <Modal opened={opened} onClose={handleClose} title={editingRiskId ? (form.values.title ? `Edit: ${form.values.title}` : "Edit risk") : "Add risk"} size="lg">
        <Stack>
          <ApiErrorAlert error={getApiErrorCode(saveMutation.error) !== "VALIDATION_WARNING" ? saveMutation.error : null} fallback="Unable to save risk" />
          <ApiErrorAlert error={selectedRiskQuery.error} fallback="Unable to load risk" />
          {isEditingRiskLoading ? <Loader /> : null}
          {!isEditingRiskLoading && (!editingRiskId || selectedRiskQuery.data) ? (
            <form onSubmit={form.onSubmit(() => saveMutation.mutate(undefined))}>
              <Stack>
                {orderedRiskFormFields.map((field) =>
                  field.kind === "core" ? (
                    renderCoreField({ fieldId: field.id, form, canManage, users: formConfig.users, formConfig, childActionsEnabled: flags.childActions })
                  ) : (
                    <CustomFieldInput
                      key={field.id}
                      field={field.field}
                      value={customValues[field.id]}
                      onChange={(value) => setCustomValues((current) => ({ ...current, [field.id]: value }))}
                      hasWarning={warningFieldIds.has(field.id)}
                      validationEnabled={validationEnabled}
                      calculatedPreview={field.field.fieldType === "CALCULATED" ? (calculatedPreviews[field.id] ?? null) : undefined}
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
