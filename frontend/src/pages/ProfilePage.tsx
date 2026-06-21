import {
  Alert,
  Badge,
  Button,
  Code,
  Divider,
  Group,
  Loader,
  Modal,
  PasswordInput,
  Popover,
  Progress,
  SegmentedControl,
  Stack,
  Table,
  Text,
  TextInput,
  Title
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { type MantineColorScheme, useMantineColorScheme } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import { useState } from "react";

import { changeMyPassword, updateMyProfile } from "../api/profile.api";
import { updateMyPreferences } from "../api/preferences.api";
import {
  createMyApiKey,
  listMyApiKeys,
  revokeMyApiKey,
  type ApiKeyCreated
} from "../api/apiKeys.api";
import { ApiErrorAlert } from "../components/ApiErrorAlert";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { useFeatureFlags } from "../hooks/useFeatureFlags";
import { PREFERENCES_QUERY_KEY } from "../hooks/usePreferences";

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (password.length === 0) return { score: 0, label: "", color: "gray" };
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  if (score <= 2) return { score: (score / 5) * 100, label: "Weak", color: "red" };
  if (score <= 3) return { score: (score / 5) * 100, label: "Fair", color: "yellow" };
  return { score: (score / 5) * 100, label: "Strong", color: "green" };
}

