import { Badge, Button, Checkbox, Group, Modal, NumberInput, Stack, Table, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useEffect } from "react";

import type { CustomFieldDefinition, CustomFieldOption } from "../../api/customFields.api";
import { ApiErrorAlert } from "../../components/ApiErrorAlert";

interface OptionFormValues {
  label: string;
  displayOrder: number;
  isActive: boolean;
}

interface CustomFieldOptionsModalProps {
  opened: boolean;
  selectedField: CustomFieldDefinition | null;
  options: CustomFieldOption[];
  editingOption: CustomFieldOption | null;
  loadError: unknown;
  createError: unknown;
  updateError: unknown;
  deactivateError: unknown;
  isSaving: boolean;
  onClose: () => void;
  onEditOption: (option: CustomFieldOption | null) => void;
  onSubmit: (values: OptionFormValues) => void;
  onDeactivate: (optionId: string) => void;
}

function createInitialValues(nextDisplayOrder: number): OptionFormValues {
  return {
    label: "",
    displayOrder: nextDisplayOrder,
    isActive: true
  };
}

export function CustomFieldOptionsModal({
  opened,
  selectedField,
  options,
  editingOption,
  loadError,
  createError,
  updateError,
  deactivateError,
  isSaving,
  onClose,
  onEditOption,
  onSubmit,
  onDeactivate
}: CustomFieldOptionsModalProps) {
  const nextDisplayOrder = (options.at(-1)?.displayOrder ?? 0) + 1;
  const form = useForm<OptionFormValues>({
    initialValues: createInitialValues(nextDisplayOrder)
  });

  useEffect(() => {
    if (!opened) {
      return;
    }

    if (editingOption) {
      form.setValues({
        label: editingOption.label,
        displayOrder: editingOption.displayOrder,
        isActive: editingOption.isActive
      });
      return;
    }

    form.setValues(createInitialValues(nextDisplayOrder));
  }, [editingOption, form, nextDisplayOrder, opened]);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={selectedField ? `${selectedField.fieldName} options` : "Dropdown options"}
    >
      <Stack>
        <ApiErrorAlert error={loadError} fallback="Unable to load dropdown options" />
        <ApiErrorAlert error={createError} fallback="Unable to create dropdown option" />
        <ApiErrorAlert error={updateError} fallback="Unable to update dropdown option" />
        <ApiErrorAlert error={deactivateError} fallback="Unable to deactivate dropdown option" />
        <form onSubmit={form.onSubmit(onSubmit)}>
          <Stack>
            <TextInput label="Option label" required {...form.getInputProps("label")} />
            <NumberInput label="Display order" min={1} {...form.getInputProps("displayOrder")} />
            <Checkbox label="Active" {...form.getInputProps("isActive", { type: "checkbox" })} />
            <Group>
              <Button type="submit" loading={isSaving}>
                Save option
              </Button>
              {editingOption ? (
                <Button type="button" variant="subtle" onClick={() => onEditOption(null)}>
                  Cancel
                </Button>
              ) : null}
            </Group>
          </Stack>
        </form>
        <Table.ScrollContainer minWidth={640}>
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
              {options.map((option) => (
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
                      <Button variant="subtle" onClick={() => onEditOption(option)}>
                        Edit
                      </Button>
                      {option.isActive ? (
                        <Button
                          color="red"
                          variant="subtle"
                          onClick={() => onDeactivate(option.id)}
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
        </Table.ScrollContainer>
      </Stack>
    </Modal>
  );
}
