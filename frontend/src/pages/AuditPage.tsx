import { Stack, Title } from "@mantine/core";

import { listSystemAudit } from "../api/audit.api";
import { AuditLogPanel } from "../features/audit/AuditLogPanel";

export function AuditPage() {
  return (
    <Stack>
      <Title order={1}>Audit</Title>
      <AuditLogPanel
        queryKey={["audit", "system"]}
        queryFn={listSystemAudit}
        showObject
        showRegister
      />
    </Stack>
  );
}
