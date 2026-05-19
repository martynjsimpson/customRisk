import { Badge, Button, Checkbox, Group, Loader, Modal, NumberInput, Stack, Table, Text, TextInput, Title } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { getRegisterConfiguration, type RegisterConfigurationBundle } from "../../api/customFields.api";
import { ApiErrorAlert } from "../../components/ApiErrorAlert";
import { invalidateScoringConfiguration } from "./scoringConfigInvalidation";

interface ScoringValueConfigTabProps<TValue extends ScoringValueRecord> {
  registerId: string;
  draftConfigMode?: boolean;
  labels: {
    title: string;
    addButton: string;
    createModalTitle: string;
    editModalTitle: string;
    emptyState: string;
    loadError: string;
    createError: string;
    updateError: string;
    deactivateError: string;
    activateError: string;
  };
  selectValues: (config: RegisterConfigurationBundle) => TValue[];
  createValue: (registerId: string, input: ScoringValueMutationInput) => Promise<unknown>;
  updateValue: (registerId: string, valueId: string, input: Partial<ScoringValueMutationInput>) => Promise<unknown>;
  deactivateValue: (registerId: string, valueId: string) => Promise<unknown>;
}

interface ScoringValueFormValues {
  name: string;
  numericValue: number;
  displayOrder: number;
  isActive: boolean;
}

interface ScoringValueRecord {
  id: string;
  name: string;
  numericValue: string;
  displayOrder: number;
  isActive: boolean;
}

interface ScoringValueMutationInput {
  name: string;
  numericValue: number;
  displayOrder: number;
  isActive: boolean;
}

export function ScoringValueConfigTab<TValue extends ScoringValueRecord>({
  registerId,
  draftConfigMode,
  labels,
  selectValues,
  createValue,
  updateValue,
  deactivateValue
}: ScoringValueConfigTabProps<TValue>) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingValue, setEditingValue] = useState<TValue | null>(null);
  const form = useForm<ScoringValueFormValues>({
    initialValues: { name: "", numericValue: 1, displayOrder: 10, isActive: true }
  });

  const configQuery = useQuery({
    queryKey: ["register-config", registerId],
    queryFn: () => getRegisterConfiguration(registerId),
    enabled: Boolean(registerId)
  });

  const values = configQuery.data ? selectValues(configQuery.data) : [];

  const createValueMutation = useMutation({
    mutationFn: () => createValue(registerId, form.values),
    onSuccess: async () => {
      setModalOpen(false);
      form.reset();
      await invalidateScoringConfiguration(queryClient, registerId);
    }
  });
  const updateValueMutation = useMutation({
    mutationFn: () => updateValue(registerId, editingValue!.id, form.values),
    onSuccess: async () => {
      setModalOpen(false);
      setEditingValue(null);
      await invalidateScoringConfiguration(queryClient, registerId);
    }
  });
  const deactivateValueMutation = useMutation({
    mutationFn: (id: string) => deactivateValue(registerId, id),
    onSuccess: async () => invalidateScoringConfiguration(queryClient, registerId)
  });
  const activateValueMutation = useMutation({
    mutationFn: (id: string) => updateValue(registerId, id, { isActive: true }),
    onSuccess: async () => invalidateScoringConfiguration(queryClient, registerId)
  });

  const openCreateModal = () => {
    setEditingValue(null);
    form.setValues({
      name: "",
      numericValue: 1,
      displayOrder: (values.at(-1)?.displayOrder ?? 0) + 10,
      isActive: true
    });
    setModalOpen(true);
  };

  const openEditModal = (value: TValue) => {
    setEditingValue(value);
    form.setValues({
      name: value.name,
      numericValue: Number(value.numericValue),
      displayOrder: value.displayOrder,
      isActive: value.isActive
    });
    setModalOpen(true);
  };

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={3}>{labels.title}</Title>
        {!draftConfigMode ? <Button onClick={openCreateModal}>{labels.addButton}</Button> : null}
      </Group>
      <ApiErrorAlert error={configQuery.error} fallback={labels.loadError} />
      <ApiErrorAlert error={deactivateValueMutation.error} fallback={labels.deactivateError} />
      <ApiErrorAlert error={activateValueMutation.error} fallback={labels.activateError} />
      {configQuery.isLoading && !configQuery.data ? (
        <Group justify="center" py="md">
          <Loader size="sm" />
        </Group>
      ) : (
        <Table.ScrollContainer minWidth={720}>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Order</Table.Th>
                <Table.Th>Name</Table.Th>
                <Table.Th>Numeric value</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {values.map((value) => (
                <Table.Tr key={value.id}>
                  <Table.Td>{value.displayOrder}</Table.Td>
                  <Table.Td>{value.name}</Table.Td>
                  <Table.Td>{value.numericValue}</Table.Td>
                  <Table.Td>
                    <Badge color={value.isActive ? "green" : "gray"}>
                      {value.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </Table.Td>
                  {!draftConfigMode ? (
                    <Table.Td>
                      <Group justify="flex-end" gap="xs">
                        <Button variant="subtle" onClick={() => openEditModal(value)}>Edit</Button>
                        {value.isActive ? (
                          <Button color="red" variant="subtle" onClick={() => deactivateValueMutation.mutate(value.id)}>
                            Deactivate
                          </Button>
                        ) : (
                          <Button variant="subtle" onClick={() => activateValueMutation.mutate(value.id)}>
                            Activate
                          </Button>
                        )}
                      </Group>
                    </Table.Td>
                  ) : <Table.Td />}
                </Table.Tr>
              ))}
              {values.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={5}><Text c="dimmed">{labels.emptyState}</Text></Table.Td>
                </Table.Tr>
              ) : null}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}

      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingValue ? labels.editModalTitle : labels.createModalTitle}
      >
        <form
          onSubmit={form.onSubmit(() => {
            if (editingValue) {
              updateValueMutation.mutate();
            } else {
              createValueMutation.mutate();
            }
          })}
        >
          <Stack>
            <ApiErrorAlert error={createValueMutation.error} fallback={labels.createError} />
            <ApiErrorAlert error={updateValueMutation.error} fallback={labels.updateError} />
            <TextInput label="Name" required {...form.getInputProps("name")} />
            <NumberInput label="Numeric value" min={0} {...form.getInputProps("numericValue")} />
            <NumberInput label="Display order" min={1} {...form.getInputProps("displayOrder")} />
            <Checkbox label="Active" {...form.getInputProps("isActive", { type: "checkbox" })} />
            <Button type="submit" loading={createValueMutation.isPending || updateValueMutation.isPending}>
              Save
            </Button>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
