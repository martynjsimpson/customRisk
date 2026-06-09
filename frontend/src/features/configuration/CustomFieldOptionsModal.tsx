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
  editorOpened: boolean;
  selectedField: CustomFieldDefinition | null;
  options: CustomFieldOption[];
  editingOption: CustomFieldOption | null;
  readOnly?: boolean;
  loadError: unknown;
  createError: unknown;
  updateError: unknown;
  deactivateError: unknown;
  isSaving: boolean;
  onClose: () => void;
  onOpenCreate: () => void;
  onOpenEdit: (option: CustomFieldOption) => void;
  onCloseEditor: () => void;
  onSubmit: (values: OptionFormValues) => void;
  onActivate: (optionId: string) => void;
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
  editorOpened,
  selectedField,
  options,
  editingOption,
  readOnly,
  loadError,
  createError,
  updateError,
  deactivateError,
  isSaving,
  onClose,
  onOpenCreate,
  onOpenEdit,
  onCloseEditor,
  onSubmit,
  onActivate,
  onDeactivate
}: CustomFieldOptionsModalProps) {
  const nextDisplayOrder = (options.at(-1)?.displayOrder ?? 0) + 1;
  const form = useForm<OptionFormValues>({
    initialValues: createInitialValues(nextDisplayOrder)
  });

  useEffect(() => {
    if (!editorOpened) {
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
  // form is intentionally omitted — Mantine returns a new object reference each render,
  // which would retrigger this effect on every keystroke and reset the form values.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingOption, editorOpened, nextDisplayOrder]);

  return (
    <>
      <Modal
        opened={opened}
        onClose={onClose}
        title={selectedField ? `${selectedField.fieldName} options` : "Dropdown options"}
        size="880px"
      >
        <Stack>
          <ApiErrorAlert error={loadError} fallback="Unable to load dropdown options" />
          <ApiErrorAlert error={deactivateError} fallback="Unable to change dropdown option status" />
          <Group justify="space-between">
            <div />
            {!readOnly ? <Button onClick={onOpenCreate}>Add option</Button> : null}
          </Group>
          <Table.ScrollContainer minWidth={0}>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th w={80}>Order</Table.Th>
                  <Table.Th>Label</Table.Th>
                  <Table.Th w={110}>Status</Table.Th>
                  <Table.Th w={220} />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {options.map((option) => (
                  <Table.Tr key={option.id}>
                    <Table.Td>{option.displayOrder}</Table.Td>
                    <Table.Td style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}>{option.label}</Table.Td>
                    <Table.Td>
                      <Badge color={option.isActive ? "green" : "gray"}>
                        {option.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </Table.Td>
                    {readOnly ? <Table.Td /> : (
                      <Table.Td style={{ whiteSpace: "normal" }}>
                        <Group justify="flex-end" gap="xs" wrap="wrap">
                          <Button variant="subtle" onClick={() => onOpenEdit(option)}>
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
                          ) : (
                            <Button
                              color="green"
                              variant="subtle"
                              onClick={() => onActivate(option.id)}
                            >
                              Activate
                            </Button>
                          )}
                        </Group>
                      </Table.Td>
                    )}
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
          <Group justify="flex-end">
            <Button variant="subtle" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={onClose}>Save</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={editorOpened}
        onClose={onCloseEditor}
        title={editingOption ? "Edit option" : "Add option"}
        size="lg"
      >
        <Stack>
          <ApiErrorAlert error={createError} fallback="Unable to create dropdown option" />
          <ApiErrorAlert error={updateError} fallback="Unable to update dropdown option" />
          <form onSubmit={form.onSubmit(onSubmit)}>
            <Stack>
              <TextInput label="Option label" required disabled={readOnly} {...form.getInputProps("label")} />
              <NumberInput label="Display order" min={1} disabled={readOnly} {...form.getInputProps("displayOrder")} />
              <Checkbox label="Active" disabled={readOnly} {...form.getInputProps("isActive", { type: "checkbox" })} />
              <Group justify="flex-end">
                <Button type="button" variant="subtle" onClick={onCloseEditor}>
                  Cancel
                </Button>
                <Button type="submit" loading={isSaving} disabled={readOnly}>
                  Save option
                </Button>
              </Group>
            </Stack>
          </form>
        </Stack>
      </Modal>
    </>
  );
}
