import { Button, Checkbox, Group, Select, Stack, Table, Text, Title } from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { getRegisterConfiguration } from "../../api/customFields.api";
import { getConfigVersionStatus, updateDraftConfig } from "../../api/configVersion.api";
import { updateMatrix } from "../../api/scoring.api";
import { ApiErrorAlert } from "../../components/ApiErrorAlert";
import { getReadableTextColor } from "../../utils/color";
import { invalidateScoringConfiguration } from "./scoringConfigInvalidation";

interface MatrixConfigTabProps {
  registerId: string;
  draftConfigMode?: boolean;
}

export function MatrixConfigTab({ registerId, draftConfigMode }: MatrixConfigTabProps) {
  const queryClient = useQueryClient();
  const [matrixValues, setMatrixValues] = useState<Record<string, string>>({});
  const [recalculateExistingRisks, setRecalculateExistingRisks] = useState(false);

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

  useEffect(() => {
    if (!configQuery.data) return;
    const initial: Record<string, string> = {};
    for (const cell of configQuery.data.matrixCells) {
      initial[`${cell.likelihoodValueId}:${cell.impactValueId}`] = cell.riskLevelId;
    }
    setMatrixValues(initial);
  }, [configQuery.data]);

  const invalidateAll = () => invalidateScoringConfiguration(queryClient, registerId);

  const saveMatrixMutation = useMutation<unknown>({
    mutationFn: () =>
      hasDraft
        ? updateDraftConfig(registerId, {
            matrixCells: Object.entries(matrixValues)
              .filter(([, riskLevelId]) => Boolean(riskLevelId))
              .map(([cellKey, riskLevelId]) => {
                const [likelihoodValueId, impactValueId] = cellKey.split(":") as [string, string];
                const existingCell = configQuery.data?.matrixCells.find(
                  (cell) =>
                    cell.likelihoodValueId === likelihoodValueId && cell.impactValueId === impactValueId
                );
                return {
                  id: existingCell?.id ?? crypto.randomUUID(),
                  likelihoodValueId,
                  impactValueId,
                  riskLevelId
                };
              })
          })
        : updateMatrix(registerId, {
            cells: Object.entries(matrixValues)
              .filter(([, riskLevelId]) => Boolean(riskLevelId))
              .map(([cellKey, riskLevelId]) => {
                const [likelihoodValueId, impactValueId] = cellKey.split(":") as [string, string];
                return { likelihoodValueId, impactValueId, riskLevelId };
              }),
            recalculateExistingRisks
          }),
    onSuccess: async () => {
      await Promise.all([
        invalidateAll(),
        queryClient.invalidateQueries({ queryKey: ["risks", registerId] })
      ]);
    }
  });

  const activeLikelihoods = (configQuery.data?.likelihoodValues ?? []).filter((value) => value.isActive);
  const activeImpacts = (configQuery.data?.impactValues ?? []).filter((value) => value.isActive);
  const activeRiskLevels = (configQuery.data?.riskLevels ?? []).filter((value) => value.isActive);
  const activeRiskLevelOptions = activeRiskLevels.map((r) => ({ value: r.id, label: r.name }));
  const riskLevelColorMap = new Map(activeRiskLevels.map((r) => [r.id, r.color]));

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={3}>Risk Matrix</Title>
        {!isReadOnly ? (
          <Group>
            <Checkbox
              label="Recalculate existing risks"
              checked={recalculateExistingRisks}
              onChange={(event) => setRecalculateExistingRisks(event.currentTarget.checked)}
            />
            <Button onClick={() => saveMatrixMutation.mutate()} loading={saveMatrixMutation.isPending}>
              Save matrix
            </Button>
          </Group>
        ) : null}
      </Group>
      <ApiErrorAlert error={configQuery.error} fallback="Unable to load matrix" />
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
                        disabled={isReadOnly}
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
  );
}
