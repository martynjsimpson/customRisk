import {
  Badge,
  Button,
  Code,
  Group,
  Loader,
  Stack,
  Table,
  Text,
  Title
} from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { adminListApiKeys, adminRevokeApiKey } from "../api/apiKeys.api";
import { ApiErrorAlert } from "../components/ApiErrorAlert";

export function ApiKeysPage() {
  const queryClient = useQueryClient();
  const keysQuery = useQuery({ queryKey: ["admin-api-keys"], queryFn: adminListApiKeys });

  const revokeMutation = useMutation({
    mutationFn: adminRevokeApiKey,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-api-keys"] });
    }
  });

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString();
  };

  return (
    <Stack>
      <Stack gap={0}>
        <Title order={1}>API Keys</Title>
        <Text c="dimmed">
          A read-only audit view of all API keys across all users. To create or manage your own
          keys, visit your Profile page. System Admins can revoke any key here for offboarding or
          security purposes.
        </Text>
      </Stack>

      <ApiErrorAlert error={keysQuery.error} fallback="Unable to load API keys" />
      <ApiErrorAlert error={revokeMutation.error} fallback="Unable to revoke API key" />

      {keysQuery.isLoading ? <Loader /> : null}

      <Table.ScrollContainer minWidth={900}>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Prefix</Table.Th>
              <Table.Th>Owner</Table.Th>
              <Table.Th>Created</Table.Th>
              <Table.Th>Last used</Table.Th>
              <Table.Th>Expires</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {(keysQuery.data ?? []).map((key) => (
              <Table.Tr key={key.id}>
                <Table.Td>{key.name}</Table.Td>
                <Table.Td>
                  <Code>{key.keyPrefix}…</Code>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{key.user.name}</Text>
                  <Text size="xs" c="dimmed">
                    {key.user.email}
                  </Text>
                </Table.Td>
                <Table.Td>{formatDate(key.createdAt)}</Table.Td>
                <Table.Td>{formatDate(key.lastUsedAt)}</Table.Td>
                <Table.Td>{formatDate(key.expiresAt)}</Table.Td>
                <Table.Td>
                  {key.status === "revoked" ? (
                    <Badge color="red">Revoked</Badge>
                  ) : key.status === "expired" ? (
                    <Badge color="gray">Expired</Badge>
                  ) : (
                    <Badge color="green">Active</Badge>
                  )}
                </Table.Td>
                <Table.Td>
                  <Group gap="xs" justify="flex-end" wrap="nowrap">
                    {key.status === "active" ? (
                      <Button
                        variant="light"
                        size="xs"
                        color="red"
                        loading={revokeMutation.isPending && revokeMutation.variables === key.id}
                        onClick={() => revokeMutation.mutate(key.id)}
                      >
                        Revoke
                      </Button>
                    ) : null}
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
            {keysQuery.data?.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={8}>
                  <Text c="dimmed">No API keys yet.</Text>
                </Table.Td>
              </Table.Tr>
            ) : null}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Stack>
  );
}
