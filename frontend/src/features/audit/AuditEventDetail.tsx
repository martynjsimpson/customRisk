import { Code, Stack, Text } from "@mantine/core";

import type { AuditEvent } from "../../api/audit.api";

export function hasAuditDetail(event: AuditEvent): boolean {
  return (
    !!event.ipAddress ||
    event.fieldChanges.length > 0 ||
    (event.metadataJson !== null && event.metadataJson !== undefined)
  );
}

export function AuditEventDetail({ event }: { event: AuditEvent }) {
  const jsonDetail: Record<string, unknown> = {};
  if (event.metadataJson !== null && event.metadataJson !== undefined) jsonDetail.metadataJson = event.metadataJson;
  if (event.fieldChanges.length > 0) jsonDetail.fieldChanges = event.fieldChanges;
  const hasJsonDetail = Object.keys(jsonDetail).length > 0;

  return (
    <Stack p="sm" gap="xs">
      {event.ipAddress && (
        <Text size="sm"><Text span fw={600}>IP Address: </Text>{event.ipAddress}</Text>
      )}
      {hasJsonDetail && (
        <Code block>{JSON.stringify(jsonDetail, null, 2)}</Code>
      )}
    </Stack>
  );
}
