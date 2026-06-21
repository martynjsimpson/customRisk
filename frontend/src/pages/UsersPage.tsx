import { Stack, Text, Title } from "@mantine/core";

import { UsersPanel } from "../features/users/UsersPanel";

export function UsersPage() {
  return (
    <Stack>
      <Stack gap={0}>
        <Title order={1}>Users</Title>
        <Text c="dimmed">Manage user accounts, roles, and system access.</Text>
      </Stack>
      <UsersPanel />
    </Stack>
  );
}
