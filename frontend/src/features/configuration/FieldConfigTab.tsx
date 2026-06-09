import { Button, Group, Modal, Stack, Text, Title } from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import {
  type CustomFieldDefinition,
  type CustomFieldOption,
  type CustomFieldUsage,
  type RegisterRole,
  deleteCustomField,
  getCustomFieldUsage,
  getRegisterConfiguration,
  listCustomFieldOptions,
  type SaveCustomFieldOptionInput
} from "../../api/customFields.api";
import { getConfigVersionStatus, updateDraftConfig } from "../../api/configVersion.api";
import { ApiErrorAlert } from "../../components/ApiErrorAlert";
import { usePermissions } from "../../hooks/usePermissions";
import { CORE_RISK_FIELDS } from "../risks/coreRiskFields";
import { CustomFieldModal, parseInitialOptions } from "./CustomFieldModal";
import { CustomFieldOptionsModal } from "./CustomFieldOptionsModal";
import { CustomFieldTable } from "./CustomFieldTable";
import { invalidateCustomFieldConfiguration } from "./customFieldConfigInvalidation";
import {
  activateCustomField,
  createCustomField,
  createCustomFieldOption,
  deactivateCustomField,
  deactivateCustomFieldOption,
  updateCustomField,
  updateCustomFieldOption
} from "../../api/customFields.api";

interface FieldConfigTabProps {
  registerId: string;
  draftConfigMode?: boolean;
}

