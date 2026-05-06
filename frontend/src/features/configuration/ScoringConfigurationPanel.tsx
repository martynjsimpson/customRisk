import {
  Badge,
  Box,
  Button,
  Checkbox,
  ColorPicker,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  Table,
  Tabs,
  Text,
  Textarea,
  TextInput,
  Title
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import {
  createImpactValue,
  createLikelihoodValue,
  createRiskLevel,
  deactivateImpactValue,
  deactivateLikelihoodValue,
  deactivateRiskLevel,
  getMatrix,
  getRegisterConfiguration,
  updateImpactValue,
  updateLikelihoodValue,
  updateMatrix,
  updateRiskLevel,
  type ImpactValue,
  type LikelihoodValue,
  type RiskLevel
} from "../../api/configuration.api";
import { ApiErrorAlert } from "../../components/ApiErrorAlert";

interface ScoringConfigurationPanelProps {
  registerId: string;
}

const hexColorPattern = /^#[0-9A-Fa-f]{6}$/;
const fallbackColorPickerValue = "#868e96";
const riskLevelColorSwatches = ["#2f9e44", "#f59f00", "#f76707", "#e03131", "#1971c2", "#7048e8", "#495057"];

function getReadableTextColor(backgroundColor: string) {
  const red = parseInt(backgroundColor.slice(1, 3), 16);
  const green = parseInt(backgroundColor.slice(3, 5), 16);
  const blue = parseInt(backgroundColor.slice(5, 7), 16);
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000;

  return luminance > 150 ? "#212529" : "#ffffff";
}

export function ScoringConfigurationPanel({ registerId }: ScoringConfigurationPanelProps) {
  const queryClient = useQueryClient();

  // --- Likelihood state ---
  const [likelihoodModalOpen, setLikelihoodModalOpen] = useState(false);
  const [editingLikelihood, setEditingLikelihood] = useState<LikelihoodValue | null>(null);
  const likelihoodForm = useForm({
    initialValues: { name: "", numericValue: 1, displayOrder: 10, isActive: true }
  });

  // --- Impact state ---
  const [impactModalOpen, setImpactModalOpen] = useState(false);
  const [editingImpact, setEditingImpact] = useState<ImpactValue | null>(null);
  const impactForm = useForm({
    initialValues: { name: "", numericValue: 1, displayOrder: 10, isActive: true }
  });

  // --- Risk level state ---
  const [riskLevelModalOpen, setRiskLevelModalOpen] = useState(false);
  const [editingRiskLevel, setEditingRiskLevel] = useState<RiskLevel | null>(null);
  const riskLevelForm = useForm({
    initialValues: { name: "", description: "", color: null as string | null, displayOrder: 10, isActive: true },
    validate: {
      color: (value) =>
        value && !hexColorPattern.test(value) ? "Color must be a valid 6-digit hex color, such as #ff0000" : null
    }
  });

  // --- Matrix state ---
  const [matrixValues, setMatrixValues] = useState<Record<string, string>>({});
  const [recalculateExistingRisks, setRecalculateExistingRisks] = useState(false);

  // --- Queries ---
  const configQuery = useQuery({
    queryKey: ["register-config", registerId],
    queryFn: () => getRegisterConfiguration(registerId),
    enabled: Boolean(registerId)
  });
  const matrixQuery = useQuery({
    queryKey: ["register-matrix", registerId],
    queryFn: () => getMatrix(registerId),
    enabled: Boolean(registerId)
  });

  useEffect(() => {
    if (!matrixQuery.data) return;
    const initial: Record<string, string> = {};
    for (const cell of matrixQuery.data.cells) {
      initial[`${cell.likelihoodValueId}:${cell.impactValueId}`] = cell.riskLevelId;
    }
    setMatrixValues(initial);
  }, [matrixQuery.data]);

  // --- Shared invalidation ---
  const invalidateAll = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["register-config", registerId] }),
      queryClient.invalidateQueries({ queryKey: ["risk-form-config", registerId] }),
      queryClient.invalidateQueries({ queryKey: ["register-matrix", registerId] })
    ]);

  // --- Likelihood mutations ---
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
      await invalidateAll();
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
      await invalidateAll();
    }
  });
  const deactivateLikelihoodMutation = useMutation({
    mutationFn: (id: string) => deactivateLikelihoodValue(registerId, id),
    onSuccess: invalidateAll
  });
  const activateLikelihoodMutation = useMutation({
    mutationFn: (id: string) => updateLikelihoodValue(registerId, id, { isActive: true }),
    onSuccess: invalidateAll
  });

  // --- Impact mutations ---
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
      await invalidateAll();
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
      await invalidateAll();
    }
  });
  const deactivateImpactMutation = useMutation({
    mutationFn: (id: string) => deactivateImpactValue(registerId, id),
    onSuccess: invalidateAll
  });
  const activateImpactMutation = useMutation({
    mutationFn: (id: string) => updateImpactValue(registerId, id, { isActive: true }),
    onSuccess: invalidateAll
  });

  // --- Risk level mutations ---
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
      await invalidateAll();
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
      await invalidateAll();
    }
  });
  const deactivateRiskLevelMutation = useMutation({
    mutationFn: (id: string) => deactivateRiskLevel(registerId, id),
    onSuccess: invalidateAll
  });
  const activateRiskLevelMutation = useMutation({
    mutationFn: (id: string) => updateRiskLevel(registerId, id, { isActive: true }),
    onSuccess: invalidateAll
  });

  // --- Matrix mutation ---
  const saveMatrixMutation = useMutation({
    mutationFn: () => {
      const activeLikelihoods = (matrixQuery.data?.likelihoodValues ?? []).filter((l) => l.isActive);
      const activeImpacts = (matrixQuery.data?.impactValues ?? []).filter((i) => i.isActive);
      const cells = [];
      for (const l of activeLikelihoods) {
        for (const i of activeImpacts) {
          const riskLevelId = matrixValues[`${l.id}:${i.id}`];
          if (riskLevelId) {
            cells.push({ likelihoodValueId: l.id, impactValueId: i.id, riskLevelId });
          }
        }
      }
      return updateMatrix(registerId, { cells, recalculateExistingRisks });
    },
    onSuccess: async () => {
      await Promise.all([
        invalidateAll(),
        queryClient.invalidateQueries({ queryKey: ["risks", registerId] }),
        queryClient.invalidateQueries({ queryKey: ["risk", registerId] })
      ]);
    }
  });

  // --- Derived data ---
  const likelihoods = configQuery.data?.likelihoodValues ?? [];
  const impacts = configQuery.data?.impactValues ?? [];
  const riskLevels = configQuery.data?.riskLevels ?? [];

  const activeLikelihoods = (matrixQuery.data?.likelihoodValues ?? [])
    .filter((l) => l.isActive)
    .sort((a, b) => a.displayOrder - b.displayOrder);
  const activeImpacts = (matrixQuery.data?.impactValues ?? [])
    .filter((i) => i.isActive)
    .sort((a, b) => a.displayOrder - b.displayOrder);
  const activeRiskLevels = (matrixQuery.data?.riskLevels ?? [])
    .filter((r) => r.isActive)
    .sort((a, b) => a.displayOrder - b.displayOrder);
  const activeRiskLevelOptions = activeRiskLevels.map((r) => ({ value: r.id, label: r.name }));
  const riskLevelColorMap = new Map(activeRiskLevels.map((r) => [r.id, r.color]));

  // --- Likelihood modal helpers ---
  const openCreateLikelihood = () => {
    setEditingLikelihood(null);
    likelihoodForm.setValues({
      name: "",
      numericValue: likelihoods.length > 0 ? parseFloat(likelihoods.at(-1)!.numericValue) + 1 : 1,
      displayOrder: (likelihoods.at(-1)?.displayOrder ?? 0) + 10,
      isActive: true
    });
    setLikelihoodModalOpen(true);
  };
  const openEditLikelihood = (value: LikelihoodValue) => {
    setEditingLikelihood(value);
    likelihoodForm.setValues({
      name: value.name,
      numericValue: parseFloat(value.numericValue),
      displayOrder: value.displayOrder,
      isActive: value.isActive
    });
    setLikelihoodModalOpen(true);
  };

  // --- Impact modal helpers ---
  const openCreateImpact = () => {
    setEditingImpact(null);
    impactForm.setValues({
      name: "",
      numericValue: impacts.length > 0 ? parseFloat(impacts.at(-1)!.numericValue) + 1 : 1,
      displayOrder: (impacts.at(-1)?.displayOrder ?? 0) + 10,
      isActive: true
    });
    setImpactModalOpen(true);
  };
  const openEditImpact = (value: ImpactValue) => {
    setEditingImpact(value);
    impactForm.setValues({
      name: value.name,
      numericValue: parseFloat(value.numericValue),
      displayOrder: value.displayOrder,
      isActive: value.isActive
    });
    setImpactModalOpen(true);
  };

  // --- Risk level modal helpers ---
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
    <Tabs defaultValue="likelihood">
      <Tabs.List>
        <Tabs.Tab value="likelihood">Likelihood</Tabs.Tab>
        <Tabs.Tab value="impact">Impact</Tabs.Tab>
        <Tabs.Tab value="risk-levels">Risk Levels</Tabs.Tab>
        <Tabs.Tab value="matrix">Matrix</Tabs.Tab>
      </Tabs.List>

      {/* ---- Likelihood ---- */}
      <Tabs.Panel value="likelihood" pt="md">
        <Stack>
          <Group justify="space-between">
            <Title order={3}>Likelihood Values</Title>
            <Button onClick={openCreateLikelihood}>Add likelihood</Button>
          </Group>
          <ApiErrorAlert error={configQuery.error} fallback="Unable to load configuration" />
          <ApiErrorAlert error={deactivateLikelihoodMutation.error} fallback="Unable to deactivate likelihood value" />
          <ApiErrorAlert error={activateLikelihoodMutation.error} fallback="Unable to activate likelihood value" />
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
                  <Table.Td>
                    <Group justify="flex-end" gap="xs">
                      <Button variant="subtle" onClick={() => openEditLikelihood(value)}>Edit</Button>
                      {value.isActive ? (
                        <Button
                          color="red"
                          variant="subtle"
                          onClick={() => deactivateLikelihoodMutation.mutate(value.id)}
                        >
                          Deactivate
                        </Button>
                      ) : (
                        <Button
                          variant="subtle"
                          onClick={() => activateLikelihoodMutation.mutate(value.id)}
                        >
                          Activate
                        </Button>
                      )}
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
              {likelihoods.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={5}><Text c="dimmed">No likelihood values configured</Text></Table.Td>
                </Table.Tr>
              ) : null}
            </Table.Tbody>
          </Table>

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
      </Tabs.Panel>

      {/* ---- Impact ---- */}
      <Tabs.Panel value="impact" pt="md">
        <Stack>
          <Group justify="space-between">
            <Title order={3}>Impact Values</Title>
            <Button onClick={openCreateImpact}>Add impact</Button>
          </Group>
          <ApiErrorAlert error={configQuery.error} fallback="Unable to load configuration" />
          <ApiErrorAlert error={deactivateImpactMutation.error} fallback="Unable to deactivate impact value" />
          <ApiErrorAlert error={activateImpactMutation.error} fallback="Unable to activate impact value" />
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
                  <Table.Td>
                    <Group justify="flex-end" gap="xs">
                      <Button variant="subtle" onClick={() => openEditImpact(value)}>Edit</Button>
                      {value.isActive ? (
                        <Button
                          color="red"
                          variant="subtle"
                          onClick={() => deactivateImpactMutation.mutate(value.id)}
                        >
                          Deactivate
                        </Button>
                      ) : (
                        <Button
                          variant="subtle"
                          onClick={() => activateImpactMutation.mutate(value.id)}
                        >
                          Activate
                        </Button>
                      )}
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
              {impacts.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={5}><Text c="dimmed">No impact values configured</Text></Table.Td>
                </Table.Tr>
              ) : null}
            </Table.Tbody>
          </Table>

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
      </Tabs.Panel>

      {/* ---- Risk Levels ---- */}
      <Tabs.Panel value="risk-levels" pt="md">
        <Stack>
          <Group justify="space-between">
            <Title order={3}>Risk Levels</Title>
            <Button onClick={openCreateRiskLevel}>Add risk level</Button>
          </Group>
          <ApiErrorAlert error={configQuery.error} fallback="Unable to load configuration" />
          <ApiErrorAlert error={deactivateRiskLevelMutation.error} fallback="Unable to deactivate risk level" />
          <ApiErrorAlert error={activateRiskLevelMutation.error} fallback="Unable to activate risk level" />
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
                        <Button
                          color="red"
                          variant="subtle"
                          onClick={() => deactivateRiskLevelMutation.mutate(value.id)}
                        >
                          Deactivate
                        </Button>
                      ) : (
                        <Button
                          variant="subtle"
                          onClick={() => activateRiskLevelMutation.mutate(value.id)}
                        >
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
      </Tabs.Panel>

      {/* ---- Matrix ---- */}
      <Tabs.Panel value="matrix" pt="md">
        <Stack>
          <Group justify="space-between">
            <Title order={3}>Risk Matrix</Title>
            <Group>
              <Checkbox
                label="Recalculate existing risks"
                checked={recalculateExistingRisks}
                onChange={(event) => setRecalculateExistingRisks(event.currentTarget.checked)}
              />
              <Button
                onClick={() => saveMatrixMutation.mutate()}
                loading={saveMatrixMutation.isPending}
              >
                Save matrix
              </Button>
            </Group>
          </Group>
          <ApiErrorAlert error={matrixQuery.error} fallback="Unable to load matrix" />
          <ApiErrorAlert error={saveMatrixMutation.error} fallback="Unable to save matrix" />
          {activeLikelihoods.length === 0 || activeImpacts.length === 0 ? (
            <Text c="dimmed">
              Configure active likelihood and impact values before setting up the matrix.
            </Text>
          ) : (
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Likelihood \ Impact</Table.Th>
                  {activeImpacts.map((impact) => (
                    <Table.Th key={impact.id}>{impact.name}</Table.Th>
                  ))}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {activeLikelihoods.map((likelihood) => (
                  <Table.Tr key={likelihood.id}>
                    <Table.Td>{likelihood.name}</Table.Td>
                    {activeImpacts.map((impact) => {
                      const cellKey = `${likelihood.id}:${impact.id}`;
                      const selectedRiskLevelId = matrixValues[cellKey];
                      const selectedColor = selectedRiskLevelId ? riskLevelColorMap.get(selectedRiskLevelId) ?? undefined : undefined;
                      const selectedTextColor = selectedColor ? getReadableTextColor(selectedColor) : undefined;
                      return (
                        <Table.Td
                          key={impact.id}
                          style={{
                            backgroundColor: selectedColor ?? undefined,
                            transition: "background-color 120ms ease"
                          }}
                        >
                          <Select
                            data={activeRiskLevelOptions}
                            value={matrixValues[cellKey] ?? null}
                            placeholder="Select level"
                            size="xs"
                            styles={{
                              input: {
                                backgroundColor: selectedColor ?? undefined,
                                borderColor: selectedColor ?? undefined,
                                color: selectedTextColor
                              }
                            }}
                            onChange={(value) =>
                              setMatrixValues((prev) => ({ ...prev, [cellKey]: value ?? "" }))
                            }
                          />
                        </Table.Td>
                      );
                    })}
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Stack>
      </Tabs.Panel>
    </Tabs>
  );
}
