import { Pagination, Stack, Title } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { listRegisterAudit, type AuditQuery } from "../../api/audit.api";
import { ApiErrorAlert } from "../../components/ApiErrorAlert";
import { AuditEventTable } from "./AuditEventTable";
import { AuditFilters } from "./AuditFilters";

const PAGE_SIZE = 25;

export function RegisterAuditPanel({ registerId }: { registerId: string }) {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<AuditQuery>({});

  const auditQuery = useQuery({
    queryKey: ["audit", "register", registerId, filters, page],
    queryFn: () => listRegisterAudit(registerId, { ...filters, page, pageSize: PAGE_SIZE }),
    placeholderData: (previous) => previous
  });

  const handleFilterChange = (patch: Partial<AuditQuery>) => {
    setPage(1);
    setFilters((current) => ({ ...current, ...patch }));
  };

  return (
    <Stack>
      <Title order={2}>Register audit</Title>
      <AuditFilters filters={filters} onChange={handleFilterChange} />
      <ApiErrorAlert error={auditQuery.error} fallback="Unable to load register audit events" />
      <AuditEventTable events={auditQuery.data?.data ?? []} />
      <Pagination
        value={page}
        total={Math.max(1, Math.ceil((auditQuery.data?.meta.total ?? 0) / PAGE_SIZE))}
        onChange={setPage}
      />
    </Stack>
  );
}
