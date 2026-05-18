import {
  Badge,
  Box,
  Button,
  Checkbox,
  ColorPicker,
  Group,
  Modal,
  NumberInput,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
  Title
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  createRiskLevel,
  deactivateRiskLevel,
  updateRiskLevel,
  type RiskLevel
} from "../../api/scoring.api";
import { getRegisterConfiguration } from "../../api/customFields.api";
import { ApiErrorAlert } from "../../components/ApiErrorAlert";
import { invalidateScoringConfiguration } from "./scoringConfigInvalidation";

interface RiskLevelConfigTabProps {
  registerId: string;
}

const hexColorPattern = /^#[0-9A-Fa-f]{6}$/;
const fallbackColorPickerValue = "#868e96";
const riskLevelColorSwatches = ["#2f9e44", "#f59f00", "#f76707", "#e03131", "#1971c2", "#7048e8", "#495057"];

export function RiskLevelConfigTab({ registerId }: RiskLevelConfigTabProps) {
  const queryClient = useQueryClient();
  const [riskLevelModalOpen, setRiskLevelModalOpen] = useState(false);
  const [editingRiskLevel, setEditingRiskLevel] = useState<RiskLevel | null>(null);
  const riskLevelForm = useForm({
    initialValues: { name: "", description: "", color: null as string | null, displayOrder: 10, isActive: true },
    validate: {
      color: (value) =>
        value && !hexColorPattern.test(value) ? "Color must be a valid 6-digit hex color, such as #ff0000" : null
    }
  });

  const configQuery = useQuery({
    queryKey: ["register-config", registerId],
    queryFn: () => getRegisterConfiguration(registerId),
    enabled: Boolean(registerId)
  });

  const riskLevels = configQuery.data?.riskLevels ?? [];

  const createRiskLevelMutation = useMutation({
    mutationFn: () =>
      createRiskLevel(registerId, {
        name: riskLevelForm.values.name,
        description: riskLevelForm.values.description || null,
        color: riskLevelForm.values.color || null,
        displayOrder: riskLevelForm.values.displayOrder,
        isActive: riskLevelForm.values.isActive
      }),
    onSuccess: async () => {
      setRiskLevelModalOpen(false);
      riskLevelForm.reset();
      await invalidateScoringConfiguration(queryClient, registerId);
    }
  });
  const updateRiskLevelMutation = useMutation({
    mutationFn: () =>
      updateRiskLevel(registerId, editingRiskLevel!.id, {
        name: riskLevelForm.values.name,
        description: riskLevelForm.values.description || null,
        color: riskLevelForm.values.color || null,
        displayOrder: riskLevelForm.values.displayOrder,
        isActive: riskLevelForm.values.isActive
      }),
    onSuccess: async () => {
      setRiskLevelModalOpen(false);
      setEditingRiskLevel(null);
      await invalidateScoringConfiguration(queryClient, registerId);
    }
  });
  const deactivateRiskLevelMutation = useMutation({
    mutationFn: (id: string) => deactivateRiskLevel(registerId, id),
    onSuccess: async () => invalidateScoringConfiguration(queryClient, registerId)
  });
  const activateRiskLevelMutation = useMutation({
    mutationFn: (id: string) => updateRiskLevel(registerId, id, { isActive: true }),
    onSuccess: async () => invalidateScoringConfiguration(queryClient, registerId)
  });

  const openCreateRiskLevel = () => {
    setEditingRiskLevel(null);
    riskLevelForm.setValues({
      name: "",
      description: "",
      color: null,
      displayOrder: (riskLevels.at(-1)?.displayOrder ?? 0) + 10,
      isActive: true
    });
    setRiskLevelModalOpen(true);
  };
  const openEditRiskLevel = (value: RiskLevel) => {
    setEditingRiskLevel(value);
    riskLevelForm.setValues({
      name: value.name,
      description: value.description ?? "",
      color: value.color,
      displayOrder: value.displayOrder,
      isActive: value.isActive
    });
    setRiskLevelModalOpen(true);
  };

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={3}>Risk Levels</Title>
        <Button onClick={openCreateRiskLevel}>Add risk level</Button>
      </Group>
      <ApiErrorAlert error={configQuery.error} fallback="Unable to load configuration" />
      <ApiErrorAlert error={deactivateRiskLevelMutation.error} fallback="Unable to deactivate risk level" />
      <ApiErrorAlert error={activateRiskLevelMutation.error} fallback="Unable to activate risk level" />
      <Table.ScrollContainer minWidth={900}>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Order</Table.Th>
              <Table.Th>Name</Table.Th>
              <Table.Th>Color</Table.Th>
              <Table.Th>Description</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {riskLevels.map((value) => (
              <Table.Tr key={value.id}>
                <Table.Td>{value.displayOrder}</Table.Td>
                <Table.Td>{value.name}</Table.Td>
                <Table.Td>
                  {value.color ? (
                    <Group gap="xs">
                      <Box
                        w={16}
                        h={16}
                        style={{ borderRadius: 3, backgroundColor: value.color, border: "1px solid #dee2e6", flexShrink: 0 }}
                      />
                      <Text size="sm" c="dimmed">{value.color}</Text>
                    </Group>
                  ) : (
                    <Text size="sm" c="dimmed">—</Text>
                  )}
                </Table.Td>
                <Table.Td>{value.description ?? ""}</Table.Td>
                <Table.Td>
                  <Badge color={value.isActive ? "green" : "gray"}>
                    {value.isActive ? "Active" : "Inactive"}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Group justify="flex-end" gap="xs">
                    <Button variant="subtle" onClick={() => openEditRiskLevel(value)}>Edit</Button>
                    {value.isActive ? (
                      <Button color="red" variant="subtle" onClick={() => deactivateRiskLevelMutation.mutate(value.id)}>
                        Deactivate
                      </Button>
                    ) : (
                      <Button variant="subtle" onClick={() => activateRiskLevelMutation.mutate(value.id)}>
                        Activate
                      </Button>
                    )}
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
            {riskLevels.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={6}><Text c="dimmed">No risk levels configured</Text></Table.Td>
              </Table.Tr>
            ) : null}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>

      <Modal
        opened={riskLevelModalOpen}
        onClose={() => setRiskLevelModalOpen(false)}
        title={editingRiskLevel ? "Edit risk level" : "Add risk level"}
      >
        <form
          onSubmit={riskLevelForm.onSubmit(() => {
            if (editingRiskLevel) {
              updateRiskLevelMutation.mutate();
            } else {
              createRiskLevelMutation.mutate();
            }
          })}
        >
          <Stack>
            <ApiErrorAlert error={createRiskLevelMutation.error} fallback="Unable to create risk level" />
            <ApiErrorAlert error={updateRiskLevelMutation.error} fallback="Unable to update risk level" />
            <TextInput label="Name" required {...riskLevelForm.getInputProps("name")} />
            <Textarea label="Description" {...riskLevelForm.getInputProps("description")} />
            <Stack gap="xs">
              <TextInput
                label="Color (optional hex, e.g. #ff0000)"
                placeholder="#rrggbb"
                value={riskLevelForm.values.color ?? ""}
                onChange={(e) => {
                  const val = e.currentTarget.value.trim();
                  riskLevelForm.setFieldValue("color", val || null);
                  if (!val || hexColorPattern.test(val)) {
                    riskLevelForm.clearFieldError("color");
                  }
                }}
                error={riskLevelForm.errors.color}
              />
              <ColorPicker
                format="hex"
                value={hexColorPattern.test(riskLevelForm.values.color ?? "") ? riskLevelForm.values.color! : fallbackColorPickerValue}
                onChange={(val) => riskLevelForm.setFieldValue("color", val)}
                size="sm"
                swatches={riskLevelColorSwatches}
                fullWidth
              />
            </Stack>
            <NumberInput label="Display order" min={1} {...riskLevelForm.getInputProps("displayOrder")} />
            <Checkbox label="Active" {...riskLevelForm.getInputProps("isActive", { type: "checkbox" })} />
            <Button type="submit" loading={createRiskLevelMutation.isPending || updateRiskLevelMutation.isPending}>
              Save
            </Button>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
