import { Stack, Text, Title } from "@mantine/core";

import { MyRisksPanel } from "../features/myRisks/MyRisksPanel";

export function MyRisksPage() {
  return (
    <Stack>
      <Stack gap={0}>
        <Title order={1}>My Risks</Title>
        <Text c="dimmed">All risks assigned to you across every register you have access to.</Text>
      </Stack>
      <MyRisksPanel />
    </Stack>
  );
}
