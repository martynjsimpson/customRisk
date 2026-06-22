import {
  Anchor,
  Badge,
  Button,
  Group,
  Loader,
  Stack,
  Table,
  Text,
  Title
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { listRegisters } from "../api/registers.api";
import { ApiErrorAlert } from "../components/ApiErrorAlert";
import { CreateRegisterWizard } from "../features/configuration/CreateRegisterWizard";
import { usePermissions } from "../hooks/usePermissions";

export function RegistersPage() {
  const { isSystemAdmin } = usePermissions();
  const registersQuery = useQuery({ queryKey: ["registers"], queryFn: listRegisters });
  const [wizardOpen, { open: openWizard, close: closeWizard }] = useDisclosure(false);

  return (
    <Stack>
      <Group justify="space-between" align="flex-start">
        <Stack gap={0}>
          <Title order={1}>Registers</Title>
          <Text c="dimmed">All risk registers you have access to.</Text>
        </Stack>
        {isSystemAdmin ? <Button onClick={openWizard}>Create register</Button> : null}
      </Group>
      <ApiErrorAlert error={registersQuery.error} fallback="Unable to load registers" />
      {registersQuery.isLoading ? <Loader /> : null}
      <Table.ScrollContainer minWidth={640}>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Role</Table.Th>
              <Table.Th>Open risks</Table.Th>
              <Table.Th>Overdue</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {(registersQuery.data?.data ?? []).map((register) => (
              <Table.Tr key={register.id}>
                <Table.Td>
                  <Anchor component={Link} to={`/registers/${register.id}`} fw={600} data-testid="register-row-link" data-register-name={register.name}>
                    {register.name}
                  </Anchor>
                </Table.Td>
                <Table.Td>
                  <Badge>{register.effectiveRole}</Badge>
                </Table.Td>
                <Table.Td>
                  <Anchor component={Link} to={`/registers/${register.id}?state=OPEN`}>
                    {register.openRisksCount}
                  </Anchor>
                </Table.Td>
                <Table.Td>
                  <Anchor component={Link} to={`/registers/${register.id}?reviewStatus=OVERDUE`}>
                    {register.overdueRisksCount}
                  </Anchor>
                </Table.Td>
              </Table.Tr>
            ))}
            {registersQuery.data?.data.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={4}>
                  <Text c="dimmed">No registers are available for your account.</Text>
                </Table.Td>
              </Table.Tr>
            ) : null}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>

      <CreateRegisterWizard opened={wizardOpen} onClose={closeWizard} />
    </Stack>
  );
}
