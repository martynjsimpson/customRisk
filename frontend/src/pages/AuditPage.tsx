import { Pagination, Stack, Title } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { listSystemAudit } from "../api/audit.api";
import { ApiErrorAlert } from "../components/ApiErrorAlert";
import { AuditEventTable } from "../features/audit/AuditEventTable";

const PAGE_SIZE = 25;

export function AuditPage() {
  const [page, setPage] = useState(1);
  const auditQuery = useQuery({
    queryKey: ["audit", "system", page],
    queryFn: () => listSystemAudit({ page, pageSize: PAGE_SIZE }),
    placeholderData: (previous) => previous
  });

  return (
    <Stack>
      <Title order={1}>Audit</Title>
      <ApiErrorAlert error={auditQuery.error} fallback="Unable to load audit events" />
      <AuditEventTable events={auditQuery.data?.data ?? []} showObject showRegister />
      <Pagination
        value={page}
        total={Math.max(1, Math.ceil((auditQuery.data?.meta.total ?? 0) / PAGE_SIZE))}
        onChange={setPage}
      />
    </Stack>
  );
}
