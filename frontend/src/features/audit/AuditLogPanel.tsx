import { Pagination, Stack } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import type { AuditEvent, AuditQuery } from "../../api/audit.api";
import type { ApiResponse, ListMeta } from "../../api/types";
import { ApiErrorAlert } from "../../components/ApiErrorAlert";
import { AuditEventTable } from "./AuditEventTable";
import { AuditFilters } from "./AuditFilters";

const PAGE_SIZE = 25;

interface AuditLogPanelProps {
  queryKey: unknown[];
  queryFn: (query: AuditQuery) => Promise<ApiResponse<AuditEvent[], ListMeta>>;
  showObject?: boolean;
  showRegister?: boolean;
}

export function AuditLogPanel({
  queryKey,
  queryFn,
  showObject = false,
  showRegister = false
}: AuditLogPanelProps) {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<AuditQuery>({});

  const auditQuery = useQuery({
    queryKey: [...queryKey, filters, page],
    queryFn: () => queryFn({ ...filters, page, pageSize: PAGE_SIZE }),
    placeholderData: (previous) => previous
  });

  const handleFilterChange = (patch: Partial<AuditQuery>) => {
    setPage(1);
    setFilters((current) => ({ ...current, ...patch }));
  };

  return (
    <Stack>
      <AuditFilters filters={filters} onChange={handleFilterChange} />
      <ApiErrorAlert error={auditQuery.error} fallback="Unable to load audit events" />
      <AuditEventTable
        events={auditQuery.data?.data ?? []}
        showObject={showObject}
        showRegister={showRegister}
      />
      <Pagination
        value={page}
        total={Math.max(1, Math.ceil((auditQuery.data?.meta.total ?? 0) / PAGE_SIZE))}
        onChange={setPage}
      />
    </Stack>
  );
}
