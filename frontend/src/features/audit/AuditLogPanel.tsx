import { Alert, Box, Button, Group, Pagination, Stack, Text, Title } from "@mantine/core";
import { IconDownload } from "@tabler/icons-react";
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
  exportFn: (query: AuditQuery) => Promise<void>;
  showObject?: boolean;
  showRegister?: boolean;
  title?: string;
  subtitle?: string;
}

export function AuditLogPanel({
  queryKey,
  queryFn,
  exportFn,
  showObject = false,
  showRegister = false,
  title,
  subtitle
}: AuditLogPanelProps) {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<AuditQuery>({});
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const auditQuery = useQuery({
    queryKey: [...queryKey, filters, page],
    queryFn: () => queryFn({ ...filters, page, pageSize: PAGE_SIZE }),
    placeholderData: (previous) => previous
  });

  const handleFilterChange = (patch: Partial<AuditQuery>) => {
    setPage(1);
    setFilters((current) => ({ ...current, ...patch }));
  };

  const handleExport = async () => {
    setExporting(true);
    setExportError(null);
    try {
      await exportFn(filters);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: unknown } };
      let message: string | null = null;
      try {
        const raw = axiosErr.response?.data;
        const parsed = typeof raw === "string" ? (JSON.parse(raw) as unknown) : raw;
        const data = parsed as { error?: { message?: string } } | null;
        message = data?.error?.message ?? null;
      } catch {
        message = null;
      }
      setExportError(message ?? "Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Stack>
      {title ? (
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Stack gap={0}>
            <Title order={1}>{title}</Title>
            {subtitle ? <Text c="dimmed">{subtitle}</Text> : null}
          </Stack>
          <Button
            variant="light"
            leftSection={<IconDownload size={16} />}
            loading={exporting}
            onClick={handleExport}
          >
            Export CSV
          </Button>
        </Group>
      ) : null}
      <Group justify="space-between" align="flex-end" wrap="nowrap">
        <Box style={{ flex: 1, minWidth: 0 }}>
          <AuditFilters filters={filters} onChange={handleFilterChange} />
        </Box>
        {!title ? (
          <Button
            variant="light"
            leftSection={<IconDownload size={16} />}
            loading={exporting}
            onClick={handleExport}
          >
            Export CSV
          </Button>
        ) : null}
      </Group>
      {exportError && <Alert color="red">{exportError}</Alert>}
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
