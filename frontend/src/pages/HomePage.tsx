import { Anchor, Badge, Button, Group, Paper, SimpleGrid, Stack, Table, Text, Title } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { getMyWork, type DashboardRisk } from "../api/dashboard.api";
import { ApiErrorAlert } from "../components/ApiErrorAlert";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { RiskLevelBadge } from "../components/RiskLevelBadge/RiskLevelBadge";


function reviewBadge(status: string) {
  const color = status === "OVERDUE" ? "red" : status === "DUE_SOON" ? "yellow" : "gray";
  return <Badge color={color}>{status.replace(/_/g, " ")}</Badge>;
}

function RiskTable({ risks }: { risks: DashboardRisk[] }) {
  if (risks.length === 0) {
    return <Text c="dimmed">No risks need your attention right now.</Text>;
  }

  return (
    <Table>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Risk</Table.Th>
          <Table.Th>Register</Table.Th>
          <Table.Th>Risk Level</Table.Th>
          <Table.Th>Next Review Date</Table.Th>
          <Table.Th>Review Status</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {risks.map((risk) => (
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
            <Table.Td>{risk.nextReviewDate}</Table.Td>
            <Table.Td>{reviewBadge(risk.reviewStatus)}</Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}

export function HomePage() {
  const { user } = useCurrentUser();
  const dashboardQuery = useQuery({ queryKey: ["dashboard", "my-work"], queryFn: getMyWork });

  return (
    <Stack>
      <Title order={1}>Home</Title>
      <Paper withBorder p="md" radius="sm">
        <Text fw={600}>Signed in as {user?.name}</Text>
        <Text c="dimmed" size="sm">
          {user?.email}
        </Text>
      </Paper>
      <ApiErrorAlert error={dashboardQuery.error} fallback="Unable to load dashboard" />
      {dashboardQuery.data?.systemSummary ? (
        <SimpleGrid cols={{ base: 1, sm: 4 }}>
          <Paper withBorder p="md" radius="sm">
            <Text c="dimmed" size="sm">Registers</Text>
            <Title order={3}>{dashboardQuery.data.systemSummary.totalRegisters}</Title>
          </Paper>
          <Paper withBorder p="md" radius="sm">
            <Text c="dimmed" size="sm">Users</Text>
            <Title order={3}>{dashboardQuery.data.systemSummary.totalUsers}</Title>
          </Paper>
          <Paper withBorder p="md" radius="sm">
            <Text c="dimmed" size="sm">Open risks</Text>
            <Title order={3}>{dashboardQuery.data.systemSummary.openRisks}</Title>
          </Paper>
          <Paper withBorder p="md" radius="sm">
            <Text c="dimmed" size="sm">Overdue reviews</Text>
            <Title order={3}>{dashboardQuery.data.systemSummary.overdueReviews}</Title>
          </Paper>
        </SimpleGrid>
      ) : null}
      <Paper withBorder p="md" radius="sm">
        <Stack>
          <Group justify="space-between">
            <Title order={2}>My overdue risks</Title>
          </Group>
          <RiskTable risks={dashboardQuery.data?.myOverdueRisks ?? []} />
        </Stack>
      </Paper>
      <Paper withBorder p="md" radius="sm">
        <Stack>
          <Title order={2}>My risks due review soon</Title>
          <RiskTable risks={dashboardQuery.data?.myDueSoonRisks ?? []} />
        </Stack>
      </Paper>
      {(dashboardQuery.data?.adminRegisterSummaries ?? []).length > 0 ? (
        <Paper withBorder p="md" radius="sm">
          <Stack>
            <Title order={2}>Admin summary</Title>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Register</Table.Th>
                  <Table.Th>Open risks</Table.Th>
                  <Table.Th>Overdue reviews</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {dashboardQuery.data!.adminRegisterSummaries.map((summary) => (
                  <Table.Tr key={summary.register.id}>
                    <Table.Td>
                      <Anchor
                        component={Link}
                        to={`/registers/${summary.register.id}`}
                        fw={600}
                      >
                      {summary.register.name}
                      </Anchor>
                    </Table.Td>
                    <Table.Td>{summary.openRisks}</Table.Td>
                    <Table.Td>{summary.overdueReviews}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Stack>
        </Paper>
      ) : null}
      {(dashboardQuery.data?.recentAuditActivity ?? []).length > 0 ? (
        <Paper withBorder p="md" radius="sm">
          <Stack>
            <Group justify="space-between">
              <Title order={2}>Recent audit activity</Title>
            </Group>
            <Table>
              <Table.Tbody>
                {dashboardQuery.data!.recentAuditActivity.map((event) => (
                  <Table.Tr key={event.id}>
                    <Table.Td>{new Date(event.occurredAt).toLocaleString()}</Table.Td>
                    <Table.Td><Badge>{event.action}</Badge></Table.Td>
                    <Table.Td>{event.summary}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Stack>
        </Paper>
      ) : null}
    </Stack>
  );
}
