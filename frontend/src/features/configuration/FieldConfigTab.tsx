import { Button, Group, Stack, Title } from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import {
  activateCustomField,
  createCustomField,
  createCustomFieldOption,
  deactivateCustomField,
  deactivateCustomFieldOption,
  getRegisterConfiguration,
  listCustomFieldOptions,
  updateCustomField,
  updateCustomFieldOption,
  type CustomFieldDefinition,
  type CustomFieldOption
} from "../../api/customFields.api";
import { ApiErrorAlert } from "../../components/ApiErrorAlert";
import { CustomFieldModal, parseInitialOptions } from "./CustomFieldModal";
import { CustomFieldOptionsModal } from "./CustomFieldOptionsModal";
import { CustomFieldTable } from "./CustomFieldTable";
import { invalidateCustomFieldConfiguration } from "./customFieldConfigInvalidation";

interface FieldConfigTabProps {
  registerId: string;
}

export function FieldConfigTab({ registerId }: FieldConfigTabProps) {
  const queryClient = useQueryClient();
  const [fieldModalOpen, setFieldModalOpen] = useState(false);
  const [optionsModalOpen, setOptionsModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomFieldDefinition | null>(null);
  const [selectedField, setSelectedField] = useState<CustomFieldDefinition | null>(null);
  const [editingOption, setEditingOption] = useState<CustomFieldOption | null>(null);

  const configQuery = useQuery({
    queryKey: ["register-config", registerId],
    queryFn: () => getRegisterConfiguration(registerId),
    enabled: Boolean(registerId)
  });
  const optionsQuery = useQuery({
    queryKey: ["custom-field-options", registerId, selectedField?.id],
    queryFn: () => listCustomFieldOptions(registerId, selectedField!.id),
    enabled: Boolean(registerId) && Boolean(selectedField)
  });

  const fields = useMemo(() => configQuery.data?.customFields ?? [], [configQuery.data?.customFields]);
  const nextFieldDisplayOrder = useMemo(
    () => (fields.reduce((maxOrder, field) => Math.max(maxOrder, field.displayOrder), 0) || 0) + 10,
    [fields]
  );
  const selectedFieldOptions = optionsQuery.data ?? [];

  const reorderFieldMutation = useMutation({
    mutationFn: ({ fieldId, displayOrder }: { fieldId: string; displayOrder: number }) =>
      updateCustomField(registerId, fieldId, { displayOrder }),
    onSuccess: () => invalidateCustomFieldConfiguration(queryClient, registerId)
  });

  const createFieldMutation = useMutation({
    mutationFn: (values: Parameters<typeof createCustomField>[1]) => createCustomField(registerId, values),
    onSuccess: async () => {
      setFieldModalOpen(false);
      await invalidateCustomFieldConfiguration(queryClient, registerId);
    }
  });
  const updateFieldMutation = useMutation({
    mutationFn: ({
      fieldId,
      values
    }: {
      fieldId: string;
      values: Parameters<typeof updateCustomField>[2];
    }) => updateCustomField(registerId, fieldId, values),
    onSuccess: async () => {
      setFieldModalOpen(false);
      setEditingField(null);
      await invalidateCustomFieldConfiguration(queryClient, registerId);
    }
  });
  const activateFieldMutation = useMutation({
    mutationFn: (fieldId: string) => activateCustomField(registerId, fieldId),
    onSuccess: () => invalidateCustomFieldConfiguration(queryClient, registerId)
  });
  const deactivateFieldMutation = useMutation({
    mutationFn: (fieldId: string) => deactivateCustomField(registerId, fieldId),
    onSuccess: () => invalidateCustomFieldConfiguration(queryClient, registerId)
  });
  const createOptionMutation = useMutation({
    mutationFn: ({
      fieldId,
      values
    }: {
      fieldId: string;
      values: Parameters<typeof createCustomFieldOption>[2];
    }) => createCustomFieldOption(registerId, fieldId, values),
    onSuccess: async () => {
      setEditingOption(null);
      await invalidateCustomFieldConfiguration(queryClient, registerId);
    }
  });
  const updateOptionMutation = useMutation({
    mutationFn: ({
      fieldId,
      optionId,
      values
    }: {
      fieldId: string;
      optionId: string;
      values: Parameters<typeof updateCustomFieldOption>[3];
    }) => updateCustomFieldOption(registerId, fieldId, optionId, values),
    onSuccess: async () => {
      setEditingOption(null);
      await invalidateCustomFieldConfiguration(queryClient, registerId);
    }
  });
  const deactivateOptionMutation = useMutation({
    mutationFn: ({ fieldId, optionId }: { fieldId: string; optionId: string }) =>
      deactivateCustomFieldOption(registerId, fieldId, optionId),
    onSuccess: () => invalidateCustomFieldConfiguration(queryClient, registerId)
  });

  const openCreateField = () => {
    setEditingField(null);
    setFieldModalOpen(true);
  };

  const openEditField = (field: CustomFieldDefinition) => {
    setEditingField(field);
    setFieldModalOpen(true);
  };

  const openOptions = (field: CustomFieldDefinition) => {
    setSelectedField(field);
    setEditingOption(null);
    setOptionsModalOpen(true);
  };

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Field Configuration</Title>
        <Button onClick={openCreateField}>Add field</Button>
      </Group>
      <ApiErrorAlert error={configQuery.error} fallback="Unable to load register configuration" />
      <ApiErrorAlert error={activateFieldMutation.error} fallback="Unable to activate field" />
      <ApiErrorAlert error={deactivateFieldMutation.error} fallback="Unable to deactivate field" />
      <CustomFieldTable
        fields={fields}
        onReorder={(fieldId, newDisplayOrder) => reorderFieldMutation.mutate({ fieldId, displayOrder: newDisplayOrder })}
        onEditField={openEditField}
        onOpenOptions={openOptions}
        onActivateField={(fieldId) => activateFieldMutation.mutate(fieldId)}
        onDeactivateField={(fieldId) => deactivateFieldMutation.mutate(fieldId)}
      />

      <CustomFieldModal
        opened={fieldModalOpen}
        editingField={editingField}
        createError={createFieldMutation.error}
        updateError={updateFieldMutation.error}
        isSaving={createFieldMutation.isPending || updateFieldMutation.isPending}
        onClose={() => {
          setFieldModalOpen(false);
          setEditingField(null);
        }}
        onSubmit={(values) => {
          if (editingField) {
            updateFieldMutation.mutate({
              fieldId: editingField.id,
              values: {
                fieldName: values.fieldName,
                helpText: values.helpText || null,
                isRequired: values.isRequired,
                isActive: values.isActive
              }
            });
            return;
          }

          createFieldMutation.mutate({
            fieldName: values.fieldName,
            fieldType: values.fieldType,
            helpText: values.helpText || null,
            isRequired: values.isRequired,
            displayOrder: nextFieldDisplayOrder,
            isActive: values.isActive,
            options: values.fieldType === "DROPDOWN" ? parseInitialOptions(values.initialOptionsText) : undefined
          });
        }}
      />

      <CustomFieldOptionsModal
        opened={optionsModalOpen}
        selectedField={selectedField}
        options={selectedFieldOptions}
        editingOption={editingOption}
        loadError={optionsQuery.error}
        createError={createOptionMutation.error}
        updateError={updateOptionMutation.error}
        deactivateError={deactivateOptionMutation.error}
        isSaving={createOptionMutation.isPending || updateOptionMutation.isPending}
        onClose={() => {
          setOptionsModalOpen(false);
          setSelectedField(null);
          setEditingOption(null);
        }}
        onEditOption={setEditingOption}
        onSubmit={(values) => {
          if (!selectedField) {
            return;
          }

          if (editingOption) {
            updateOptionMutation.mutate({
              fieldId: selectedField.id,
              optionId: editingOption.id,
              values
            });
            return;
          }

          createOptionMutation.mutate({
            fieldId: selectedField.id,
            values
          });
        }}
        onDeactivate={(optionId) => {
          if (!selectedField) {
            return;
          }

          deactivateOptionMutation.mutate({
            fieldId: selectedField.id,
            optionId
          });
        }}
      />
    </Stack>
  );
}
