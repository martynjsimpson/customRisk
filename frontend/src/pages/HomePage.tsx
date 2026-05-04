import { Paper, Stack, Text, Title } from "@mantine/core";

import { useCurrentUser } from "../hooks/useCurrentUser";

export function HomePage() {
  const { user } = useCurrentUser();

  return (
    <Stack>
      <Title order={1}>Home</Title>
      <Paper withBorder p="md" radius="sm">
        <Text fw={600}>Signed in as {user?.name}</Text>
        <Text c="dimmed" size="sm">
          {user?.email}
        </Text>
      </Paper>
    </Stack>
  );
}
