import { Anchor, Badge, Button, Group, Loader, Stack, Table, Text, Title } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { getMyRisks } from "../api/dashboard.api";
import { ApiErrorAlert } from "../components/ApiErrorAlert";
import { usePermissions } from "../hooks/usePermissions";
import { RiskLevelBadge } from "../components/RiskLevelBadge/RiskLevelBadge";


function reviewBadge(status: string) {
  const color = status === "OVERDUE" ? "red" : status === "DUE_SOON" ? "yellow" : "gray";
  return <Badge color={color}>{status.replace(/_/g, " ")}</Badge>;
}

export function MyRisksPage() {
  const { isSystemAdmin } = usePermissions();
  const risksQuery = useQuery({ queryKey: ["dashboard", "my-risks"], queryFn: getMyRisks });

  return (
    <Stack>
      <Title order={1}>My Risks</Title>
      <ApiErrorAlert error={risksQuery.error} fallback="Unable to load assigned risks" />
      {risksQuery.isLoading ? <Loader /> : null}
      <Table.ScrollContainer minWidth={760}>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Risk</Table.Th>
              <Table.Th>Register</Table.Th>
              <Table.Th>Level</Table.Th>
              <Table.Th>Next review</Table.Th>
              <Table.Th>Review</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {(risksQuery.data ?? []).map((risk) => (
              <Table.Tr key={risk.id}>
                <Table.Td>
                  <Anchor
                    component={Link}
                    to={`/registers/${risk.register.id}?riskId=${risk.id}`}
                    fw={600}
                  >
                    {risk.displayRiskId}
                  </Anchor>
                  <Text size="sm">{risk.title}</Text>
                </Table.Td>
                <Table.Td>{risk.register.name}</Table.Td>
                <Table.Td><RiskLevelBadge riskLevel={risk.riskLevel} /></Table.Td>
                <Table.Td>{risk.nextReviewDate ?? ""}</Table.Td>
                <Table.Td>{reviewBadge(risk.reviewStatus)}</Table.Td>
                <Table.Td>
                  <Group justify="flex-end" gap="xs" wrap="nowrap">
                    <Button
                      component={Link}
                      to={`/registers/${risk.register.id}?riskId=${risk.id}&action=review`}
                      variant="subtle"
                      size="xs"
                    >
                      Review
                    </Button>
                    <Button
                      component={Link}
                      to={`/registers/${risk.register.id}?riskId=${risk.id}&action=edit`}
                      variant="subtle"
                      size="xs"
                    >
                      Edit
                    </Button>
                    {isSystemAdmin ? (
                      <Button
                        component={Link}
                        to={`/registers/${risk.register.id}?riskId=${risk.id}&action=delete`}
                        variant="subtle"
                        color="red"
                        size="xs"
                      >
                        Delete
                      </Button>
                    ) : null}
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
            {risksQuery.data?.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={6}>
                  <Text c="dimmed">No risks are assigned to you.</Text>
                </Table.Td>
              </Table.Tr>
            ) : null}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Stack>
  );
}
