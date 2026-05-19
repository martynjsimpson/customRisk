import { Badge, Button, Checkbox, Group, Modal, NumberInput, Stack, Table, Text, TextInput, Title } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  createLikelihoodValue,
  deactivateLikelihoodValue,
  updateLikelihoodValue,
  type LikelihoodValue
} from "../../api/scoring.api";
import { getRegisterConfiguration } from "../../api/customFields.api";
import { ApiErrorAlert } from "../../components/ApiErrorAlert";
import { invalidateScoringConfiguration } from "./scoringConfigInvalidation";

interface LikelihoodConfigTabProps {
  registerId: string;
  draftConfigMode?: boolean;
}

export function LikelihoodConfigTab({ registerId, draftConfigMode }: LikelihoodConfigTabProps) {
  const queryClient = useQueryClient();
  const [likelihoodModalOpen, setLikelihoodModalOpen] = useState(false);
  const [editingLikelihood, setEditingLikelihood] = useState<LikelihoodValue | null>(null);
  const likelihoodForm = useForm({
    initialValues: { name: "", numericValue: 1, displayOrder: 10, isActive: true }
  });

  const configQuery = useQuery({
    queryKey: ["register-config", registerId],
    queryFn: () => getRegisterConfiguration(registerId),
    enabled: Boolean(registerId)
  });

  const createLikelihoodMutation = useMutation({
    mutationFn: () =>
      createLikelihoodValue(registerId, {
        name: likelihoodForm.values.name,
        numericValue: likelihoodForm.values.numericValue,
        displayOrder: likelihoodForm.values.displayOrder,
        isActive: likelihoodForm.values.isActive
      }),
    onSuccess: async () => {
      setLikelihoodModalOpen(false);
      likelihoodForm.reset();
      await invalidateScoringConfiguration(queryClient, registerId);
    }
  });
  const updateLikelihoodMutation = useMutation({
    mutationFn: () =>
      updateLikelihoodValue(registerId, editingLikelihood!.id, {
        name: likelihoodForm.values.name,
        numericValue: likelihoodForm.values.numericValue,
        displayOrder: likelihoodForm.values.displayOrder,
        isActive: likelihoodForm.values.isActive
      }),
    onSuccess: async () => {
      setLikelihoodModalOpen(false);
      setEditingLikelihood(null);
      await invalidateScoringConfiguration(queryClient, registerId);
    }
  });
  const deactivateLikelihoodMutation = useMutation({
    mutationFn: (id: string) => deactivateLikelihoodValue(registerId, id),
    onSuccess: async () => invalidateScoringConfiguration(queryClient, registerId)
  });
  const activateLikelihoodMutation = useMutation({
    mutationFn: (id: string) => updateLikelihoodValue(registerId, id, { isActive: true }),
    onSuccess: async () => invalidateScoringConfiguration(queryClient, registerId)
  });

  const likelihoods = configQuery.data?.likelihoodValues ?? [];

  const openCreateLikelihood = () => {
    setEditingLikelihood(null);
    likelihoodForm.setValues({ name: "", numericValue: 1, displayOrder: (likelihoods.at(-1)?.displayOrder ?? 0) + 10, isActive: true });
    setLikelihoodModalOpen(true);
  };
  const openEditLikelihood = (value: LikelihoodValue) => {
    setEditingLikelihood(value);
    likelihoodForm.setValues({
      name: value.name,
      numericValue: Number(value.numericValue),
      displayOrder: value.displayOrder,
      isActive: value.isActive
    });
    setLikelihoodModalOpen(true);
  };

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={3}>Likelihood Values</Title>
        {!draftConfigMode ? <Button onClick={openCreateLikelihood}>Add likelihood</Button> : null}
      </Group>
      <ApiErrorAlert error={configQuery.error} fallback="Unable to load configuration" />
      <ApiErrorAlert error={deactivateLikelihoodMutation.error} fallback="Unable to deactivate likelihood value" />
      <ApiErrorAlert error={activateLikelihoodMutation.error} fallback="Unable to activate likelihood value" />
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
            {likelihoods.map((value) => (
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
                      <Button variant="subtle" onClick={() => openEditLikelihood(value)}>Edit</Button>
                      {value.isActive ? (
                        <Button color="red" variant="subtle" onClick={() => deactivateLikelihoodMutation.mutate(value.id)}>
                          Deactivate
                        </Button>
                      ) : (
                        <Button variant="subtle" onClick={() => activateLikelihoodMutation.mutate(value.id)}>
                          Activate
                        </Button>
                      )}
                    </Group>
                  </Table.Td>
                ) : <Table.Td />}
              </Table.Tr>
            ))}
            {likelihoods.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={5}><Text c="dimmed">No likelihood values configured</Text></Table.Td>
              </Table.Tr>
            ) : null}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>

      <Modal
        opened={likelihoodModalOpen}
        onClose={() => setLikelihoodModalOpen(false)}
        title={editingLikelihood ? "Edit likelihood value" : "Add likelihood value"}
      >
        <form
          onSubmit={likelihoodForm.onSubmit(() => {
            if (editingLikelihood) {
              updateLikelihoodMutation.mutate();
            } else {
              createLikelihoodMutation.mutate();
            }
          })}
        >
          <Stack>
            <ApiErrorAlert error={createLikelihoodMutation.error} fallback="Unable to create likelihood value" />
            <ApiErrorAlert error={updateLikelihoodMutation.error} fallback="Unable to update likelihood value" />
            <TextInput label="Name" required {...likelihoodForm.getInputProps("name")} />
            <NumberInput label="Numeric value" min={0} {...likelihoodForm.getInputProps("numericValue")} />
            <NumberInput label="Display order" min={1} {...likelihoodForm.getInputProps("displayOrder")} />
            <Checkbox label="Active" {...likelihoodForm.getInputProps("isActive", { type: "checkbox" })} />
            <Button type="submit" loading={createLikelihoodMutation.isPending || updateLikelihoodMutation.isPending}>
              Save
            </Button>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
