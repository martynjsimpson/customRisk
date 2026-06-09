import { Button, Checkbox, Modal, MultiSelect, Select, Stack, Switch, Textarea, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useEffect } from "react";

import type { CustomFieldDefinition, CustomFieldType, RegisterRole, ValidationMode } from "../../api/customFields.api";
import { ApiErrorAlert } from "../../components/ApiErrorAlert";

interface CustomFieldFormValues {
  fieldName: string;
  fieldType: CustomFieldType;
  helpText: string;
  isRequired: boolean;
  validationMode: ValidationMode;
  isActive: boolean;
  initialOptionsText: string;
  formula: string;
  visibleToRoles: RegisterRole[];
  visibleToRiskResponseOwners: boolean;
}

interface CustomFieldModalProps {
  opened: boolean;
  editingField: CustomFieldDefinition | null;
  createError: unknown;
  updateError: unknown;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (values: CustomFieldFormValues) => void;
}

const fieldTypeOptions: Array<{ value: CustomFieldType; label: string }> = [
  { value: "TEXT", label: "Text" },
  { value: "MULTILINE_TEXT", label: "Multi-line text" },
  { value: "BOOLEAN", label: "Boolean" },
  { value: "NUMBER", label: "Number" },
  { value: "DATE", label: "Date" },
  { value: "DROPDOWN", label: "Dropdown" },
  { value: "PERSON_PICKER", label: "Person Picker" },
  { value: "MULTI_SELECT", label: "Multi-select" },
  { value: "CALCULATED", label: "Calculated" }
];

const visibilityOptions: Array<{ value: RegisterRole; label: string }> = [
  { value: "REGISTER_ADMIN", label: "Register Admin" },
  { value: "REGISTER_VIEWER", label: "Register Viewer" },
  { value: "RISK_OWNER", label: "Risk Owner" }
];

const validationModeOptions: Array<{ value: ValidationMode; label: string }> = [
  { value: "ALLOW", label: "Allow" },
  { value: "WARN", label: "Warn" },
  { value: "BLOCK", label: "Block" }
];

function createInitialValues(): CustomFieldFormValues {
  return {
    fieldName: "",
    fieldType: "TEXT",
    helpText: "",
    isRequired: false,
    validationMode: "ALLOW",
    isActive: true,
    initialOptionsText: "",
    formula: "",
    visibleToRoles: [],
    visibleToRiskResponseOwners: true
  };
}

export function parseInitialOptions(value: string) {
  return value
    .split("\n")
    .map((label) => label.trim())
    .filter(Boolean)
    .map((label, index) => ({ label, displayOrder: index + 1, isActive: true }));
}

export function CustomFieldModal({
  opened,
  editingField,
  createError,
  updateError,
  isSaving,
  onClose,
  onSubmit
}: CustomFieldModalProps) {
  const form = useForm<CustomFieldFormValues>({
    initialValues: createInitialValues()
  });

  useEffect(() => {
    if (!opened) {
      return;
    }

    if (editingField) {
      form.setValues({
        fieldName: editingField.fieldName,
        fieldType: editingField.fieldType,
        helpText: editingField.helpText ?? "",
        isRequired: editingField.isRequired,
        validationMode: editingField.validationMode,
        isActive: editingField.isActive,
        initialOptionsText: "",
        formula: editingField.formula ?? "",
        visibleToRoles: editingField.visibleToRoles ?? [],
        visibleToRiskResponseOwners: editingField.visibleToRiskResponseOwners ?? true
      });
      return;
    }

    form.setValues(createInitialValues());
  // form is intentionally omitted — Mantine returns a new object reference each render,
  // which would retrigger this effect on every keystroke and reset the form values.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingField, opened]);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={editingField ? "Edit custom field" : "Add custom field"}
    >
      <form onSubmit={form.onSubmit(onSubmit)}>
        <Stack>
          <ApiErrorAlert error={createError} fallback="Unable to create custom field" />
          <ApiErrorAlert error={updateError} fallback="Unable to update custom field" />
          <TextInput label="Field name" required {...form.getInputProps("fieldName")} />
          <Select
            label="Field type"
            data={fieldTypeOptions}
            disabled={Boolean(editingField)}
            {...form.getInputProps("fieldType")}
          />
          <Textarea label="Help text" {...form.getInputProps("helpText")} />
          {form.values.fieldType !== "CALCULATED" ? (
            <Checkbox label="Required" {...form.getInputProps("isRequired", { type: "checkbox" })} />
          ) : null}
          {form.values.fieldType !== "CALCULATED" ? (
            <Select
              label="Validation mode"
              description="Allow saves freely, warn on save, or block save until the field is filled."
              data={validationModeOptions}
              {...form.getInputProps("validationMode")}
            />
          ) : null}
          <Checkbox label="Active" {...form.getInputProps("isActive", { type: "checkbox" })} />
          {form.values.fieldType === "CALCULATED" ? (
            <Textarea
              label="Formula"
              description="Reference other fields with {field:uuid}. Supports +, -, *, / and round(), min(), max()."
              required
              autosize
              minRows={2}
              {...form.getInputProps("formula")}
            />
          ) : null}
          {!editingField && (form.values.fieldType === "DROPDOWN" || form.values.fieldType === "MULTI_SELECT") ? (
            <Textarea
              label="Initial options (one per line)"
              autosize
              minRows={3}
              {...form.getInputProps("initialOptionsText")}
            />
          ) : null}
          <MultiSelect
            label="Visible to roles"
            description="Leave empty to show to all roles. Admins always see all fields."
            data={visibilityOptions}
            {...form.getInputProps("visibleToRoles")}
          />
          <Switch
            label="Visible to Risk Response Owners"
            description="Controls whether Risk Response Owners can see this field on a linked parent risk."
            {...form.getInputProps("visibleToRiskResponseOwners", { type: "checkbox" })}
          />
          <Button type="submit" loading={isSaving}>
            Save
          </Button>
        </Stack>
      </form>
    </Modal>
  );
}
