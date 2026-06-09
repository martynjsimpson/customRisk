import { Button, Checkbox, Modal, Select, Stack, Textarea, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useEffect } from "react";

import type { CustomFieldDefinition, CustomFieldType } from "../../api/customFields.api";
import { ApiErrorAlert } from "../../components/ApiErrorAlert";

interface CustomFieldFormValues {
  fieldName: string;
  fieldType: CustomFieldType;
  helpText: string;
  isRequired: boolean;
  isActive: boolean;
  initialOptionsText: string;
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
  { value: "MULTI_SELECT", label: "Multi-select" }
];

function createInitialValues(): CustomFieldFormValues {
  return {
    fieldName: "",
    fieldType: "TEXT",
    helpText: "",
    isRequired: false,
    isActive: true,
    initialOptionsText: ""
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
        isActive: editingField.isActive,
        initialOptionsText: ""
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
          <Checkbox label="Required" {...form.getInputProps("isRequired", { type: "checkbox" })} />
          <Checkbox label="Active" {...form.getInputProps("isActive", { type: "checkbox" })} />
          {!editingField && (form.values.fieldType === "DROPDOWN" || form.values.fieldType === "MULTI_SELECT") ? (
            <Textarea
              label="Initial options (one per line)"
              autosize
              minRows={3}
              {...form.getInputProps("initialOptionsText")}
            />
          ) : null}
          <Button type="submit" loading={isSaving}>
            Save
          </Button>
        </Stack>
      </form>
    </Modal>
  );
}