export function FieldConfigTab({ registerId, draftConfigMode }: FieldConfigTabProps) {
  const queryClient = useQueryClient();
  const { isSystemAdmin } = usePermissions();
  const [fieldModalOpen, setFieldModalOpen] = useState(false);
  const [optionsModalOpen, setOptionsModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomFieldDefinition | null>(null);
  const [selectedField, setSelectedField] = useState<CustomFieldDefinition | null>(null);
  const [editingOption, setEditingOption] = useState<CustomFieldOption | null>(null);
  const [deleteConfirmField, setDeleteConfirmField] = useState<CustomFieldDefinition | null>(null);
  const [deleteFieldUsage, setDeleteFieldUsage] = useState<CustomFieldUsage | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);

  const configQuery = useQuery({
    queryKey: ["register-config", registerId],
    queryFn: () => getRegisterConfiguration(registerId),
    enabled: Boolean(registerId)
  });
  const statusQuery = useQuery({
    queryKey: ["config-version-status", registerId],
    queryFn: () => getConfigVersionStatus(registerId),
    enabled: Boolean(registerId) && Boolean(draftConfigMode)
  });
  const hasDraft = statusQuery.data?.hasDraft ?? false;
  const isReadOnly = Boolean(draftConfigMode) && !hasDraft;
  const optionsQuery = useQuery({
    queryKey: ["custom-field-options", registerId, selectedField?.id],
    queryFn: () => listCustomFieldOptions(registerId, selectedField!.id),
    enabled: Boolean(registerId) && Boolean(selectedField) && !hasDraft
  });

  const fields = useMemo(() => configQuery.data?.customFields ?? [], [configQuery.data?.customFields]);
  const maxCoreDisplayOrder = useMemo(
    () => CORE_RISK_FIELDS.reduce((maxOrder, field) => Math.max(maxOrder, field.displayOrder), 0),
    []
  );
  const nextFieldDisplayOrder = useMemo(
    () => Math.max(fields.reduce((maxOrder, field) => Math.max(maxOrder, field.displayOrder), 0), maxCoreDisplayOrder) + 10,
    [fields, maxCoreDisplayOrder]
  );
  const selectedFieldOptions = hasDraft ? (selectedField?.options ?? []) : (optionsQuery.data ?? []);

  useEffect(() => {
    if (!selectedField) {
      return;
    }

    const refreshedSelectedField = fields.find((field) => field.id === selectedField.id);
    if (!refreshedSelectedField) {
      setSelectedField(null);
      return;
    }

    if (refreshedSelectedField !== selectedField) {
      setSelectedField(refreshedSelectedField);
    }
  }, [fields, selectedField]);

  const buildDraftFields = (
    updater: (current: CustomFieldDefinition[]) => CustomFieldDefinition[]
  ) =>
    updater(fields).map((field) => ({
      id: field.id,
      fieldName: field.fieldName,
      fieldType: field.fieldType,
      helpText: field.helpText,
      isRequired: field.isRequired,
      displayOrder: field.displayOrder,
      isActive: field.isActive,
      visibleToRoles: field.visibleToRoles,
      visibleToRiskResponseOwners: field.visibleToRiskResponseOwners,
      options: field.options.map((option) => ({
        id: option.id,
        label: option.label,
        displayOrder: option.displayOrder,
        isActive: option.isActive
      }))
    }));

  const reorderFieldMutation = useMutation<unknown, Error, { fieldId: string; displayOrder: number }>({
    mutationFn: ({ fieldId, displayOrder }) =>
      hasDraft
        ? updateDraftConfig(registerId, {
            customFields: buildDraftFields((current) =>
              current
                .map((field) => (field.id === fieldId ? { ...field, displayOrder } : field))
                .sort((a, b) => a.displayOrder - b.displayOrder)
            )
          })
        : updateCustomField(registerId, fieldId, { displayOrder }),
    onSuccess: () => invalidateCustomFieldConfiguration(queryClient, registerId)
  });

  const createFieldMutation = useMutation<unknown, Error, {
    fieldName: string;
    fieldType: CustomFieldDefinition["fieldType"];
    helpText: string | null;
    isRequired: boolean;
    displayOrder: number;
    isActive: boolean;
    options?: Array<{ label: string; displayOrder: number; isActive?: boolean }>;
    formula?: string;
    visibleToRoles?: RegisterRole[];
    visibleToRiskResponseOwners?: boolean;
  }>({
    mutationFn: (values) => {
      const newFieldId = crypto.randomUUID();

      return hasDraft
        ? updateDraftConfig(registerId, {
            customFields: buildDraftFields((current) =>
              [
                ...current,
                {
                  id: newFieldId,
                  registerId,
                  fieldName: values.fieldName,
                  fieldType: values.fieldType,
                  helpText: values.helpText,
                  isRequired: values.isRequired,
                  displayOrder: values.displayOrder,
                  isActive: values.isActive,
                  formula: values.formula ?? null,
                  formulaDependencies: [],
                  visibleToRoles: values.visibleToRoles ?? [],
                  visibleToRiskResponseOwners: values.visibleToRiskResponseOwners ?? true,
                  options: (values.options ?? []).map((option) => ({
                    id: crypto.randomUUID(),
                    customFieldDefinitionId: newFieldId,
                    label: option.label,
                    displayOrder: option.displayOrder,
                    isActive: option.isActive ?? true
                  }))
                }
              ].sort((a, b) => a.displayOrder - b.displayOrder)
            )
          })
        : createCustomField(registerId, values);
    },
    onSuccess: async () => {
      setFieldModalOpen(false);
      await invalidateCustomFieldConfiguration(queryClient, registerId);
    }
  });
  const updateFieldMutation = useMutation<unknown, Error, {
    fieldId: string;
    values: {
      fieldName?: string;
      helpText?: string | null;
      isRequired?: boolean;
      isActive?: boolean;
      displayOrder?: number;
      formula?: string;
      visibleToRoles?: RegisterRole[];
      visibleToRiskResponseOwners?: boolean;
    };
  }>({
    mutationFn: ({
      fieldId,
      values
    }) =>
      hasDraft
        ? updateDraftConfig(registerId, {
            customFields: buildDraftFields((current) =>
              current
                .map((field) => (field.id === fieldId ? { ...field, ...values } : field))
                .sort((a, b) => a.displayOrder - b.displayOrder)
            )
          })
        : updateCustomField(registerId, fieldId, values),
    onSuccess: async () => {
      setFieldModalOpen(false);
      setEditingField(null);
      await invalidateCustomFieldConfiguration(queryClient, registerId);
    }
  });
  const activateFieldMutation = useMutation<unknown, Error, string>({
    mutationFn: (fieldId) =>
      hasDraft
        ? updateDraftConfig(registerId, {
            customFields: buildDraftFields((current) =>
              current.map((field) => (field.id === fieldId ? { ...field, isActive: true } : field))
            )
          })
        : activateCustomField(registerId, fieldId),
    onSuccess: () => invalidateCustomFieldConfiguration(queryClient, registerId)
  });
  const deactivateFieldMutation = useMutation<unknown, Error, string>({
    mutationFn: (fieldId) =>
      hasDraft
        ? updateDraftConfig(registerId, {
            customFields: buildDraftFields((current) =>
              current.map((field) => (field.id === fieldId ? { ...field, isActive: false } : field))
            )
          })
        : deactivateCustomField(registerId, fieldId),
    onSuccess: () => invalidateCustomFieldConfiguration(queryClient, registerId)
  });
  const createOptionMutation = useMutation<unknown, Error, {
    fieldId: string;
    values: SaveCustomFieldOptionInput;
  }>({
    mutationFn: ({
      fieldId,
      values
    }) =>
      hasDraft
        ? updateDraftConfig(registerId, {
            customFields: buildDraftFields((current) =>
              current.map((field) =>
                field.id === fieldId
                  ? {
                      ...field,
                      options: [
                        ...field.options,
                        {
                          id: crypto.randomUUID(),
                          customFieldDefinitionId: fieldId,
                          label: values.label,
                          displayOrder: values.displayOrder,
                          isActive: values.isActive
                        }
                      ].sort((a, b) => a.displayOrder - b.displayOrder)
                    }
                  : field
              )
            )
          })
        : createCustomFieldOption(registerId, fieldId, values),
    onSuccess: async () => {
      setEditingOption(null);
      await invalidateCustomFieldConfiguration(queryClient, registerId);
    }
  });
  const updateOptionMutation = useMutation<unknown, Error, {
    fieldId: string;
    optionId: string;
    values: Partial<SaveCustomFieldOptionInput>;
  }>({
    mutationFn: ({
      fieldId,
      optionId,
      values
    }) =>
      hasDraft
        ? updateDraftConfig(registerId, {
            customFields: buildDraftFields((current) =>
              current.map((field) =>
                field.id === fieldId
                  ? {
                      ...field,
                      options: field.options
                        .map((option) => (option.id === optionId ? { ...option, ...values } : option))
                        .sort((a, b) => a.displayOrder - b.displayOrder)
                    }
                  : field
              )
            )
          })
        : updateCustomFieldOption(registerId, fieldId, optionId, values),
    onSuccess: async () => {
      setEditingOption(null);
      await invalidateCustomFieldConfiguration(queryClient, registerId);
    }
  });
  const deactivateOptionMutation = useMutation<unknown, Error, { fieldId: string; optionId: string }>({
    mutationFn: ({ fieldId, optionId }) =>
      hasDraft
        ? updateDraftConfig(registerId, {
            customFields: buildDraftFields((current) =>
              current.map((field) =>
                field.id === fieldId
                  ? {
                      ...field,
                      options: field.options.map((option) =>
                        option.id === optionId ? { ...option, isActive: false } : option
                      )
                    }
                  : field
              )
            )
          })
        : deactivateCustomFieldOption(registerId, fieldId, optionId),
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

  const openDeleteConfirm = async (field: CustomFieldDefinition) => {
    setDeleteConfirmField(field);
    setDeleteFieldUsage(null);
    setLoadingUsage(true);
    try {
      const usage = await getCustomFieldUsage(registerId, field.id);
      setDeleteFieldUsage(usage);
    } finally {
      setLoadingUsage(false);
    }
  };

  const deleteFieldMutation = useMutation<unknown, Error, { fieldId: string; force: boolean }>({
    mutationFn: ({ fieldId, force }) => deleteCustomField(registerId, fieldId, force),
    onSuccess: async () => {
      setDeleteConfirmField(null);
      setDeleteFieldUsage(null);
      await invalidateCustomFieldConfiguration(queryClient, registerId);
    }
  });

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Field Configuration</Title>
        {!isReadOnly ? <Button onClick={openCreateField}>Add field</Button> : null}
      </Group>
      <ApiErrorAlert error={configQuery.error} fallback="Unable to load register configuration" />
      <ApiErrorAlert error={activateFieldMutation.error} fallback="Unable to activate field" />
      <ApiErrorAlert error={deactivateFieldMutation.error} fallback="Unable to deactivate field" />
      <ApiErrorAlert error={deleteFieldMutation.error} fallback="Unable to delete field" />
      <CustomFieldTable
        fields={fields}
        onReorder={(fieldId, newDisplayOrder) => reorderFieldMutation.mutate({ fieldId, displayOrder: newDisplayOrder })}
        onEditField={openEditField}
        onOpenOptions={openOptions}
        onActivateField={(fieldId) => activateFieldMutation.mutate(fieldId)}
        onDeactivateField={(fieldId) => deactivateFieldMutation.mutate(fieldId)}
        onDeleteField={isSystemAdmin ? openDeleteConfirm : undefined}
        isSystemAdmin={isSystemAdmin}
        readOnly={isReadOnly}
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
                isRequired: editingField.fieldType === "CALCULATED" ? false : values.isRequired,
                isActive: values.isActive,
                formula: editingField.fieldType === "CALCULATED" && values.formula ? values.formula : undefined,
                visibleToRoles: values.visibleToRoles,
                visibleToRiskResponseOwners: values.visibleToRiskResponseOwners
              }
            });
            return;
          }

          const isOptionsType = values.fieldType === "DROPDOWN" || values.fieldType === "MULTI_SELECT";
          createFieldMutation.mutate({
            fieldName: values.fieldName,
            fieldType: values.fieldType,
            helpText: values.helpText || null,
            isRequired: values.fieldType === "CALCULATED" ? false : values.isRequired,
            displayOrder: nextFieldDisplayOrder,
            isActive: values.isActive,
            options: isOptionsType ? parseInitialOptions(values.initialOptionsText) : undefined,
            formula: values.fieldType === "CALCULATED" && values.formula ? values.formula : undefined,
            visibleToRoles: values.visibleToRoles,
            visibleToRiskResponseOwners: values.visibleToRiskResponseOwners
          });
        }}
      />

      <CustomFieldOptionsModal
        opened={optionsModalOpen}
        selectedField={selectedField}
        options={selectedFieldOptions}
        editingOption={editingOption}
        readOnly={isReadOnly}
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
        onActivate={(optionId) => {
          if (!selectedField) {
            return;
          }

          updateOptionMutation.mutate({
            fieldId: selectedField.id,
            optionId,
            values: { isActive: true }
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

      <Modal
        opened={Boolean(deleteConfirmField)}
        onClose={() => {
          setDeleteConfirmField(null);
          setDeleteFieldUsage(null);
        }}
        title="Delete custom field"
      >
        <Stack>
          <ApiErrorAlert error={deleteFieldMutation.error} fallback="Unable to delete field" />
          {loadingUsage ? (
            <Text>Checking field usage…</Text>
          ) : deleteFieldUsage && deleteFieldUsage.totalValueCount > 0 ? (
            <Text>
              <strong>{deleteConfirmField?.fieldName}</strong> has {deleteFieldUsage.totalValueCount} value(s) across risks.
              Deleting this field will permanently remove all associated data. This cannot be undone.
            </Text>
          ) : (
            <Text>
              Permanently delete <strong>{deleteConfirmField?.fieldName}</strong>? This cannot be undone.
            </Text>
          )}
          <Group justify="flex-end">
            <Button
              variant="subtle"
              onClick={() => {
                setDeleteConfirmField(null);
                setDeleteFieldUsage(null);
              }}
            >
              Cancel
            </Button>
            <Button
              color="red"
              loading={deleteFieldMutation.isPending || loadingUsage}
              disabled={loadingUsage}
              onClick={() => {
                if (!deleteConfirmField) return;
                deleteFieldMutation.mutate({
                  fieldId: deleteConfirmField.id,
                  force: (deleteFieldUsage?.totalValueCount ?? 0) > 0
                });
              }}
            >
              {deleteFieldUsage && deleteFieldUsage.totalValueCount > 0 ? "Force delete" : "Delete"}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
