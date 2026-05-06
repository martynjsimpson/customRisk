import {
  Badge,
  Button,
  Checkbox,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  Table,
  Tabs,
  Textarea,
  TextInput,
  Title
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

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
  type CustomFieldOption,
  type CustomFieldType
} from "../../api/configuration.api";
import { ApiErrorAlert } from "../../components/ApiErrorAlert";
import { CORE_RISK_FIELDS } from "../risks/coreRiskFields";
import { ScoringConfigurationPanel } from "./ScoringConfigurationPanel";

interface RegisterConfigurationPanelProps {
  registerId: string;
}

const fieldTypeOptions: Array<{ value: CustomFieldType; label: string }> = [
  { value: "TEXT", label: "Text" },
  { value: "MULTILINE_TEXT", label: "Multi-line text" },
  { value: "BOOLEAN", label: "Boolean" },
  { value: "NUMBER", label: "Number" },
  { value: "DATE", label: "Date" },
  { value: "DROPDOWN", label: "Dropdown" },
  { value: "PERSON_PICKER", label: "Person Picker" }
];

function parseInitialOptions(value: string) {
  return value
    .split("\n")
    .map((label) => label.trim())
    .filter(Boolean)
    .map((label, index) => ({ label, displayOrder: index + 1, isActive: true }));
}

