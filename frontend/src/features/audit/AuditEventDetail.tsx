import { Box, Code } from "@mantine/core";

import type { AuditEvent } from "../../api/audit.api";

export function hasAuditDetail(event: AuditEvent): boolean {
  return event.fieldChanges.length > 0 || (event.metadataJson !== null && event.metadataJson !== undefined);
}

export function AuditEventDetail({ event }: { event: AuditEvent }) {
  const detail: Record<string, unknown> = {};
  if (event.metadataJson !== null && event.metadataJson !== undefined) detail.metadataJson = event.metadataJson;
  if (event.fieldChanges.length > 0) detail.fieldChanges = event.fieldChanges;

  return (
    <Box p="sm">
      <Code block>{JSON.stringify(detail, null, 2)}</Code>
    </Box>
  );
}
