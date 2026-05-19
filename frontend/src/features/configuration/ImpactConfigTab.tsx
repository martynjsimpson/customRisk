import { Badge, Button, Checkbox, Group, Modal, NumberInput, Stack, Table, Text, TextInput, Title } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  createImpactValue,
  deactivateImpactValue,
  updateImpactValue,
  type ImpactValue
} from "../../api/scoring.api";
import { getRegisterConfiguration } from "../../api/customFields.api";
import { ApiErrorAlert } from "../../components/ApiErrorAlert";
import { invalidateScoringConfiguration } from "./scoringConfigInvalidation";

interface ImpactConfigTabProps {
  registerId: string;
  draftConfigMode?: boolean;
}

export function ImpactConfigTab({ registerId, draftConfigMode }: ImpactConfigTabProps) {
  const queryClient = useQueryClient();
  const [impactModalOpen, setImpactModalOpen] = useState(false);
  const [editingImpact, setEditingImpact] = useState<ImpactValue | null>(null);
  const impactForm = useForm({
    initialValues: { name: "", numericValue: 1, displayOrder: 10, isActive: true }
  });

  const configQuery = useQuery({
    queryKey: ["register-config", registerId],
    queryFn: () => getRegisterConfiguration(registerId),
    enabled: Boolean(registerId)
  });

  const createImpactMutation = useMutation({
    mutationFn: () =>
      createImpactValue(registerId, {
        name: impactForm.values.name,
        numericValue: impactForm.values.numericValue,
        displayOrder: impactForm.values.displayOrder,
        isActive: impactForm.values.isActive
      }),
    onSuccess: async () => {
      setImpactModalOpen(false);
      impactForm.reset();
      await invalidateScoringConfiguration(queryClient, registerId);
    }
  });
  const updateImpactMutation = useMutation({
    mutationFn: () =>
      updateImpactValue(registerId, editingImpact!.id, {
        name: impactForm.values.name,
        numericValue: impactForm.values.numericValue,
        displayOrder: impactForm.values.displayOrder,
        isActive: impactForm.values.isActive
      }),
    onSuccess: async () => {
      setImpactModalOpen(false);
      setEditingImpact(null);
      await invalidateScoringConfiguration(queryClient, registerId);
    }
  });
  const deactivateImpactMutation = useMutation({
    mutationFn: (id: string) => deactivateImpactValue(registerId, id),
    onSuccess: async () => invalidateScoringConfiguration(queryClient, registerId)
  });
  const activateImpactMutation = useMutation({
    mutationFn: (id: string) => updateImpactValue(registerId, id, { isActive: true }),
    onSuccess: async () => invalidateScoringConfiguration(queryClient, registerId)
  });

  const impacts = configQuery.data?.impactValues ?? [];

  const openCreateImpact = () => {
    setEditingImpact(null);
    impactForm.setValues({ name: "", numericValue: 1, displayOrder: (impacts.at(-1)?.displayOrder ?? 0) + 10, isActive: true });
    setImpactModalOpen(true);
  };
  const openEditImpact = (value: ImpactValue) => {
    setEditingImpact(value);
    impactForm.setValues({
      name: value.name,
      numericValue: Number(value.numericValue),
      displayOrder: value.displayOrder,
      isActive: value.isActive
    });
    setImpactModalOpen(true);
  };

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={3}>Impact Values</Title>
        {!draftConfigMode ? <Button onClick={openCreateImpact}>Add impact</Button> : null}
      </Group>
      <ApiErrorAlert error={configQuery.error} fallback="Unable to load configuration" />
      <ApiErrorAlert error={deactivateImpactMutation.error} fallback="Unable to deactivate impact value" />
      <ApiErrorAlert error={activateImpactMutation.error} fallback="Unable to activate impact value" />
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
            {impacts.map((value) => (
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
                      <Button variant="subtle" onClick={() => openEditImpact(value)}>Edit</Button>
                      {value.isActive ? (
                        <Button color="red" variant="subtle" onClick={() => deactivateImpactMutation.mutate(value.id)}>
                          Deactivate
                        </Button>
                      ) : (
                        <Button variant="subtle" onClick={() => activateImpactMutation.mutate(value.id)}>
                          Activate
                        </Button>
                      )}
                    </Group>
                  </Table.Td>
                ) : <Table.Td />}
              </Table.Tr>
            ))}
            {impacts.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={5}><Text c="dimmed">No impact values configured</Text></Table.Td>
              </Table.Tr>
            ) : null}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>

      <Modal
        opened={impactModalOpen}
        onClose={() => setImpactModalOpen(false)}
        title={editingImpact ? "Edit impact value" : "Add impact value"}
      >
        <form
          onSubmit={impactForm.onSubmit(() => {
            if (editingImpact) {
              updateImpactMutation.mutate();
            } else {
              createImpactMutation.mutate();
            }
          })}
        >
          <Stack>
            <ApiErrorAlert error={createImpactMutation.error} fallback="Unable to create impact value" />
            <ApiErrorAlert error={updateImpactMutation.error} fallback="Unable to update impact value" />
            <TextInput label="Name" required {...impactForm.getInputProps("name")} />
            <NumberInput label="Numeric value" min={0} {...impactForm.getInputProps("numericValue")} />
            <NumberInput label="Display order" min={1} {...impactForm.getInputProps("displayOrder")} />
            <Checkbox label="Active" {...impactForm.getInputProps("isActive", { type: "checkbox" })} />
            <Button type="submit" loading={createImpactMutation.isPending || updateImpactMutation.isPending}>
              Save
            </Button>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
