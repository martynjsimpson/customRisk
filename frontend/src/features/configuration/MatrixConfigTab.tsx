import { Button, Checkbox, Group, Select, Stack, Table, Text, Title } from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { getMatrix, updateMatrix } from "../../api/scoring.api";
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

  const invalidateAll = () => invalidateScoringConfiguration(queryClient, registerId);

  const saveMatrixMutation = useMutation({
    mutationFn: () =>
      updateMatrix(registerId, {
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

  const activeLikelihoods = (matrixQuery.data?.likelihoodValues ?? []).filter((value) => value.isActive);
  const activeImpacts = (matrixQuery.data?.impactValues ?? []).filter((value) => value.isActive);
  const activeRiskLevels = (matrixQuery.data?.riskLevels ?? []).filter((value) => value.isActive);
  const activeRiskLevelOptions = activeRiskLevels.map((r) => ({ value: r.id, label: r.name }));
  const riskLevelColorMap = new Map(activeRiskLevels.map((r) => [r.id, r.color]));

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={3}>Risk Matrix</Title>
        {!draftConfigMode ? (
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
                        disabled={draftConfigMode}
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
