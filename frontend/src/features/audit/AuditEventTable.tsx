import { Badge, Table, Text } from "@mantine/core";

import type { AuditEvent } from "../../api/audit.api";

export function AuditEventTable({ events }: { events: AuditEvent[] }) {
  return (
    <Table>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>When</Table.Th>
          <Table.Th>Actor</Table.Th>
          <Table.Th>Action</Table.Th>
          <Table.Th>Summary</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {events.map((event) => (
          <Table.Tr key={event.id}>
            <Table.Td>{new Date(event.occurredAt).toLocaleString()}</Table.Td>
            <Table.Td>{event.actor?.name ?? "System"}</Table.Td>
            <Table.Td><Badge>{event.action}</Badge></Table.Td>
            <Table.Td>{event.summary}</Table.Td>
          </Table.Tr>
        ))}
        {events.length === 0 ? (
          <Table.Tr>
            <Table.Td colSpan={4}>
              <Text c="dimmed">No audit events found.</Text>
            </Table.Td>
          </Table.Tr>
        ) : null}
      </Table.Tbody>
    </Table>
  );
}
