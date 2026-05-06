import { Badge, Pagination, Stack, Table, Text, Title } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { listSystemAudit } from "../api/audit.api";
import { ApiErrorAlert } from "../components/ApiErrorAlert";

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
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>When</Table.Th>
            <Table.Th>Actor</Table.Th>
            <Table.Th>Action</Table.Th>
            <Table.Th>Object</Table.Th>
            <Table.Th>Summary</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {(auditQuery.data?.data ?? []).map((event) => (
            <Table.Tr key={event.id}>
              <Table.Td>{new Date(event.occurredAt).toLocaleString()}</Table.Td>
              <Table.Td>{event.actor?.name ?? "System"}</Table.Td>
              <Table.Td><Badge>{event.action}</Badge></Table.Td>
              <Table.Td>{event.objectDisplayName ?? event.objectId}</Table.Td>
              <Table.Td>{event.summary}</Table.Td>
            </Table.Tr>
          ))}
          {auditQuery.data?.data.length === 0 ? (
            <Table.Tr>
              <Table.Td colSpan={5}>
                <Text c="dimmed">No audit events found.</Text>
              </Table.Td>
            </Table.Tr>
          ) : null}
        </Table.Tbody>
      </Table>
      <Pagination
        value={page}
        total={Math.max(1, Math.ceil((auditQuery.data?.meta.total ?? 0) / PAGE_SIZE))}
        onChange={setPage}
      />
    </Stack>
  );
}
