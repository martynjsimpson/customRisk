import {
  Alert,
  Badge,
  Button,
  Code,
  Group,
  Loader,
  Modal,
  Stack,
  Table,
  Text,
  TextInput,
  Title
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { IconKey } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  createApiKey,
  listApiKeys,
  revokeApiKey,
  type ApiKeyCreated
} from "../api/apiKeys.api";
import { ApiErrorAlert } from "../components/ApiErrorAlert";

export function ApiKeysPage() {
  const queryClient = useQueryClient();
  const keysQuery = useQuery({ queryKey: ["api-keys"], queryFn: listApiKeys });

  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  const [rawKeyResult, setRawKeyResult] = useState<ApiKeyCreated | null>(null);

  const form = useForm({
    initialValues: {
      name: "",
      expiresAt: ""
    },
    validate: {
      name: (v) => (v.trim().length === 0 ? "Name is required" : null),
      expiresAt: (v) => {
        if (!v) return null;
        const d = new Date(v);
        if (isNaN(d.getTime())) return "Enter a valid date (YYYY-MM-DD)";
        if (d <= new Date()) return "Expiry must be in the future";
        return null;
      }
    }
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["api-keys"] });
  };

  const createMutation = useMutation({
    mutationFn: () =>
      createApiKey({
        name: form.values.name.trim(),
        expiresAt: form.values.expiresAt
          ? new Date(form.values.expiresAt).toISOString()
          : undefined
      }),
    onSuccess: async (result) => {
      closeCreate();
      form.reset();
      setRawKeyResult(result);
      await invalidate();
    }
  });

  const revokeMutation = useMutation({
    mutationFn: revokeApiKey,
    onSuccess: invalidate
  });

  const startCreate = () => {
    createMutation.reset();
    form.reset();
    openCreate();
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString();
  };

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={1}>API Keys</Title>
        <Button leftSection={<IconKey size={16} />} onClick={startCreate}>
          Create API key
        </Button>
      </Group>

      <ApiErrorAlert error={keysQuery.error} fallback="Unable to load API keys" />
      <ApiErrorAlert error={revokeMutation.error} fallback="Unable to revoke API key" />

      {keysQuery.isLoading ? <Loader /> : null}

      <Table.ScrollContainer minWidth={760}>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Prefix</Table.Th>
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
                <Table.Td>{formatDate(key.createdAt)}</Table.Td>
                <Table.Td>{formatDate(key.lastUsedAt)}</Table.Td>
                <Table.Td>{formatDate(key.expiresAt)}</Table.Td>
                <Table.Td>
                  {key.revokedAt ? (
                    <Badge color="red">Revoked</Badge>
                  ) : key.expiresAt && new Date(key.expiresAt) < new Date() ? (
                    <Badge color="gray">Expired</Badge>
                  ) : (
                    <Badge color="green">Active</Badge>
                  )}
                </Table.Td>
                <Table.Td>
                  <Group gap="xs" justify="flex-end" wrap="nowrap">
                    {!key.revokedAt ? (
                      <Button
                        variant="subtle"
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
                <Table.Td colSpan={7}>
                  <Text c="dimmed">No API keys yet.</Text>
                </Table.Td>
              </Table.Tr>
            ) : null}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>

      {/* Create modal */}
      <Modal opened={createOpened} onClose={closeCreate} title="Create API key">
        <form
          onSubmit={form.onSubmit(() => {
            createMutation.mutate();
          })}
        >
          <Stack>
            <ApiErrorAlert error={createMutation.error} fallback="Unable to create API key" />
            <TextInput label="Name" required {...form.getInputProps("name")} />
            <TextInput
              label="Expires at (optional)"
              placeholder="YYYY-MM-DD"
              description="Leave blank for no expiry"
              {...form.getInputProps("expiresAt")}
            />
            <Button type="submit" loading={createMutation.isPending}>
              Create
            </Button>
          </Stack>
        </form>
      </Modal>

      {/* Raw key reveal modal — shown once after creation */}
      <Modal
        opened={Boolean(rawKeyResult)}
        onClose={() => setRawKeyResult(null)}
        title="API key created"
      >
        <Stack>
          <Alert color="yellow" title="Copy this key now">
            This key will not be shown again. Store it somewhere safe.
          </Alert>
          <Text size="sm" fw={500}>
            {rawKeyResult?.name}
          </Text>
          <Code block style={{ wordBreak: "break-all" }}>
            {rawKeyResult?.rawKey}
          </Code>
          <Button onClick={() => setRawKeyResult(null)}>Done</Button>
        </Stack>
      </Modal>
    </Stack>
  );
}
