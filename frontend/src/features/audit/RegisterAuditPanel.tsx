import { Stack, Title } from "@mantine/core";

import { listRegisterAudit } from "../../api/audit.api";
import { AuditLogPanel } from "./AuditLogPanel";

export function RegisterAuditPanel({ registerId }: { registerId: string }) {
  return (
    <Stack>
      <Title order={2}>Register audit</Title>
      <AuditLogPanel
        queryKey={["audit", "register", registerId]}
        queryFn={(query) => listRegisterAudit(registerId, query)}
      />
    </Stack>
  );
}
