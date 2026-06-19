import { Stack } from "@mantine/core";

import { exportSystemAudit, listSystemAudit } from "../api/audit.api";
import { AuditLogPanel } from "../features/audit/AuditLogPanel";

export function AuditPage() {
  return (
    <Stack>
      <AuditLogPanel
        queryKey={["audit", "system"]}
        queryFn={listSystemAudit}
        exportFn={exportSystemAudit}
        showObject
        showRegister
        title="Audit"
      />
    </Stack>
  );
}
