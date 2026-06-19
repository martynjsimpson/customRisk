import { Anchor, Button, Group, Loader, Paper, SimpleGrid, Stack, Table, Text, Title } from "@mantine/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";

import { getMyWork, type DashboardRisk } from "../api/dashboard.api";
import { getRegister } from "../api/registers.api";
import { ApiErrorAlert } from "../components/ApiErrorAlert";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { RiskLevelBadge } from "../components/RiskLevelBadge/RiskLevelBadge";
import { ReviewStatusBadge } from "../components/ReviewStatusBadge/ReviewStatusBadge";
import { AuditEventTable } from "../features/audit/AuditEventTable";
import { ReviewModal } from "../features/risks/ReviewModal";

interface RiskTableProps {
  risks: DashboardRisk[];
  onReview?: (risk: DashboardRisk) => void;
}

function RiskTable({ risks, onReview }: RiskTableProps) {
  if (risks.length === 0) {
    return <Text c="dimmed">No risks need your attention right now.</Text>;
  }

  const showActions = Boolean(onReview);

  return (
    <Table.ScrollContainer minWidth={760}>
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Risk</Table.Th>
            <Table.Th>Register</Table.Th>
            <Table.Th>Risk Level</Table.Th>
            <Table.Th>Next Review Date</Table.Th>
            <Table.Th>Review Status</Table.Th>
            {showActions ? <Table.Th /> : null}
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
              <Table.Td><ReviewStatusBadge status={risk.reviewStatus} /></Table.Td>
              {showActions ? (
                <Table.Td>
                  <Group justify="flex-end" gap="xs" wrap="nowrap">
                    <Button variant="subtle" size="xs" onClick={() => onReview!(risk)}>
                      Review
                    </Button>
                  </Group>
                </Table.Td>
              ) : null}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

export function HomePage() {
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  const dashboardQuery = useQuery({ queryKey: ["dashboard", "my-work"], queryFn: getMyWork });

  // Review modal state for "My overdue risks" widget
  const [reviewRisk, setReviewRisk] = useState<DashboardRisk | null>(null);

  const reviewRegisterQuery = useQuery({
    queryKey: ["register", reviewRisk?.register.id],
    queryFn: () => getRegister(reviewRisk!.register.id),
    enabled: Boolean(reviewRisk)
  });

  const invalidateDashboard = async () => {
    await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

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
      {dashboardQuery.isLoading ? <Loader /> : null}
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
          <RiskTable
            risks={dashboardQuery.data?.myOverdueRisks ?? []}
            onReview={setReviewRisk}
          />
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
            <Table.ScrollContainer minWidth={560}>
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
                      <Table.Td>
                        <Anchor
                          component={Link}
                          to={`/registers/${summary.register.id}?state=OPEN`}
                        >
                          {summary.openRisks}
                        </Anchor>
                      </Table.Td>
                      <Table.Td>
                        <Anchor
                          component={Link}
                          to={`/registers/${summary.register.id}?reviewStatus=OVERDUE`}
                        >
                          {summary.overdueReviews}
                        </Anchor>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          </Stack>
        </Paper>
      ) : null}
      {(dashboardQuery.data?.recentAuditActivity ?? []).length > 0 ? (
        <Paper withBorder p="md" radius="sm">
          <Stack>
            <Group justify="space-between">
              <Title order={2}>Recent audit activity</Title>
            </Group>
            <AuditEventTable events={dashboardQuery.data!.recentAuditActivity} showRegister />
          </Stack>
        </Paper>
      ) : null}

      {reviewRisk && reviewRegisterQuery.data ? (
        <ReviewModal
          register={reviewRegisterQuery.data}
          registerId={reviewRisk.register.id}
          riskId={reviewRisk.id}
          opened={Boolean(reviewRisk)}
          onClose={() => setReviewRisk(null)}
          onSuccess={invalidateDashboard}
        />
      ) : null}
    </Stack>
  );
}
