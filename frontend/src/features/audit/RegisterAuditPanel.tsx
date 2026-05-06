import { Stack, Title } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";

import { listRegisterAudit } from "../../api/audit.api";
import { ApiErrorAlert } from "../../components/ApiErrorAlert";
import { AuditEventTable } from "./AuditEventTable";

export function RegisterAuditPanel({ registerId }: { registerId: string }) {
  const auditQuery = useQuery({
    queryKey: ["audit", "register", registerId],
    queryFn: () => listRegisterAudit(registerId)
  });

  return (
    <Stack>
      <Title order={2}>Register audit</Title>
      <ApiErrorAlert error={auditQuery.error} fallback="Unable to load register audit events" />
      <AuditEventTable events={auditQuery.data?.data ?? []} />
    </Stack>
  );
}