export function RegisterConfigurationPanel({ registerId }: RegisterConfigurationPanelProps) {
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

  const fieldForm = useForm({
    initialValues: {
      fieldName: "",
      fieldType: "TEXT" as CustomFieldType,
      helpText: "",
      isRequired: false,
      displayOrder: 10,
      isActive: true,
      initialOptionsText: ""
    }
  });
  const optionForm = useForm({
    initialValues: {
      label: "",
      displayOrder: 1,
      isActive: true
    }
  });

  const invalidateConfiguration = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["register-config", registerId] }),
      queryClient.invalidateQueries({ queryKey: ["risk-form-config", registerId] }),
      queryClient.invalidateQueries({ queryKey: ["custom-field-options", registerId] })
    ]);
  };

  const createFieldMutation = useMutation({
    mutationFn: () =>
      createCustomField(registerId, {
        fieldName: fieldForm.values.fieldName,
        fieldType: fieldForm.values.fieldType,
        helpText: fieldForm.values.helpText || null,
        isRequired: fieldForm.values.isRequired,
        displayOrder: fieldForm.values.displayOrder,
        isActive: fieldForm.values.isActive,
        options:
          fieldForm.values.fieldType === "DROPDOWN"
            ? parseInitialOptions(fieldForm.values.initialOptionsText)
            : undefined
      }),
    onSuccess: async () => {
      setFieldModalOpen(false);
      fieldForm.reset();
      await invalidateConfiguration();
    }
  });
  const updateFieldMutation = useMutation({
    mutationFn: () =>
      updateCustomField(registerId, editingField!.id, {
        fieldName: fieldForm.values.fieldName,
        helpText: fieldForm.values.helpText || null,
        isRequired: fieldForm.values.isRequired,
        displayOrder: fieldForm.values.displayOrder,
        isActive: fieldForm.values.isActive
      }),
    onSuccess: async () => {
      setFieldModalOpen(false);
      setEditingField(null);
      await invalidateConfiguration();
    }
  });
  const activateFieldMutation = useMutation({
    mutationFn: (fieldId: string) => activateCustomField(registerId, fieldId),
    onSuccess: invalidateConfiguration
  });
  const deactivateFieldMutation = useMutation({
    mutationFn: (fieldId: string) => deactivateCustomField(registerId, fieldId),
    onSuccess: invalidateConfiguration
  });
  const createOptionMutation = useMutation({
    mutationFn: () => createCustomFieldOption(registerId, selectedField!.id, optionForm.values),
    onSuccess: async () => {
      optionForm.reset();
      await invalidateConfiguration();
    }
  });
  const updateOptionMutation = useMutation({
    mutationFn: () =>
      updateCustomFieldOption(registerId, selectedField!.id, editingOption!.id, optionForm.values),
    onSuccess: async () => {
      setEditingOption(null);
      optionForm.reset();
      await invalidateConfiguration();
    }
  });
  const deactivateOptionMutation = useMutation({
    mutationFn: (optionId: string) => deactivateCustomFieldOption(registerId, selectedField!.id, optionId),
    onSuccess: invalidateConfiguration
  });

  const fields = useMemo(
    () => configQuery.data?.customFields ?? [],
    [configQuery.data?.customFields]
  );
  const orderedFieldRows = useMemo(
    () =>
      [
        ...CORE_RISK_FIELDS.map((field) => ({
          ...field,
          kind: "core" as const,
          isActive: true
        })),
        ...fields.map((field) => ({
          ...field,
          kind: "custom" as const,
          fieldTypeLabel: fieldTypeOptions.find((option) => option.value === field.fieldType)?.label ?? field.fieldType
        }))
      ].sort((left, right) => left.displayOrder - right.displayOrder || left.fieldName.localeCompare(right.fieldName)),
    [fields]
  );

  const openCreateField = () => {
    setEditingField(null);
    fieldForm.setValues({
      fieldName: "",
      fieldType: "TEXT",
      helpText: "",
      isRequired: false,
      displayOrder: (orderedFieldRows.at(-1)?.displayOrder ?? 0) + 10,
      isActive: true,
      initialOptionsText: ""
    });
    setFieldModalOpen(true);
  };

  const openEditField = (field: CustomFieldDefinition) => {
    setEditingField(field);
    fieldForm.setValues({
      fieldName: field.fieldName,
      fieldType: field.fieldType,
      helpText: field.helpText ?? "",
      isRequired: field.isRequired,
      displayOrder: field.displayOrder,
      isActive: field.isActive,
      initialOptionsText: ""
    });
    setFieldModalOpen(true);
  };

  const openOptions = (field: CustomFieldDefinition) => {
    setSelectedField(field);
    setEditingOption(null);
    optionForm.setValues({ label: "", displayOrder: (field.options.at(-1)?.displayOrder ?? 0) + 1, isActive: true });
    setOptionsModalOpen(true);
  };

  useEffect(() => {
    if (!editingOption) {
      return;
    }
    optionForm.setValues({
      label: editingOption.label,
      displayOrder: editingOption.displayOrder,
      isActive: editingOption.isActive
    });
  }, [editingOption]);

  return (
    <Tabs defaultValue="fields">
      <Tabs.List>
        <Tabs.Tab value="fields">Fields</Tabs.Tab>
        <Tabs.Tab value="scoring">Scoring</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="scoring" pt="md">
        <ScoringConfigurationPanel registerId={registerId} />
      </Tabs.Panel>
      <Tabs.Panel value="fields" pt="md">
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Field Configuration</Title>
        <Button onClick={openCreateField}>Add field</Button>
      </Group>
      <ApiErrorAlert error={configQuery.error} fallback="Unable to load register configuration" />
      <ApiErrorAlert error={activateFieldMutation.error} fallback="Unable to activate field" />
      <ApiErrorAlert error={deactivateFieldMutation.error} fallback="Unable to deactivate field" />
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Order</Table.Th>
            <Table.Th>Name</Table.Th>
            <Table.Th>Type</Table.Th>
            <Table.Th>Required</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {orderedFieldRows.map((field) => (
            <Table.Tr key={field.id}>
              <Table.Td>{field.displayOrder}</Table.Td>
              <Table.Td>{field.fieldName}</Table.Td>
              <Table.Td>{field.kind === "core" ? field.fieldType : field.fieldTypeLabel}</Table.Td>
              <Table.Td>{field.isRequired ? "Yes" : "No"}</Table.Td>
              <Table.Td>
                <Badge color={field.kind === "core" ? "blue" : field.isActive ? "green" : "gray"}>
                  {field.kind === "core" ? "Core" : field.isActive ? "Active" : "Inactive"}
                </Badge>
              </Table.Td>
              <Table.Td>
                <Group justify="flex-end" gap="xs">
                  {field.kind === "custom" && field.fieldType === "DROPDOWN" ? (
                    <Button variant="subtle" onClick={() => openOptions(field)}>
                      Options
                    </Button>
                  ) : null}
                  {field.kind === "custom" ? (
                    <Button variant="subtle" onClick={() => openEditField(field)}>
                      Edit
                    </Button>
                  ) : null}
                  {field.kind === "custom" ? (
                    field.isActive ? (
                      <Button color="red" variant="subtle" onClick={() => deactivateFieldMutation.mutate(field.id)}>
                        Deactivate
                      </Button>
                    ) : (
                      <Button variant="subtle" onClick={() => activateFieldMutation.mutate(field.id)}>
                        Activate
                      </Button>
                    )
                  ) : null}
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <Modal
        opened={fieldModalOpen}
        onClose={() => setFieldModalOpen(false)}
        title={editingField ? "Edit custom field" : "Add custom field"}
      >
        <form
          onSubmit={fieldForm.onSubmit(() => {
            if (editingField) {
              updateFieldMutation.mutate();
            } else {
              createFieldMutation.mutate();
            }
          })}
        >
          <Stack>
            <ApiErrorAlert error={createFieldMutation.error} fallback="Unable to create custom field" />
            <ApiErrorAlert error={updateFieldMutation.error} fallback="Unable to update custom field" />
            <TextInput label="Field name" required {...fieldForm.getInputProps("fieldName")} />
            <Select
              label="Field type"
              data={fieldTypeOptions}
              disabled={Boolean(editingField)}
              {...fieldForm.getInputProps("fieldType")}
            />
            <Textarea label="Help text" {...fieldForm.getInputProps("helpText")} />
            <NumberInput label="Display order" min={1} {...fieldForm.getInputProps("displayOrder")} />
            <Checkbox label="Required" {...fieldForm.getInputProps("isRequired", { type: "checkbox" })} />
            <Checkbox label="Active" {...fieldForm.getInputProps("isActive", { type: "checkbox" })} />
            {!editingField && fieldForm.values.fieldType === "DROPDOWN" ? (
              <Textarea
                label="Initial dropdown options"
                autosize
                minRows={3}
                {...fieldForm.getInputProps("initialOptionsText")}
              />
            ) : null}
            <Button type="submit" loading={createFieldMutation.isPending || updateFieldMutation.isPending}>
              Save
            </Button>
          </Stack>
        </form>
      </Modal>

      <Modal
        opened={optionsModalOpen}
        onClose={() => setOptionsModalOpen(false)}
        title={selectedField ? `${selectedField.fieldName} options` : "Dropdown options"}
      >
        <Stack>
          <ApiErrorAlert error={optionsQuery.error} fallback="Unable to load dropdown options" />
          <ApiErrorAlert error={createOptionMutation.error} fallback="Unable to create dropdown option" />
          <ApiErrorAlert error={updateOptionMutation.error} fallback="Unable to update dropdown option" />
          <ApiErrorAlert error={deactivateOptionMutation.error} fallback="Unable to deactivate dropdown option" />
          <form
            onSubmit={optionForm.onSubmit(() => {
              if (editingOption) {
                updateOptionMutation.mutate();
              } else {
                createOptionMutation.mutate();
              }
            })}
          >
            <Stack>
              <TextInput label="Option label" required {...optionForm.getInputProps("label")} />
              <NumberInput label="Display order" min={1} {...optionForm.getInputProps("displayOrder")} />
              <Checkbox label="Active" {...optionForm.getInputProps("isActive", { type: "checkbox" })} />
              <Group>
                <Button type="submit" loading={createOptionMutation.isPending || updateOptionMutation.isPending}>
                  Save option
                </Button>
                {editingOption ? (
                  <Button variant="subtle" onClick={() => setEditingOption(null)}>
                    Cancel
                  </Button>
                ) : null}
              </Group>
            </Stack>
          </form>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Order</Table.Th>
                <Table.Th>Label</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(optionsQuery.data ?? []).map((option) => (
                <Table.Tr key={option.id}>
                  <Table.Td>{option.displayOrder}</Table.Td>
                  <Table.Td>{option.label}</Table.Td>
                  <Table.Td>
                    <Badge color={option.isActive ? "green" : "gray"}>
                      {option.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Group justify="flex-end" gap="xs">
                      <Button variant="subtle" onClick={() => setEditingOption(option)}>
                        Edit
                      </Button>
                      {option.isActive ? (
                        <Button
                          color="red"
                          variant="subtle"
                          onClick={() => deactivateOptionMutation.mutate(option.id)}
                        >
                          Deactivate
                        </Button>
                      ) : null}
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Stack>
      </Modal>
    </Stack>
      </Tabs.Panel>
    </Tabs>
  );
}