export function ProfilePage() {
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  const flags = useFeatureFlags();
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  // API Keys state
  const myKeysQuery = useQuery({
    queryKey: ["my-api-keys"],
    queryFn: listMyApiKeys,
    enabled: flags.apiKeys
  });
  const [generateOpened, { open: openGenerate, close: closeGenerate }] = useDisclosure(false);
  const [rawKeyResult, setRawKeyResult] = useState<ApiKeyCreated | null>(null);

  const generateForm = useForm({
    initialValues: { name: "", expiresAt: "" },
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

  const invalidateMyKeys = async () => {
    await queryClient.invalidateQueries({ queryKey: ["my-api-keys"] });
  };

  const generateMutation = useMutation({
    mutationFn: () =>
      createMyApiKey({
        name: generateForm.values.name.trim(),
        expiresAt: generateForm.values.expiresAt
          ? new Date(generateForm.values.expiresAt).toISOString()
          : undefined
      }),
    onSuccess: async (result) => {
      closeGenerate();
      generateForm.reset();
      setRawKeyResult(result);
      await invalidateMyKeys();
    }
  });

  const revokeMutation = useMutation({
    mutationFn: revokeMyApiKey,
    onSuccess: invalidateMyKeys
  });

  const startGenerate = () => {
    generateMutation.reset();
    generateForm.reset();
    openGenerate();
  };

  const handleCloseGenerate = () => {
    generateMutation.reset();
    generateForm.reset();
    closeGenerate();
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString();
  };

  const nameForm = useForm({
    initialValues: { name: user?.name ?? "" },
    validate: { name: (v) => (v.trim().length > 0 ? null : "Name is required") }
  });

  const passwordForm = useForm({
    initialValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
    validate: {
      confirmPassword: (v, values) =>
        v === values.newPassword ? null : "Passwords do not match"
    }
  });

  const [newPasswordFocused, setNewPasswordFocused] = useState(false);
  const newPassword = passwordForm.values.newPassword;
  const passwordStrength = getPasswordStrength(newPassword);

  const updateNameMutation = useMutation({
    mutationFn: (name: string) => updateMyProfile(name),
    onSuccess: () => {
      notifications.show({ message: "Name updated.", color: "green" });
    }
  });

  const changePasswordMutation = useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      changeMyPassword(currentPassword, newPassword),
    onSuccess: () => {
      passwordForm.reset();
      notifications.show({ message: "Password changed. Other active sessions have been signed out.", color: "green" });
    }
  });

  const preferencesMutation = useMutation({
    mutationFn: (scheme: MantineColorScheme) => updateMyPreferences({ colorScheme: scheme }),
    onSuccess: (data) => {
      queryClient.setQueryData(PREFERENCES_QUERY_KEY, data);
    }
  });

  function handleColorSchemeChange(value: string) {
    const scheme = value as MantineColorScheme;
    setColorScheme(scheme);
    preferencesMutation.mutate(scheme);
  }

  return (
    <Stack gap="lg">
      <Stack gap={0}>
        <Title order={1}>My Profile</Title>
        <Text c="dimmed">Manage your display name, password, API keys, and appearance preferences.</Text>
      </Stack>

      <Stack gap="md">
        <Title order={4}>Display Name</Title>
        <form
          onSubmit={nameForm.onSubmit((values) => {
            updateNameMutation.mutate(values.name);
          })}
        >
          <Stack gap="sm" maw={400}>
            {updateNameMutation.error ? (
              <ApiErrorAlert error={updateNameMutation.error} />
            ) : null}
            <TextInput label="Name" {...nameForm.getInputProps("name")} />
            <Group>
              <Button type="submit" loading={updateNameMutation.isPending}>
                Save name
              </Button>
            </Group>
          </Stack>
        </form>
      </Stack>

      <Divider />

      <Stack gap="md">
        <Title order={4}>Change Password</Title>
        <form
          onSubmit={passwordForm.onSubmit((values) => {
            changePasswordMutation.mutate({
              currentPassword: values.currentPassword,
              newPassword: values.newPassword
            });
          })}
        >
          <Stack gap="sm" maw={400}>
            {changePasswordMutation.error ? (
              <ApiErrorAlert error={changePasswordMutation.error} />
            ) : null}
            <PasswordInput
              label="Current password"
              autoComplete="current-password"
              data-bwignore={null}
              data-lpignore={null}
              data-1p-ignore={null}
              {...passwordForm.getInputProps("currentPassword")}
            />
            <div
              onFocusCapture={() => setNewPasswordFocused(true)}
              onBlurCapture={() => setNewPasswordFocused(false)}
            >
              <Popover
                opened={newPasswordFocused && newPassword.length > 0}
                position="bottom"
                width="target"
                withinPortal={false}
              >
                <Popover.Target>
                  <PasswordInput
                    label="New password"
                    autoComplete="new-password"
                    data-bwignore={null}
                    data-lpignore={null}
                    data-1p-ignore={null}
                    {...passwordForm.getInputProps("newPassword")}
                  />
                </Popover.Target>
                <Popover.Dropdown>
                  <Stack gap={4}>
                    <Progress
                      value={passwordStrength.score}
                      color={passwordStrength.color}
                      size="sm"
                    />
                    <Text size="xs" c="dimmed">
                      Strength: {passwordStrength.label}
                    </Text>
                  </Stack>
                </Popover.Dropdown>
              </Popover>
            </div>
            <PasswordInput
              label="Confirm new password"
              autoComplete="new-password"
              data-bwignore={null}
              data-lpignore={null}
              data-1p-ignore={null}
              {...passwordForm.getInputProps("confirmPassword")}
            />
            <Text size="xs" c="dimmed">
              Changing your password will sign out all other active sessions.
            </Text>
            <Group>
              <Button type="submit" loading={changePasswordMutation.isPending}>
                Change password
              </Button>
            </Group>
          </Stack>
        </form>
      </Stack>

      {flags.apiKeys && (
        <>
          <Divider />
          <Stack gap="md">
            <Title order={4}>API Keys</Title>
            <Text size="sm" c="dimmed">
              API keys let you authenticate programmatic access to the API on your behalf.
            </Text>
            <Button onClick={startGenerate} style={{ alignSelf: "flex-start" }}>
              Generate API Key
            </Button>
            <ApiErrorAlert error={myKeysQuery.error} fallback="Unable to load API keys" />
            <ApiErrorAlert error={revokeMutation.error} fallback="Unable to revoke API key" />
            {myKeysQuery.isLoading ? <Loader size="sm" /> : null}
            {myKeysQuery.data && myKeysQuery.data.length > 0 ? (
              <Table.ScrollContainer minWidth={480}>
                <Table>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Name</Table.Th>
                      <Table.Th>Prefix</Table.Th>
                      <Table.Th>Created</Table.Th>
                      <Table.Th>Last used</Table.Th>
                      <Table.Th>Status</Table.Th>
                      <Table.Th />
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {myKeysQuery.data.map((key) => (
                      <Table.Tr key={key.id}>
                        <Table.Td>{key.name}</Table.Td>
                        <Table.Td>
                          <Code>{key.keyPrefix}…</Code>
                        </Table.Td>
                        <Table.Td>{formatDate(key.createdAt)}</Table.Td>
                        <Table.Td>{formatDate(key.lastUsedAt)}</Table.Td>
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
                          {key.status === "active" ? (
                            <Button
                              variant="light"
                              size="xs"
                              color="red"
                              loading={
                                revokeMutation.isPending && revokeMutation.variables === key.id
                              }
                              onClick={() => revokeMutation.mutate(key.id)}
                            >
                              Revoke
                            </Button>
                          ) : null}
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            ) : myKeysQuery.data?.length === 0 ? (
              <Text size="sm" c="dimmed">
                You have no API keys yet.
              </Text>
            ) : null}
          </Stack>
        </>
      )}

      {/* Generate API key modal */}
      <Modal opened={generateOpened} onClose={handleCloseGenerate} title="Generate API Key">
        <form onSubmit={generateForm.onSubmit(() => generateMutation.mutate())}>
          <Stack>
            <ApiErrorAlert error={generateMutation.error} fallback="Unable to create API key" />
            <TextInput label="Name" required placeholder="e.g. CI pipeline" {...generateForm.getInputProps("name")} />
            <TextInput
              label="Expires at (optional)"
              type="date"
              description="Leave blank for no expiry"
              {...generateForm.getInputProps("expiresAt")}
            />
            <Button type="submit" loading={generateMutation.isPending}>
              Generate
            </Button>
          </Stack>
        </form>
      </Modal>

      {/* Raw key reveal modal — shown once after creation */}
      <Modal
        opened={Boolean(rawKeyResult)}
        onClose={() => setRawKeyResult(null)}
        title="API key created"
        closeOnClickOutside={false}
        closeOnEscape={false}
      >
        <Stack>
          <Alert color="yellow" title="Copy this key now">
            This key will not be shown again. Store it somewhere safe before closing this dialog.
          </Alert>
          <Text size="sm" fw={500}>
            {rawKeyResult?.name}
          </Text>
          <Code block style={{ wordBreak: "break-all" }}>
            {rawKeyResult?.rawKey}
          </Code>
          <Button
            onClick={() => {
              void navigator.clipboard.writeText(rawKeyResult?.rawKey ?? "");
              notifications.show({ message: "Key copied to clipboard.", color: "green" });
            }}
            variant="outline"
          >
            Copy to clipboard
          </Button>
          <Button onClick={() => setRawKeyResult(null)}>Done</Button>
        </Stack>
      </Modal>

      {flags.userPreferences && (
        <>
          <Divider />
          <Stack gap="md">
            <Title order={4}>Appearance</Title>
            <Group align="center">
              <Text size="sm">Colour scheme</Text>
              <SegmentedControl
                value={colorScheme}
                onChange={handleColorSchemeChange}
                data={[
                  { label: "Auto", value: "auto" },
                  { label: "Light", value: "light" },
                  { label: "Dark", value: "dark" }
                ]}
              />
            </Group>
          </Stack>
        </>
      )}
    </Stack>
  );
}
